// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const globalLock = await prisma.policy.findFirst({
      where: { type: 'global_lock', isActive: true }
    });

    return NextResponse.json({
      status: globalLock ? 'locked' : 'secure',
      reason: globalLock?.description || 'All systems nominal.',
      lastAudit: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sentinel Status Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sentinel status' }, { status: 500 });
  }
}
