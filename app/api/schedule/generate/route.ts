import { NextRequest, NextResponse } from 'next/server';
import type { Doctor, MonthConfig, ScheduleRule } from '@/lib/types';
import { generateScheduleAsync } from '@/lib/scheduler';

// Server-side ILP generation — HiGHS runs in Node.js with no browser memory/time limits.
// The scheduler auto-detects server vs client and loads WASM from node_modules.

export async function POST(req: NextRequest) {
  const { doctors, config, rules, clinicHistory } = await req.json() as {
    doctors: Doctor[];
    config: MonthConfig;
    rules: ScheduleRule[];
    clinicHistory: Record<string, number>;
  };

  try {
    const schedule = await generateScheduleAsync(doctors, config, rules, clinicHistory);
    return NextResponse.json({ schedule });
  } catch (err) {
    console.error('Server-side schedule generation failed:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const maxDuration = 120; // Vercel: allow up to 120s
export const dynamic = 'force-dynamic';
