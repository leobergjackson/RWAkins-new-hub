// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { workflowService } from '@/server/services/workflow.service';
import { prisma } from '@/lib/prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    // Fetch live system data to give the AI real context
    const [agents, streams, transactions, policies] = await Promise.all([
      prisma.agent.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.stream.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.transaction.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.policy.findMany({ where: { isActive: true } }),
    ]);

    const totalBudget = agents.reduce((s, a) => s + a.budget, 0);
    const totalSpent = agents.reduce((s, a) => s + a.spent, 0);
    const totalPnl = agents.reduce((s, a) => s + a.pnl, 0);
    const activeAgents = agents.filter(a => a.status === 'active').length;
    const activeStreams = streams.filter(s => s.status === 'active').length;
    const totalStreamed = streams.reduce((s, st) => s + st.totalStreamed, 0);
    const recentVolume = transactions.reduce((s, t) => s + t.amount, 0);

    const liveData = {
      treasury: {
        totalBudgetAllocated: totalBudget,
        totalSpent,
        available: totalBudget - totalSpent,
        pnl: totalPnl,
        recentTransactionVolume: recentVolume,
      },
      agents: agents.map(a => ({
        name: a.name,
        role: a.role,
        status: a.status,
        budget: a.budget,
        spent: a.spent,
        efficiency: a.efficiency,
        pnl: a.pnl,
        tasksCount: a.tasksCount,
      })),
      agentSummary: { total: agents.length, active: activeAgents },
      streams: {
        total: streams.length,
        active: activeStreams,
        totalStreamed,
        list: streams.map(s => ({
          recipient: s.recipientName,
          role: s.recipientRole,
          ratePerSecond: s.ratePerSecond,
          totalStreamed: s.totalStreamed,
          status: s.status,
        })),
      },
      policies: policies.map(p => ({ name: p.name, type: p.type, value: p.value })),
      recentTransactions: transactions.slice(0, 10).map(t => ({
        type: t.type,
        amount: t.amount,
        description: t.description,
        status: t.status,
        currency: t.currency,
      })),
    };

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `You are PalmFlow Core — an autonomous AI treasury assistant with full visibility into the live system state.

LIVE SYSTEM DATA (real-time):
${JSON.stringify(liveData, null, 2)}

Your job:
- Answer ANY question about the system using the live data above. Be specific with numbers.
- Execute actions only when the user explicitly asks you to DO something.
- Be concise, professional, and direct. No fluff.

You MUST respond with ONLY a valid JSON object (no markdown, no code fences):
{
  "message": "Your response here — answer questions directly with data, or confirm actions being taken.",
  "steps": []
}

Action step types (only populate steps[] when user wants to execute an action):
- deploy_agent: { name, role, budget }
- start_stream: { recipientName, recipientRole, ratePerSecond, walletAddress }
- set_policy: { name, type, value, description }
- payment: { recipient, amount, description }

User question: ${JSON.stringify(prompt)}`;

    const result = await model.generateContent(systemPrompt);
    const text = result.response.text().trim();
    const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    let aiResponse: { message?: string; steps?: unknown[] };
    try {
      aiResponse = JSON.parse(clean);
    } catch {
      // Gemini returned non-JSON — surface the raw text as the message
      aiResponse = { message: clean, steps: [] };
    }

    const steps = Array.isArray(aiResponse.steps) ? aiResponse.steps : [];

    if (!steps.length) {
      return NextResponse.json({
        success: true,
        message: aiResponse.message || 'No actions identified.',
        results: [],
      });
    }

    const executionResults = await workflowService.executeWorkflow(steps);

    return NextResponse.json({
      success: true,
      message: aiResponse.message || `Executed ${steps.length} action(s).`,
      results: executionResults,
    });
  } catch (error) {
    console.error('Command API Error:', error);
    return NextResponse.json({ error: 'Failed to process command' }, { status: 500 });
  }
}
