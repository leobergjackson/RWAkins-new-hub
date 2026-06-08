// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { arbitrum-sepoliaService } from '@/server/services/arbitrum-sepolia.service';
import { Keypair } from '@arbitrum-sepolia/web3.js';

export async function GET() {
  try {
    // Treasury is defined by our PUSD Authority wallet
    const authoritySecret = JSON.parse(process.env.PUSD_AUTHORITY_KEY!);
    const authority = Keypair.fromSecretKey(Uint8Array.from(authoritySecret));
    const treasuryAddress = authority.publicKey.toBase58();

    const balance = await arbitrum-sepoliaService.getPUSDBalance(treasuryAddress);

    return NextResponse.json({
      address: treasuryAddress,
      balance: balance,
      currency: 'PUSD',
      network: 'devnet',
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch treasury stats' }, { status: 500 });
  }
}
