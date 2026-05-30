// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { Keypair } from '@arbitrum-sepolia/web3.js';
import { streamService } from '@/server/services/stream.service';
import { sentinelService } from '@/server/services/sentinel.service';
import { reputationService } from '@/server/services/reputation.service';
import { yieldService } from '@/server/services/yield.service';
import { arbitrum-sepoliaService } from '@/server/services/arbitrum-sepolia.service';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    console.log('--- System Heartbeat Triggered ---');
    
    // 1. Process Streaming Payroll (Real-time accrual)
    await streamService.updateAccruedTotals();
    
    // 2. Update Agent Reputation (Trust Scores)
    const agents = await prisma.agent.findMany();
    for (const agent of agents) {
      await reputationService.calculateAgentReputation(agent.id);
    }
    
    // 3. Perform Security Audit (Check for abnormal activity)
    const securityStatus = await sentinelService.performSecurityAudit();
    
    // 4. Yield Optimization (Auto-route idle funds if balance > 5000)
    const authoritySecret = JSON.parse(process.env.PUSD_AUTHORITY_KEY!);
    const authority = Keypair.fromSecretKey(Uint8Array.from(authoritySecret));
    const treasury = await arbitrum-sepoliaService.getPUSDBalance(authority.publicKey.toBase58());
    if (treasury > 5000) {
      await yieldService.routeToYield(treasury * 0.1);
    }

    // 5. Update Global Protocol Stats
    const totalVolume = await prisma.transaction.aggregate({
      _sum: { amount: true }
    });

    const activeAgents = await prisma.agent.count({
      where: { status: 'active' }
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      security: securityStatus,
      metrics: {
        totalVolume: totalVolume._sum.amount || 0,
        activeAgents
      }
    });
  } catch (error) {
    console.error('Heartbeat Error:', error);
    return NextResponse.json({ error: 'System heartbeat failed' }, { status: 500 });
  }
}
