// Built by vsrupeshkumar
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateAgentResponse(prompt: string, context: any) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `You are an autonomous financial AI agent named ${context.agentName} within the PalmFlow AI ecosystem.
Your role is: ${context.agentRole}.
Current status: ${context.agentStatus}.
Available budget: ${context.budget} PUSD.

You operate on the Arbitrum Sepolia blockchain and manage capital using PUSD.
You MUST respond with ONLY a valid JSON object (no markdown, no code fences) containing:
1. "message": A professional, high-fidelity confirmation of your strategy or thoughts.
2. "thought_process": A brief explanation of the logic behind your next actions.
3. "steps": An optional array of financial actions to execute.

Supported Step Types:
- deploy_agent (data: { name, role, budget })
- start_stream (data: { recipientName, recipientRole, ratePerSecond, walletAddress })
- set_policy (data: { name, type, value, description })
- payment (data: { recipient, amount, description })
- agent_sync (data: { agentId })

Focus on precision, risk mitigation, and maximizing capital efficiency in the autonomous AI economy.`;

    const result = await model.generateContent(`${systemPrompt}\n\nUser request: ${prompt}`);
    const text = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps in them
    const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(clean);
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    return {
      message: 'Neural link temporarily unavailable. Please try again.',
      thought_process: 'AI service error.',
      steps: []
    };
  }
}
