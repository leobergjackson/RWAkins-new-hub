// Built by vsrupeshkumar
import { prisma } from '@/lib/prisma';

export const policyService = {
  /**
   * Get all active policies
   */
  async getAllPolicies() {
    return await prisma.policy.findMany({
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Create a new policy
   */
  async createPolicy(data: {
    name: string;
    type: string;
    value: number;
    description: string;
    agentId?: string;
  }) {
    return await prisma.policy.create({
      data: {
        ...data,
        isActive: true
      }
    });
  },

  /**
   * Validate an action against active policies
   * Returns { allowed: boolean, reason?: string }
   */
  async validateAction(type: string, amount: number, agentId?: string) {
    // 0. Check for GLOBAL LOCK
    const globalLock = await prisma.policy.findFirst({
      where: { type: 'global_lock', isActive: true }
    });

    if (globalLock) {
      const reason = `CRITICAL: Treasury is currently LOCKED by Risk Sentinel (${globalLock.description})`;
      return { allowed: false, reason };
    }

    const policies = await prisma.policy.findMany({
      where: { 
        isActive: true,
        OR: [
          { type: type },
          { type: 'global_limit' }
        ]
      }
    });

    for (const policy of policies) {
      // Example: Spending Limit Check
      if (policy.type === 'spending_limit' || policy.type === 'global_limit') {
        if (amount > policy.value) {
          const reason = `Action blocked by Policy: "${policy.name}" (${amount} exceeds limit of ${policy.value})`;
          
          // Log the violation (using the Transaction model with a 'violation' status)
          await prisma.transaction.create({
            data: {
              amount,
              type: 'policy_violation',
              description: reason,
              agentId: agentId,
              status: 'blocked'
            }
          });

          return { 
            allowed: false, 
            reason: reason 
          };
        }
      }
    }

    return { allowed: true };
  },

  /**
   * Toggle policy status
   */
  async togglePolicy(id: string) {
    const policy = await prisma.policy.findUnique({ where: { id } });
    if (!policy) throw new Error('Policy not found');

    return await prisma.policy.update({
      where: { id },
      data: { isActive: !policy.isActive }
    });
  }
};
