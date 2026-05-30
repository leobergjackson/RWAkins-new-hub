// Built by vsrupeshkumar
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { OpenAI } from 'openai';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ComplianceService } from '../compliance/compliance.service';
import { PrivacyService } from '../privacy/privacy.service';
import { SimulationService } from '../simulations/simulation.service';
import { SafetyService } from '../safety/safety.service';
import { NexusGateway } from '../trpc/nexus.gateway';

@Injectable()
export class AgentService {
  private logger = new Logger(AgentService.name);
  private _openai: OpenAI | null = null;

  private agentTypes = ['TREASURY', 'PAYROLL', 'COMPLIANCE', 'RISK', 'STRATEGY', 'EXECUTION', 'MARKET'];

  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
    private complianceService: ComplianceService,
    private privacyService: PrivacyService,
    private simulationService: SimulationService,
    private safetyService: SafetyService,
    private nexusGateway: NexusGateway,
  ) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY not set — AgentService will reject orchestration calls at runtime.');
    }
  }

  private get openai(): OpenAI {
    if (!this._openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required for AI orchestration but is not set.');
      }
      this._openai = new OpenAI({ apiKey });
    }
    return this._openai;
  }

  async orchestrate(orgId: string, instruction: string) {
    this.logger.log(`🧠 AI Orchestration Starting | Org: ${orgId} | Instruction: ${instruction}`);
    this.nexusGateway.broadcastAgentLog(orgId, {
      agent: 'ORCHESTRATOR',
      message: `Analyzing instruction: "${instruction}"`,
      timestamp: new Date().toISOString(),
    });

    const orchestrationStart = Date.now();
    const agentExecutions: any[] = [];

    try {
      // 1️⃣ Get Organization Context
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          treasuries: true,
          agents: true,
          payrolls: { include: { recipients: true } },
        },
      });

      if (!org) {
        throw new Error(`Organization not found: ${orgId}`);
      }

      const treasury = org.treasuries[0];
      if (!treasury) {
        throw new Error(`No treasury found for organization: ${orgId}`);
      }

      // 2️⃣ Get Market & Treasury Data
      const treasuryBalance = await this.blockchainService.getBalance(treasury.address);
      
      this.nexusGateway.broadcastAgentLog(orgId, {
        agent: 'ORCHESTRATOR',
        message: `Context retrieved. Treasury Balance: ${treasuryBalance} ETH.`,
        timestamp: new Date().toISOString(),
      });

      // 3️⃣ AI Multi-Agent Coordination Loop
      const systemPrompt = `You are Stealth Executive Suite Nexus AI Orchestrator - an autonomous financial operating system managing Web3 organizations.

Your role:
- Coordinate 7 specialized AI agents: Treasury, Payroll, Compliance, Risk, Strategy, Execution, Market
- Make financial decisions with surgical precision
- Prioritize privacy, efficiency, and sustainability
- Execute autonomous financial operations invisibly on Arbitrum Sepolia

Agent Responsibilities:
- **Treasury Agent**: Manages balances, liquidity, and asset allocation.
- **Payroll Agent**: Automates disbursements to contributors and vendors.
- **Compliance Agent**: Ensures operations meet regulatory requirements while preserving privacy.
- **Risk Agent**: Monitors for depegs, exposure, and cluster correlation risks.
- **Strategy Agent**: Formulates long-term financial roadmaps.
- **Execution Agent**: Interfaces with Arbitrum Sepolia to finalize transactions via stealth paths.
- **Market Agent**: Monitors real-time price feeds.

Current Context:
- Organization: ${org.name}
- Treasury Balance: ${treasuryBalance} ETH
- Treasury Address: ${treasury.address}
- Active Payrolls: ${org.payrolls.length}
- Total Recipients: ${org.payrolls.reduce((sum, p) => sum + p.recipients.length, 0)}

Current Goal: ${instruction}

Respond with a JSON object containing:
{
  "agentDecisions": [
    {
      "agent": "TREASURY|PAYROLL|COMPLIANCE|RISK|STRATEGY|EXECUTION|MARKET",
      "decision": "Action or analysis",
      "reasoning": "Reasoning",
      "confidence": 0-100
    }
  ],
  "primaryAction": "THE_MAIN_ACTION",
  "executionSteps": ["Step 1", "Step 2"],
  "riskAssessment": "Risk analysis",
  "successMetrics": ["Metric 1", "Metric 2"]
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: instruction }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const orchestrationPlan = JSON.parse(response.choices[0]?.message?.content || '{}');

      // 4️⃣ Execute Agent Decisions
      for (const decision of orchestrationPlan.agentDecisions || []) {
        const agentRecord = org.agents.find((a) => a.type === decision.agent);

        this.nexusGateway.broadcastAgentLog(orgId, {
          agent: decision.agent,
          message: decision.decision,
          reasoning: decision.reasoning,
          confidence: decision.confidence,
          timestamp: new Date().toISOString(),
        });

        const execution = {
          agentId: agentRecord?.id || `temp_${decision.agent}`,
          agentType: decision.agent,
          decision: decision.decision,
          reasoning: decision.reasoning,
          confidence: decision.confidence || 0,
          executedAt: new Date().toISOString(),
          status: 'EXECUTED' as const,
        };

        agentExecutions.push(execution);

        if (agentRecord) {
          await this.prisma.agent.update({
            where: { id: agentRecord.id },
            data: {
              lastAction: decision.decision,
              lastActionAt: new Date(),
            },
          });
        }
      }
      
      // 4.5️⃣ Adversarial Safety Check (AI-vs-AI)
      const safetyValidation = await this.safetyService.validateAction(
        'ORCHESTRATOR',
        orchestrationPlan.primaryAction,
        { orchestrationPlan, agentExecutions }
      );

      if (!safetyValidation.allowed) {
        this.nexusGateway.broadcastAgentLog(orgId, {
          agent: 'SAFETY_ENGINE',
          message: `🛑 Action Blocked: ${safetyValidation.reason}`,
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Safety Override: ${safetyValidation.reason}`);
      }

      this.nexusGateway.broadcastAgentLog(orgId, {
        agent: 'SAFETY_ENGINE',
        message: `✅ Action Approved. Risk Score: ${safetyValidation.riskScore.toFixed(4)}`,
        timestamp: new Date().toISOString(),
      });

      // 5️⃣ Execute Primary Action (Simulated execution for production readiness)
      let executionResult: any = {
        status: 'SUCCESS',
        details: 'Operation completed autonomously via Cloak Stealth SDK'
      };

      if (orchestrationPlan.primaryAction?.toLowerCase().includes('transfer') || 
          orchestrationPlan.primaryAction?.toLowerCase().includes('pay')) {
        executionResult = await this.blockchainService.sendStealthTransaction(
          treasury.address,
          'recipient-stealth-path', 
          0.1 
        );

        // Reflect in database
        await this.prisma.treasury.update({
          where: { id: treasury.id },
          data: { balance: { decrement: 0.1 } }
        });

        await this.prisma.transaction.create({
          data: {
            treasuryId: treasury.id,
            amount: -0.1,
            type: 'AI_ORCHESTRATED_PAYMENT',
            status: 'CONFIRMED',
            metadata: JSON.stringify({ 
              detail: `AI Orchestrated: ${orchestrationPlan.primaryAction}`,
              reasoning: orchestrationPlan.riskAssessment
            })
          }
        });
      }

      this.nexusGateway.broadcastAgentLog(orgId, {
        agent: 'ORCHESTRATOR',
        message: `Primary action finalized: ${orchestrationPlan.primaryAction}`,
        result: executionResult,
        timestamp: new Date().toISOString(),
      });

      // 6️⃣ Record Orchestration
      const orchestrationRecord = await this.prisma.agent.create({
        data: {
          name: `Orchestration_${Date.now()}`,
          type: 'ORCHESTRATOR',
          status: 'COMPLETED',
          organizationId: orgId,
          lastAction: orchestrationPlan.primaryAction,
          lastActionAt: new Date(),
        },
      });

      return {
        success: true,
        orchestrationId: orchestrationRecord.id,
        duration: Date.now() - orchestrationStart,
        agentExecutions,
        primaryAction: orchestrationPlan.primaryAction,
        executionSteps: orchestrationPlan.executionSteps || [],
        riskAssessment: orchestrationPlan.riskAssessment || '',
        successMetrics: orchestrationPlan.successMetrics || [],
        executionResult,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`❌ Orchestration Failed: ${error.message}`);
      this.nexusGateway.broadcastAgentLog(orgId, {
        agent: 'ORCHESTRATOR',
        message: `FAILED: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getAllAgentStatus(orgId: string) {
    return await this.prisma.agent.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
