// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { corsHeaders } from '../../_utils/cors';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json(
    {
      ok: true,
      service: 'palmflow',
      proposal: body,
      status: 'proposed',
    },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
