// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { transactionService } from '@/server/services/transaction.service';
import { agentService } from '@/server/services/agent.service';
import { arbitrum-sepoliaService } from '@/server/services/arbitrum-sepolia.service';
import { policyService } from '@/server/services/policy.service';
import { generateAgentResponse } from '@/lib/ai/OpenAIProvider';

export async function POST(req: Request) {
  try {
    const { command, agentId } = await req.json();
    
    // 1. Get Agent Context
    const agent = await agentService.getAgentById(agentId);
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    // 2. Process Command with AI
    const aiResponse = await generateAgentResponse(command, {
      agentName: agent.name,
      agentRole: agent.role,
      agentStatus: agent.status,
      budget: agent.budget - agent.spent,
    });

    let txHash = '';

    // 3. ENFORCE POLICIES
    if (aiResponse.action === 'payment') {
      const validation = await policyService.validateAction('spending_limit', aiResponse.amount, agent.id);
      
      if (!validation.allowed) {
        return NextResponse.json({ 
          success: false, 
          message: validation.reason,
          reasoning: "Action blocked by security policy."
        });
      }

      // 4. Execute Actions (REAL ETHANA TRANSACTIONS)
      // Execute REAL on-chain payment
      const recipient = agent.walletAddress || 'FRnaJo8MyEzt7Hd6XRHaYeid71JyaACEVVWkvjp4G8wv';
      
      txHash = await arbitrum-sepoliaService.executePayment(recipient, aiResponse.amount);

      await transactionService.createTransaction({
        amount: aiResponse.amount,
        type: 'payment',
        description: aiResponse.description,
        agentId: agent.id,
        txHash: txHash,
      });
      
      await agentService.recordTaskCompletion(agent.id);
    }

    return NextResponse.json({
      success: true,
      message: aiResponse.message || 'Workflow executed successfully',
      actions: aiResponse.actions || [],
      txHash: txHash
    });
  } catch (error) {
    console.error('Workflow Execution Error:', error);
    return NextResponse.json({ error: 'Failed to execute workflow' }, { status: 500 });
  }
}
