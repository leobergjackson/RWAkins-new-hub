// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { corsHeaders } from '../../_utils/cors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pubkey: string }> }
) {
  const { pubkey } = await params;

  return NextResponse.json(
    {
      ok: true,
      service: 'palmflow',
      pubkey,
      balance: '0',
      totalBalance: '0',
      assets: [],
    },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
