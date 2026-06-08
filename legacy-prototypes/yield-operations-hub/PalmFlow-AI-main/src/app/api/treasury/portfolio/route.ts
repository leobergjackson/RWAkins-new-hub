// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { Keypair } from '@arbitrum-sepolia/web3.js';
import { arbitrum-sepoliaService } from '@/server/services/arbitrum-sepolia.service';

export async function GET() {
  try {
    const authoritySecret = JSON.parse(process.env.PUSD_AUTHORITY_KEY!);
    const authority = Keypair.fromSecretKey(Uint8Array.from(authoritySecret));
    const treasuryAddress = authority.publicKey.toBase58();
    const portfolio = await arbitrum-sepoliaService.getPortfolio(treasuryAddress);

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error('Portfolio API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}
