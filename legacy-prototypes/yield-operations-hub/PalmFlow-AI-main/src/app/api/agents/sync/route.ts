// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAgentResponse } from '@/lib/ai/OpenAIProvider';
import { reputationService } from '@/server/services/reputation.service';
import { transactionService } from '@/server/services/transaction.service';

export async function POST(req: Request) {
  try {
    const { agentId } = await req.json();

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { transactions: { take: 5, orderBy: { createdAt: 'desc' } } }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // AI logic to simulate "syncing" or "working"
    const prompt = `
      You are the AI brain for the agent "${agent.name}" with the role "${agent.role}".
      Current Status: ${agent.status}
      Efficiency: ${agent.efficiency}%
      Recent Activity: ${agent.transactions.map(t => t.description).join(', ') || 'No recent activity'}

      Simulate a 4-hour work cycle for this agent.
      Provide:
      1. A short log of what was accomplished.
      2. A new efficiency score (0-100).
      3. A P&L change (e.g., +0.5, -0.1).
      4. A suggested status (active, idle, executing).

      Return ONLY a JSON object:
      {
        "log": "...",
        "efficiency": 85,
        "pnlChange": 0.2,
        "newStatus": "active"
      }
    `;

    const aiResponse = await generateAgentResponse(prompt, {
      agentName: agent.name,
      agentRole: agent.role,
      agentStatus: agent.status,
      budget: agent.budget
    });

    // Update the agent in the database
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        efficiency: aiResponse.efficiency || agent.efficiency,
        pnl: { increment: aiResponse.pnlChange || 0 },
        status: aiResponse.newStatus || agent.status,
        tasksCount: { increment: 1 }
      }
    });

    // Record a transaction for the "work" if there was a P&L change
    if (aiResponse.pnlChange !== 0) {
      await transactionService.createTransaction({
        agentId: agent.id,
        amount: Math.abs(aiResponse.pnlChange),
        type: aiResponse.pnlChange > 0 ? 'payment' : 'withdrawal',
        description: `Autonomous cycle: ${aiResponse.log}`,
        status: 'completed'
      });
    }

    // Recalculate reputation
    await reputationService.calculateAgentReputation(agentId);

    return NextResponse.json({
      success: true,
      message: aiResponse.log,
      agent: updatedAgent
    });

  } catch (error) {
    console.error('Agent Sync Error:', error);
    return NextResponse.json({ error: 'Failed to sync agent' }, { status: 500 });
  }
}
