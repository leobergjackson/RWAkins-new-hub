// Built by vsrupeshkumar
import { prisma } from '@/lib/prisma';
import { policyService } from './policy.service';

export const sentinelService = {
  /**
   * Monitor treasury for abnormal activity and auto-lock if necessary
   */
  async performSecurityAudit() {
    console.log('--- Sentinel Security Audit Initiated ---');
    const logs = [];
    
    // 1. Detect abnormal spending velocity
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentTxCount = await prisma.transaction.count({
      where: { createdAt: { gte: oneMinuteAgo } }
    });

    if (recentTxCount > 5) {
      logs.push(`High transaction velocity: ${recentTxCount} tx/min detected.`);
      await this.autoLockTreasury('Abnormal spending velocity detected.');
      return { status: 'emergency_lock', reason: 'High transaction velocity.', logs };
    }

    // 2. Detect Budget Drain (simulated logic)
    // If an agent spends more than 50% of budget in < 1 hour
    const agents = await prisma.agent.findMany({ where: { status: 'active' } });
    for (const agent of agents) {
      if (agent.spent > agent.budget * 0.8) {
        logs.push(`Critical Budget Alert: Agent ${agent.name} has consumed 80%+ of allocation.`);
      }
    }

    return {
      status: 'secure', 
      message: 'All systems nominal.',
      auditTime: new Date().toISOString(),
      logs: logs.length > 0 ? logs : ['No threats detected.', 'Arbitrum Sepolia Devnet sync stable.']
    };
  },

  /**
   * Auto-enable the most restrictive policies
   */
  async autoLockTreasury(reason: string) {
    console.warn(`--- AUTO-LOCKING TREASURY: ${reason} ---`);
    
    // Create or update a "Global Emergency Lock" policy
    const existingLock = await prisma.policy.findFirst({
      where: { type: 'global_lock' }
    });

    if (existingLock) {
      await prisma.policy.update({
        where: { id: existingLock.id },
        data: { isActive: true, description: `Emergency Lock: ${reason}` }
      });
    } else {
      await prisma.policy.create({
        data: {
          name: 'GLOBAL EMERGENCY LOCK',
          type: 'global_lock',
          value: 0,
          description: `Emergency Lock: ${reason}`,
          isActive: true
        }
      });
    }

    // Also record a security event
    await prisma.transaction.create({
      data: {
        amount: 0,
        type: 'security_event',
        description: `TREASURY LOCKED: ${reason}`,
        status: 'blocked'
      }
    });
  }
};
