// Built by vsrupeshkumar
import { prisma } from '@/lib/prisma';
import { auditorService } from './auditor.service';
import { arbitrum-sepoliaService } from './arbitrum-sepolia.service';
import { transactionService } from './transaction.service';
import { agentService } from './agent.service';
import { Keypair } from '@arbitrum-sepolia/web3.js';

export const idoService = {
  /**
   * Create a new IDO project and trigger an autonomous AI audit
   */
  async createProject(data: {
    name: string;
    description: string;
    goalAmount: number;
    creatorAddress: string;
    category?: string;
  }) {
    try {
      console.log(`--- Creating Neural Launchpad Project: ${data.name} ---`);
      
      // 1. Create the project record
      const project = await prisma.project.create({
        data: {
          name: data.name,
          description: data.description,
          goalAmount: data.goalAmount,
          creatorAddress: data.creatorAddress,
          category: data.category || 'General',
          status: 'active'
        }
      });

      // 2. Trigger Autonomous AI Audit (Background)
      this.performAiAudit(project.id).catch(err => console.error('AI Audit failed:', err));

      return project;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  },

  /**
   * Handle AI Audit logic
   */
  async performAiAudit(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return;

    const auditResult = await auditorService.auditProject(project.name, project.description);
    
    await prisma.project.update({
      where: { id: projectId },
      data: {
        aiScore: auditResult.score,
        aiAudit: auditResult.report
      }
    });
  },

  /**
   * Invest PUSD into a project
   */
  async invest(projectId: string, amount: number, walletAddress: string) {
    try {
      console.log(`--- Investing ${amount} PUSD into Project ${projectId} ---`);

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new Error('Project not found');
      if (project.status !== 'active') throw new Error('Project is not accepting investments');

      // 1. Record the investment
      const investment = await prisma.investment.create({
        data: {
          projectId,
          amount,
          walletAddress
        }
      });

      // 2. Update raised amount
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          raisedAmount: { increment: amount }
        }
      });

      // 3. Create a transaction record
      await transactionService.createTransaction({
        amount,
        type: 'investment',
        description: `Investment in ${project.name}`,
        status: 'completed'
      });

      // 4. Check if goal reached
      if (updatedProject.raisedAmount >= updatedProject.goalAmount) {
        await this.finalizeProject(projectId);
      }

      return investment;
    } catch (error) {
      console.error('Investment failed:', error);
      throw error;
    }
  },

  /**
   * Finalize a successful project by spawning the AI agent
   */
  async finalizeProject(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.status !== 'active') return;

    console.log(`--- Finalizing Project: ${project.name} (Goal Reached) ---`);

    // 1. Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'funded' }
    });

    // 2. Spawn the Agent in the factory
    const agentKeypair = Keypair.generate();
    const walletAddress = agentKeypair.publicKey.toBase58();

    const agent = await agentService.createAgent({
      name: project.name,
      role: `Autonomous agent born from IDO: ${project.category}`,
      budget: project.raisedAmount,
    });

    // 3. Link agent to project
    await prisma.project.update({
      where: { id: projectId },
      data: { agentId: agent.id }
    });

    // 4. Initial funding transfer (on-chain simulation)
    try {
      await arbitrum-sepoliaService.executePayment(walletAddress, project.raisedAmount * 0.1); // Transfer 10% for initial ops
    } catch (err) {
      console.warn('Initial project funding failed:', err);
    }
  }
};
