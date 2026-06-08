// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { coordinationService } from '@/server/services/coordination.service';
import { generateAgentResponse } from '@/lib/ai/OpenAIProvider';
import { agentService } from '@/server/services/agent.service';

export async function POST(req: Request) {
  try {
    const { fromAgentId, toAgentId, taskDescription, budget } = await req.json();

    // 1. Let the "From Agent" AI explain why it needs help
    const fromAgent = await agentService.getAgentById(fromAgentId);
    const toAgent = await agentService.getAgentById(toAgentId);

    const aiPrompt = `You are ${fromAgent?.name}. You need to collaborate with ${toAgent?.name} on the following task: "${taskDescription}". Explain your reasoning and the expected outcome in a short JSON object.`;
    
    const aiReasoning = await generateAgentResponse(aiPrompt, {
      agentName: fromAgent?.name,
      agentRole: fromAgent?.role,
      agentStatus: fromAgent?.status,
      budget: fromAgent?.budget
    });

    // 2. Execute the coordination
    const result = await coordinationService.requestCollaboration(
      fromAgentId,
      toAgentId,
      taskDescription,
      budget
    );

    return NextResponse.json({
      ...result,
      reasoning: aiReasoning.message
    });
  } catch (error) {
    console.error('Collaboration Error:', error);
    return NextResponse.json({ error: 'Failed to initiate collaboration' }, { status: 500 });
  }
}
