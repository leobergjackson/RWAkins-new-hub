// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { agentService } from '@/server/services/agent.service';
import { arbitrum-sepoliaService } from '@/server/services/arbitrum-sepolia.service';
import { Keypair } from '@arbitrum-sepolia/web3.js';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, role, budget } = await req.json();

    // 1. Generate a unique Arbitrum Sepolia wallet for the new agent
    const agentKeypair = Keypair.generate();
    const walletAddress = agentKeypair.publicKey.toBase58();

    // 2. Create the agent in the database
    const agent = await prisma.agent.create({
      data: {
        name,
        role,
        budget: parseFloat(budget),
        walletAddress,
        status: 'active',
        spent: 0,
        efficiency: 100,
        tasksCount: 0
      }
    });

    // 3. Fund the agent's wallet from the Treasury (On-Chain)
    // We send a small portion (e.g., 5% of budget) to initialize their account
    const initialFunding = Math.min(parseFloat(budget) * 0.05, 10); // Max 10 PUSD for init
    
    try {
      await arbitrum-sepoliaService.executePayment(walletAddress, initialFunding);
    } catch (solError) {
      console.warn('Initial funding failed, agent created but wallet unfunded:', solError);
    }

    return NextResponse.json({
      success: true,
      agent,
      walletAddress,
      // We return the secret key for demo purposes so it can be used by the orchestration logic
      // In a real production app, this would be encrypted or stored in a secure vault (KMS)
      secretKey: JSON.stringify(Array.from(agentKeypair.secretKey))
    });
  } catch (error) {
    console.error('Agent Deployment Error:', error);
    return NextResponse.json({ error: 'Failed to deploy agent' }, { status: 500 });
  }
}
