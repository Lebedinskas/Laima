import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, buildToolDefinitions, handleToolCall } from '@/lib/chat-tools';
import { Doctor, MonthConfig, ScheduleEntry, DoctorStats, ChangeRecord, ValidationError, ScheduleRule } from '@/lib/types';
import { WEEKDAY_NAMES_SHORT, WEEKDAY_NAMES_FULL, MONTH_NAMES } from '@/lib/constants';
import { createClient } from '@supabase/supabase-js';

const client = new Anthropic();

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function buildFullContext(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig,
  stats: DoctorStats[],
  changeHistory: ChangeRecord[],
  errors: ValidationError[],
  rules: ScheduleRule[] = []
): string {
  const parts: string[] = [];
  const doctorMap = new Map(doctors.map(d => [d.id, d.name]));

  // 1. Schedule grid
  if (schedule.length === 0) {
    parts.push('GRAFIKAS: dar nesugeneruotas.');
  } else {
    const lines = schedule.map(e => {
      const dayStr = `${e.day} ${WEEKDAY_NAMES_SHORT[e.weekday]}`;
      const rep = e.republicDoctor ? doctorMap.get(e.republicDoctor) || '?' : '—';
      const dep = e.departmentDoctor ? doctorMap.get(e.departmentDoctor) || '?' : '—';
      const marker = e.isWeekend ? ' [SV]' : e.isHoliday ? ' [ŠV]' : '';
      return `${dayStr}${marker}: R=${rep}, D=${dep}`;
    });
    parts.push(`GRAFIKAS — ${MONTH_NAMES[config.month - 1]} ${config.year} m.:\n${lines.join('\n')}`);
  }

  // 2. Full doctor profiles
  const doctorProfiles = doctors.map(d => {
    const flags: string[] = [];
    if (d.canRepublic) flags.push('gali R');
    if (d.canDepartment) flags.push('gali D');
    if (!d.canRepublic) flags.push('TIK skyrius');

    const limits: string[] = [];
    if (d.maxRepublicPerMonth) limits.push(`max R/mėn: ${d.maxRepublicPerMonth}`);
    if (d.maxDepartmentPerMonth) limits.push(`max D/mėn: ${d.maxDepartmentPerMonth}`);
    if (d.maxTotalPerMonth) limits.push(`max viso/mėn: ${d.maxTotalPerMonth}`);

    const poly = d.polyclinicSchedule.length > 0
      ? d.polyclinicSchedule.map(s => `${WEEKDAY_NAMES_FULL[s.weekday]} ${s.startHour}-${s.endHour}`).join(', ')
      : 'nėra';

    const unavail = d.unavailableDates.length > 0
      ? d.unavailableDates.join(', ')
      : 'nėra';

    let line = `• ${d.name} [${flags.join(', ')}]`;
    if (limits.length > 0) line += ` | ${limits.join(', ')}`;
    line += ` | Poliklinika: ${poly}`;
    if (d.unavailableDates.length > 0) line += ` | Negalimos datos: ${unavail}`;
    if (d.preferences) line += ` | Pageidavimai: ${d.preferences}`;
    return line;
  });
  parts.push(`\nGYDYTOJŲ PROFILIAI:\n${doctorProfiles.join('\n')}`);

  // 3. Statistics
  if (stats.length > 0) {
    const statLines = stats
      .filter(s => s.totalCount > 0)
      .sort((a, b) => b.totalCount - a.totalCount)
      .map(s => {
        return `• ${s.name}: ${s.totalCount} bud. (R:${s.republicCount}, D:${s.departmentCount}, SV:${s.weekendCount})`;
      });
    parts.push(`\nSTATISTIKA šį mėnesį:\n${statLines.join('\n')}`);
  }

  // 4. Validation errors
  if (errors.length > 0) {
    const errLines = errors.map(e => {
      const prefix = e.type === 'error' ? '✗' : '⚠';
      const dayInfo = e.day ? ` (${e.day} d.)` : '';
      const docName = e.doctorId ? ` [${doctorMap.get(e.doctorId) || e.doctorId}]` : '';
      return `${prefix}${dayInfo}${docName} ${e.message}`;
    });
    parts.push(`\nGRAFIKO KLAIDOS/PERSPĖJIMAI:\n${errLines.join('\n')}`);
  }

  // 5. Recent change history (manual + chat only, not generate)
  if (changeHistory.length > 0) {
    const recentChanges = changeHistory.slice(-20).map(c => {
      const date = new Date(c.timestamp);
      const dateStr = `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      const slotName = c.slot === 'republicDoctor' ? 'R' : 'D';
      return `• ${dateStr} | ${c.day} d. ${slotName}: ${c.previousDoctorName || '—'} → ${c.newDoctorName || '—'} (${c.source})`;
    });
    parts.push(`\nPASKUTINIAI KEITIMAI:\n${recentChanges.join('\n')}`);
  }

  // 6. Active rules summary
  if (rules.length > 0) {
    const ruleLines = rules.map(r => {
      const status = r.enabled ? '✓' : '✗';
      const params = Object.keys(r.params).length > 0
        ? ` (${Object.entries(r.params).map(([k, v]) => `${k}=${v}`).join(', ')})`
        : '';
      return `${status} ${r.name}${params} [${r.severity}] ID:${r.id}`;
    });
    parts.push(`\nTAISYKLĖS:\n${ruleLines.join('\n')}`);
  }

  return parts.join('\n');
}

async function getRelevantMemories(message: string): Promise<string> {
  try {
    // Simple keyword-based memory search (no embeddings needed for basic recall)
    const keywords = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (keywords.length === 0) return '';

    const { data } = await supabase
      .from('ai_memories')
      .select('content, category, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!data || data.length === 0) return '';

    // Relevance matching — score by keyword hits, return top results
    const scored = data.map(m => {
      const content = m.content.toLowerCase();
      const hits = keywords.filter(k => content.includes(k)).length;
      return { ...m, hits };
    }).filter(m => m.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 8);

    if (scored.length === 0) return '';
    return '\n\nATSIMINTI FAKTAI:\n' + scored.map(m => `- [${m.category}] ${m.content}`).join('\n');
  } catch {
    return '';
  }
}

async function saveMemory(content: string, category: string) {
  try {
    await supabase
      .from('ai_memories')
      .insert({ content, category, user_id: (await supabase.auth.getUser()).data.user?.id });
  } catch (err) {
    console.error('Failed to save memory:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, history, schedule, doctors, config, stats, changeHistory, errors, rules } = await request.json();

    const scheduleContext = buildFullContext(schedule, doctors, config, stats || [], changeHistory || [], errors || [], rules || []);
    const tools = buildToolDefinitions();

    // Get relevant memories from RAG
    const memories = await getRelevantMemories(message);

    // Build conversation messages from history
    const messages: Anthropic.MessageParam[] = [];

    // Add previous conversation history (last 20 messages)
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current message with schedule context
    messages.push({
      role: 'user',
      content: `SISTEMOS BŪSENA:\n${scheduleContext}${memories}\n\n---\nVartotojo užklausa: ${message}`,
    });

    // First call
    let response = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 2048,
      system: buildSystemPrompt(config),
      tools,
      messages,
    });

    const scheduleChanges: { day: number; slot: 'republicDoctor' | 'departmentDoctor'; doctorId: string | null }[] = [];
    const doctorUpdates: { doctorId: string; updates: Record<string, unknown> }[] = [];
    const vacations: { doctorId: string; dates: string[] }[] = [];
    const unavailables: { doctorId: string; date: string }[] = [];
    const ruleUpdates: { ruleId: string; updates: Record<string, unknown> }[] = [];
    const addRules: ScheduleRule[] = [];
    const removeRules: string[] = [];
    let shouldRegenerate = false;
    let finalText = '';

    // Tool use loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ContentBlock & { type: 'tool_use' } =>
          block.type === 'tool_use'
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        // Handle save_memory tool
        if (toolUse.name === 'save_memory') {
          const input = toolUse.input as { content: string; category: string };
          await saveMemory(input.content, input.category);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Įsiminta: "${input.content}"`,
          });
          continue;
        }

        const result = handleToolCall(
          toolUse.name,
          toolUse.input,
          schedule,
          doctors,
          config,
          stats || [],
          changeHistory || [],
          rules || []
        );

        try {
          const parsed = JSON.parse(result);
          if (parsed.change) {
            scheduleChanges.push(parsed.change);
          }
          if (parsed.changes) {
            scheduleChanges.push(...parsed.changes);
          }
          if (parsed.updateDoctor) {
            doctorUpdates.push(parsed.updateDoctor);
          }
          if (parsed.addVacation) {
            vacations.push(parsed.addVacation);
          }
          if (parsed.markUnavailable) {
            unavailables.push(parsed.markUnavailable);
          }
          if (parsed.regenerate) {
            shouldRegenerate = true;
          }
          if (parsed.ruleUpdate) {
            ruleUpdates.push(parsed.ruleUpdate);
          }
          if (parsed.addRule) {
            addRules.push(parsed.addRule);
          }
          if (parsed.removeRule) {
            removeRules.push(parsed.removeRule);
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: parsed.text || result,
          });
        } catch {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        }
      }

      messages.push({
        role: 'assistant',
        content: response.content,
      });
      messages.push({
        role: 'user',
        content: toolResults,
      });

      response = await client.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 2048,
        system: buildSystemPrompt(config),
        tools,
        messages,
      });
    }

    // Extract text from final response
    for (const block of response.content) {
      if (block.type === 'text') {
        finalText += block.text;
      }
    }

    return NextResponse.json({
      response: finalText,
      scheduleChanges: scheduleChanges.length > 0 ? scheduleChanges : undefined,
      doctorUpdates: doctorUpdates.length > 0 ? doctorUpdates : undefined,
      vacations: vacations.length > 0 ? vacations : undefined,
      unavailables: unavailables.length > 0 ? unavailables : undefined,
      regenerate: shouldRegenerate || undefined,
      ruleUpdates: ruleUpdates.length > 0 ? ruleUpdates : undefined,
      addRules: addRules.length > 0 ? addRules : undefined,
      removeRules: removeRules.length > 0 ? removeRules : undefined,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { response: 'Klaida apdorojant užklausą. Patikrinkite ANTHROPIC_API_KEY nustatymą.' },
      { status: 500 }
    );
  }
}
