// Built by vsrupeshkumar
import { prisma } from '@/lib/prisma';
import { Agent } from '@prisma/client';

export const agentService = {
  async getAllAgents() {
    return await prisma.agent.findMany({
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  },

  async getAgentById(id: string) {
    return await prisma.agent.findUnique({
      where: { id },
      include: { transactions: true, policies: true },
    });
  },

  async createAgent(data: { name: string; role: string; budget: number }) {
    return await prisma.agent.create({
      data: {
        ...data,
        status: 'active',
        spent: 0,
        tasksCount: 0,
        efficiency: 100,
      },
    });
  },

  async updateAgentStatus(id: string, status: string) {
    return await prisma.agent.update({
      where: { id },
      data: { status },
    });
  },

  async recordTaskCompletion(id: string) {
    return await prisma.agent.update({
      where: { id },
      data: {
        tasksCount: { increment: 1 },
      },
    });
  },
};
