// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { sentinelService } from '@/server/services/sentinel.service';

export async function POST() {
  try {
    const auditResult = await sentinelService.performSecurityAudit();
    return NextResponse.json(auditResult);
  } catch (error) {
    console.error('Sentinel Audit Error:', error);
    return NextResponse.json({ error: 'Failed to perform security audit' }, { status: 500 });
  }
}
