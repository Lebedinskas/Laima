import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, buildToolDefinitions, handleToolCall } from '@/lib/chat-tools';
import { Doctor, MonthConfig, ScheduleEntry } from '@/lib/types';
import { WEEKDAY_NAMES_SHORT, MONTH_NAMES } from '@/lib/constants';

const client = new Anthropic();

function buildScheduleContext(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig
): string {
  if (schedule.length === 0) return 'Grafikas dar nesugeneruotas.';

  const doctorMap = new Map(doctors.map(d => [d.id, d.name]));
  const lines = schedule.map(e => {
    const dayStr = `${e.day} ${WEEKDAY_NAMES_SHORT[e.weekday]}`;
    const rep = e.republicDoctor ? doctorMap.get(e.republicDoctor) || '?' : '—';
    const dep = e.departmentDoctor ? doctorMap.get(e.departmentDoctor) || '?' : '—';
    const marker = e.isWeekend ? ' [SV]' : e.isHoliday ? ' [ŠV]' : '';
    return `${dayStr}${marker}: R=${rep}, D=${dep}`;
  });

  return `${MONTH_NAMES[config.month - 1]} ${config.year} m. grafikas:\n${lines.join('\n')}\n\nGydytojai: ${doctors.map(d => d.name).join(', ')}`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, schedule, doctors, config } = await request.json();

    const scheduleContext = buildScheduleContext(schedule, doctors, config);
    const tools = buildToolDefinitions();

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `Dabartinis grafikas:\n${scheduleContext}\n\nVartotojo užklausa: ${message}`,
      },
    ];

    // First call
    let response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildSystemPrompt(config),
      tools,
      messages,
    });

    const scheduleChanges: { day: number; slot: 'republicDoctor' | 'departmentDoctor'; doctorId: string | null }[] = [];
    let finalText = '';

    // Tool use loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ContentBlock & { type: 'tool_use' } =>
          block.type === 'tool_use'
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = handleToolCall(
          toolUse.name,
          toolUse.input,
          schedule,
          doctors,
          config
        );

        // Check if result contains a schedule change
        try {
          const parsed = JSON.parse(result);
          if (parsed.change) {
            scheduleChanges.push(parsed.change);
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

      // Continue conversation with tool results
      messages.push({
        role: 'assistant',
        content: response.content,
      });
      messages.push({
        role: 'user',
        content: toolResults,
      });

      response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
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
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { response: 'Klaida apdorojant užklausą. Patikrinkite ANTHROPIC_API_KEY nustatymą.' },
      { status: 500 }
    );
  }
}
