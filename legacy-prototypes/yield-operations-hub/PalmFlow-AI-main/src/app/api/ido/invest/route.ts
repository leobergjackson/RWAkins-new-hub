// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { idoService } from '@/server/services/ido.service';

export async function POST(req: Request) {
  try {
    const { projectId, amount, walletAddress } = await req.json();
    
    if (!projectId || !amount || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const investment = await idoService.invest(projectId, parseFloat(amount), walletAddress);
    return NextResponse.json(investment);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Investment failed' }, { status: 500 });
  }
}
