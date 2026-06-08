// Built by vsrupeshkumar
import { prisma } from '@/lib/prisma';
import { agentService } from './agent.service';
import { transactionService } from './transaction.service';
import { arbitrum-sepoliaService } from './arbitrum-sepolia.service';

export const coordinationService = {
  /**
   * Create a collaboration request between two agents
   */
  async requestCollaboration(fromAgentId: string, toAgentId: string, taskDescription: string, budget: number) {
    // 1. Get agent contexts
    const fromAgent = await agentService.getAgentById(fromAgentId);
    const toAgent = await agentService.getAgentById(toAgentId);

    if (!fromAgent || !toAgent) throw new Error('Agent not found');

    // 2. Record the interaction in the database (via a mock transaction/policy for now or a new Collaboration model)
    // We will use the Transaction model to track the "budget earmarking"
    const tx = await transactionService.createTransaction({
      amount: budget,
      type: 'collaboration_request',
      description: `COLLAB: ${fromAgent.name} requested ${toAgent.name} for: ${taskDescription}`,
      agentId: fromAgentId,
    });

    // 3. Update status
    await prisma.agent.update({
      where: { id: toAgentId },
      data: { status: 'executing' }
    });

    return {
      success: true,
      requestId: tx.id,
      from: fromAgent.name,
      to: toAgent.name,
      status: 'pending_execution'
    };
  },

  /**
   * Execute an inter-agent financial transfer on-chain
   */
  async transferBudget(fromAgentId: string, toAgentId: string, amount: number) {
    const fromAgent = await agentService.getAgentById(fromAgentId);
    const toAgent = await agentService.getAgentById(toAgentId);

    if (!fromAgent?.walletAddress || !toAgent?.walletAddress) {
      throw new Error('Wallets not configured for collaboration');
    }

    // Execute real Arbitrum Sepolia transfer
    const txHash = await arbitrum-sepoliaService.executePayment(toAgent.walletAddress, amount);

    // Record the transfer
    await transactionService.createTransaction({
      amount: amount,
      type: 'inter_agent_transfer',
      description: `Budget Transfer: ${fromAgent.name} -> ${toAgent.name}`,
      agentId: fromAgentId,
      txHash: txHash
    });

    return txHash;
  }
};
