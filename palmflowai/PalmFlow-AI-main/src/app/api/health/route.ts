import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'PalmFlow AI',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
