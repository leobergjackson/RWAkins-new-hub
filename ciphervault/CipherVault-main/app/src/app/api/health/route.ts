import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'healthy', service: 'CipherVault', version: '1.0.0' })
}
