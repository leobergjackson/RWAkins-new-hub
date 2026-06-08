// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { yieldService } from '@/server/services/yield.service';
import { insightService } from '@/server/services/insight.service';
import { policyService } from '@/server/services/policy.service';

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    // 1. Enforce Safety Policy
    const validation = await policyService.validateAction('yield_routing', amount);
    if (!validation.allowed) {
      return NextResponse.json({ error: validation.reason }, { status: 403 });
    }

    // 2. Execute the REAL on-chain yield routing
    const result = await yieldService.routeToYield(amount);

    return NextResponse.json({
      success: true,
      message: `Successfully routed ${amount} PUSD to Jito Yield Vault.`,
      txHash: null
    });
  } catch (error) {
    console.error('Rebalance Error:', error);
    return NextResponse.json({ error: 'Failed to execute rebalance' }, { status: 500 });
  }
}
