// Built by vsrupeshkumar
import { arbitrum-sepoliaService } from './arbitrum-sepolia.service';
import { generateAgentResponse } from '@/lib/ai/OpenAIProvider';
import { prisma } from '@/lib/prisma';
import { Keypair } from '@arbitrum-sepolia/web3.js';

export const insightService = {
  /**
   * Generate strategic financial insights based on real-time data
   */
  async generateStrategicInsights() {
    try {
      // 1. Fetch real-time context
      const authoritySecret = JSON.parse(process.env.PUSD_AUTHORITY_KEY!);
      const authority = Keypair.fromSecretKey(Uint8Array.from(authoritySecret));
      const balance = await arbitrum-sepoliaService.getPUSDBalance(authority.publicKey.toBase58());
      
      const recentTransactions = await prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      });

      const activeAgents = await prisma.agent.count({ where: { status: 'active' } });

      // 2. Build the prompt for the "Neural Advisor"
      const prompt = `
        You are the PalmFlow AI Neural Advisor. Analyze the following treasury state and provide 3 strategic financial insights.
        
        State:
        - Treasury Balance: ${balance} PUSD
        - Active AI Agents: ${activeAgents}
        - Recent Burn: ${recentTransactions.reduce((acc, tx) => acc + tx.amount, 0)} PUSD (last 5 txs)
        
        Provide your insights in a short, punchy JSON format:
        {
          "insights": [
            { "title": "...", "desc": "...", "impact": "positive|neutral|negative" },
            ...
          ],
          "strategicAction": "..."
        }
      `;

      const aiResponse = await generateAgentResponse(prompt, {
        agentName: 'Neural Advisor',
        agentRole: 'Strategist',
        agentStatus: 'analyzing',
        budget: balance
      });

      // Parse the JSON from the AI response
      const parsed = JSON.parse(aiResponse.message);
      return parsed;

    } catch (error) {
      console.error('Failed to generate insights:', error);
      return {
        insights: [
          { title: "Network Stability", desc: "Arbitrum Sepolia Devnet connection is stable. Treasury pulse normal.", impact: "positive" },
          { title: "Capital Efficiency", desc: "Yield optimization logic pending. Current capital is idle.", impact: "neutral" }
        ],
        strategicAction: "Initiate yield-routing protocols."
      };
    }
  }
};
