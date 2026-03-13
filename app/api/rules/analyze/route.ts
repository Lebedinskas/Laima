import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const KNOWN_TYPES = [
  { type: 'max_weekly_hours', description: 'Maksimalus valandų skaičius per savaitę', params: ['hours'] },
  { type: 'min_rest_days', description: 'Minimalus poilsio dienų skaičius tarp budėjimų', params: ['days'] },
  { type: 'no_polyclinic_same_day', description: 'Negalima budėti poliklinikos dieną', params: [] },
  { type: 'no_polyclinic_prev_day', description: 'Negalima budėti dieną prieš polikliniką', params: [] },
  { type: 'require_both_slots', description: 'Kiekviena diena turi turėti R ir D gydytojus', params: [] },
  { type: 'respect_unavailable', description: 'Gerbti negalimas datas (atostogos, nedarbingumas)', params: [] },
  { type: 'respect_slot_types', description: 'Gerbti gydytojų galimybes (R/D)', params: [] },
  { type: 'respect_monthly_limits', description: 'Gerbti mėnesinius budėjimų limitus', params: [] },
  { type: 'balance_distribution', description: 'Tolygus budėjimų paskirstymas', params: ['threshold'] },
  { type: 'dept_only_priority', description: 'Skyriaus gydytojų pirmenybė D stulpelyje', params: [] },
  { type: 'max_weekend_shifts', description: 'Maksimalus savaitgalio budėjimų skaičius per mėnesį', params: ['maxShifts'] },
];

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();

    const typesDescription = KNOWN_TYPES.map(t =>
      `- "${t.type}": ${t.description}${t.params.length > 0 ? ` (parametrai: ${t.params.join(', ')})` : ''}`
    ).join('\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `Tu esi taisyklių klasifikatorius budėjimų grafiko sistemai. Gavęs taisyklės pavadinimą ir aprašymą, turi grąžinti JSON su tinkamu tipu, parametrais ir griežtumu.

ŽINOMI TAISYKLIŲ TIPAI:
${typesDescription}

Jei taisyklė atitinka žinomą tipą — naudok tą tipą.
Jei neatitinka jokio — naudok "custom".

VISADA grąžink TIK JSON, be jokio kito teksto:
{
  "type": "rule_type_string",
  "params": {"key": value},
  "severity": "error" arba "warning",
  "refinedName": "patikslintas pavadinimas",
  "refinedDescription": "detalesnis aprašymas kaip sistema turėtų tai tikrinti"
}`,
      messages: [{
        role: 'user',
        content: `Taisyklės pavadinimas: "${name}"\nAprašymas: "${description || name}"`,
      }],
    });

    const text = response.content.find(b => b.type === 'text')?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Nepavyko analizuoti taisyklės' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      type: parsed.type || 'custom',
      params: parsed.params || {},
      severity: parsed.severity || 'warning',
      refinedName: parsed.refinedName || name,
      refinedDescription: parsed.refinedDescription || description || name,
    });
  } catch (error) {
    console.error('Rule analysis error:', error);
    return NextResponse.json(
      { error: 'Klaida analizuojant taisyklę' },
      { status: 500 }
    );
  }
}
