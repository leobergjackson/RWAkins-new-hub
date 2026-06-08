// Built by vsrupeshkumar
import { prisma } from '@/lib/prisma';

export const transactionService = {
  async getAllTransactions() {
    return await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: { agent: true },
    });
  },

  async createTransaction(data: {
    amount: number;
    type: string;
    description: string;
    agentId?: string;
    txHash?: string;
    status?: string;
  }) {
    // If agentId is provided, update agent's spent amount
    if (data.agentId) {
      await prisma.agent.update({
        where: { id: data.agentId },
        data: {
          spent: { increment: data.amount },
        },
      });
    }

    return await prisma.transaction.create({
      data: {
        ...data,
        status: data.status || 'completed',
      },
    });
  },
};
