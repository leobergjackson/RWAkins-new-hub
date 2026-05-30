// Built by vsrupeshkumar
import { Injectable, OnModuleInit } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service';
import { AgentService } from '../agents/agent.service';
import { SimulationService } from '../simulations/simulation.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ComplianceService } from '../compliance/compliance.service';

@Injectable()
export class TrpcRouter implements OnModuleInit {
  appRouter;

  constructor(
    private readonly trpc: TrpcService,
    private readonly prisma: PrismaService,
    private readonly agentService: AgentService,
    private readonly simulationService: SimulationService,
    private readonly blockchainService: BlockchainService,
    private readonly complianceService: ComplianceService,
  ) {
    this.appRouter = this.trpc.router({
    health: this.trpc.procedure
      .query(() => {
        return { status: 'OK', timestamp: new Date().toISOString() };
      }),

    getTreasury: this.trpc.procedure
      .input(z.object({ address: z.string() }))
      .query(async ({ input }) => {
        return await this.prisma.treasury.findUnique({
          where: { address: input.address },
          include: { transactions: true },
        });
      }),

    getAgents: this.trpc.procedure
      .input(z.object({ orgId: z.string() }))
      .query(async ({ input }) => {
        return await this.prisma.agent.findMany({
          where: { organizationId: input.orgId },
        });
      }),

    // AI Command execution
    executeAiInstruction: this.trpc.procedure
      .input(z.object({ orgId: z.string(), instruction: z.string() }))
      .mutation(async ({ input }) => {
        return await this.agentService.orchestrate(input.orgId, input.instruction);
      }),

    getOverview: this.trpc.procedure
      .input(z.object({ orgId: z.string() }))
      .query(async ({ input }) => {
        const treasury = await this.prisma.treasury.findFirst({
          where: { organizationId: input.orgId },
          include: { transactions: { take: 10, orderBy: { createdAt: 'desc' } } }
        });
        
        let onChainTxs: any[] = [];
        if (treasury?.address && !treasury.address.includes('Stealth')) {
          onChainTxs = await this.blockchainService.getRecentTransactions(treasury.address);
        }

        const agents = await this.prisma.agent.findMany({
          where: { organizationId: input.orgId }
        });
        
        const balance = treasury?.balance || 0;
        const outflow = 100000; 
        const runway = balance / (outflow || 1);
        const efficiency = 95 + Math.random() * 5; 

        return { 
          treasury: {
            ...treasury,
            onChainTxs,
            runway: runway.toFixed(1),
            efficiency: efficiency.toFixed(1)
          }, 
          agents,
          safetyAudits: await this.prisma.safetyAudit.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' }
          })
        };
      }),

    getSafetyAudits: this.trpc.procedure
      .query(async () => {
        return await this.prisma.safetyAudit.findMany({
          take: 50,
          orderBy: { createdAt: 'desc' }
        });
      }),

    getPayroll: this.trpc.procedure
      .input(z.object({ orgId: z.string() }))
      .query(async ({ input }) => {
        return await this.prisma.payroll.findMany({
          where: { organizationId: input.orgId },
          include: { recipients: true }
        });
      }),

    getYieldSimulations: this.trpc.procedure
      .input(z.object({ balance: z.number() }))
      .query(async ({ input }) => {
        return await this.simulationService.simulateYieldOptimization(input.balance);
      }),

    getDevnetBalance: this.trpc.procedure
      .input(z.object({ address: z.string() }))
      .query(async ({ input }) => {
        return await this.blockchainService.getBalance(input.address);
      }),

    generateTemporalKey: this.trpc.procedure
      .input(z.object({ duration: z.number().optional() }))
      .mutation(({ input }) => {
        return this.complianceService.generateTemporalKey(input.duration || 60);
      }),

    getScrambledAuditTrail: this.trpc.procedure
      .input(z.object({ orgId: z.string() }))
      .query(async ({ input }) => {
        const txs = await this.prisma.transaction.findMany({
          take: 50,
          orderBy: { createdAt: 'desc' }
        });
        return this.complianceService.scrambleAuditTrail(txs);
      }),

    runSimulation: this.trpc.procedure
      .input(z.object({ amount: z.number(), complexity: z.enum(['LOW', 'MID', 'HIGH']) }))
      .mutation(async ({ input }) => {
        // Simulate Cloak SDK's pathfinding and risk analysis
        const pathCount = input.complexity === 'HIGH' ? 12 : input.complexity === 'MID' ? 6 : 3;
        const paths = Array.from({ length: pathCount }).map((_, i) => ({
          id: `path-${i}`,
          nodes: Math.floor(Math.random() * 5) + 3,
          obfuscationLevel: Math.floor(Math.random() * 30) + 70,
          latency: Math.floor(Math.random() * 1000) + 200,
        }));

        const result = {
          id: `sim-${Date.now()}`,
          status: 'SUCCESS',
          exposureRisk: Math.max(2, 10 - (pathCount * 0.5)),
          paths,
          estimatedTime: pathCount * 45, // seconds
          efficiency: 99.8,
        };

        // Persist to DB
        await this.prisma.simulation.create({
          data: {
            name: `Stealth Routing Sim (${input.complexity})`,
            type: 'STEALTH_ROUTING',
            input: JSON.stringify(input),
            result: JSON.stringify(result)
          }
        });

        return result;
      }),

    executeSwap: this.trpc.procedure
      .input(z.object({ 
        fromAsset: z.string(), 
        toAsset: z.string(), 
        amount: z.number(),
        orgId: z.string()
      }))
      .mutation(async ({ input }) => {
        const treasury = await this.prisma.treasury.findFirst({
          where: { organizationId: input.orgId }
        });

        if (!treasury) throw new Error('Treasury not found');

        // Create transaction record
        const tx = await this.prisma.transaction.create({
          data: {
            treasuryId: treasury.id,
            amount: -input.amount,
            type: 'ASSET_SWAP',
            status: 'CONFIRMED',
            metadata: JSON.stringify({ 
              detail: `Swapped ${input.amount} ${input.fromAsset} for ${input.toAsset} via Cloak SDK`,
              from: input.fromAsset,
              to: input.toAsset
            })
          }
        });

        return { success: true, txId: tx.id };
      }),

    executeTransfer: this.trpc.procedure
      .input(z.object({ 
        recipient: z.string(), 
        amount: z.number(),
        orgId: z.string()
      }))
      .mutation(async ({ input }) => {
        const treasury = await this.prisma.treasury.findFirst({
          where: { organizationId: input.orgId }
        });

        if (!treasury) throw new Error('Treasury not found');

        // Update balance (simulated)
        await this.prisma.treasury.update({
          where: { id: treasury.id },
          data: { balance: { decrement: input.amount } }
        });

        // Create transaction record
        const tx = await this.prisma.transaction.create({
          data: {
            treasuryId: treasury.id,
            amount: -input.amount,
            type: 'STEALTH_TRANSFER',
            status: 'CONFIRMED',
            metadata: JSON.stringify({ 
              detail: `Transferred ${input.amount} ETH to ${input.recipient} (fragmented)`,
              recipient: input.recipient
            })
          }
        });

        return { success: true, txId: tx.id };
      }),
    });
  }

  onModuleInit() {
    // Initialization if needed
  }
}

export type AppRouter = TrpcRouter['appRouter'];
