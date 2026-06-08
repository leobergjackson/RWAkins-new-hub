// Built by vsrupeshkumar
import { prisma } from '@/lib/prisma';

export const reputationService = {
  /**
   * Calculate and update the Reputation (Trust Score) for an agent
   * Score is based on: Efficiency, Task Completion, and Budget Discipline
   */
  async calculateAgentReputation(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { transactions: true }
    });

    if (!agent) return 0;

    // 1. Efficiency Base (0-100)
    let score = agent.efficiency;

    // 2. Task Volume Bonus
    score += Math.min(agent.tasksCount * 0.5, 15);

    // 3. Discipline Penalty (if spent > budget)
    if (agent.spent > agent.budget) {
      score -= 25;
    }

    // 4. Yield / P&L Bonus
    // If agent is responsible for yield investments, increase rating
    const yieldTx = agent.transactions.filter(t => t.type === 'yield_investment' || t.description.includes('Autonomous cycle'));
    const pnlIncrease = yieldTx.length * 0.2; // 0.2% growth per recorded work cycle
    
    // 5. Stability Score
    const finalScore = Math.max(0, Math.min(100, score));
    const newRating = Math.max(1, Math.min(5, 3.5 + (finalScore / 100) * 1.5));

    await prisma.agent.update({
      where: { id: agentId },
      data: { 
        efficiency: finalScore,
        rating: newRating,
        pnl: { increment: pnlIncrease }
      }
    });

    return finalScore;
  },

  /**
   * Get the "Credit Rating" label for an agent
   */
  getAgentCreditRating(score: number) {
    if (score >= 95) return 'AAA (Elite)';
    if (score >= 85) return 'AA (Trusted)';
    if (score >= 70) return 'A (Reliable)';
    if (score >= 50) return 'B (Developing)';
    return 'C (High Risk)';
  }
};
