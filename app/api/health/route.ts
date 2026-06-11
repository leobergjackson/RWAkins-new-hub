// Built by vsrupeshkumar
import { NextResponse } from 'next/server'

import deployed from '@/lib/rwa-deployed.json'

export async function GET() {
  const vaultDeployed = typeof deployed.vault === 'string' && deployed.vault.length === 42
  return NextResponse.json({
    status: 'ok',
    service: 'rwakins',
    network: 'mantle-sepolia',
    chainId: 5003,
    aiEnabled: !!process.env.OPENAI_API_KEY,
    vaultDeployed,
    timestamp: new Date().toISOString(),
  })
}
