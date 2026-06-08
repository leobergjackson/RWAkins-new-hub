// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { streamService } from '@/server/services/stream.service';

export async function GET() {
  try {
    // Before returning, update the accrued totals to ensure live data
    await streamService.updateAccruedTotals();
    const streams = await streamService.getAllStreams();
    return NextResponse.json(streams);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const stream = await streamService.createStream(body);
    return NextResponse.json(stream);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create stream' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id } = await req.json();
    const stream = await streamService.toggleStream(id);
    return NextResponse.json(stream);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to toggle stream' }, { status: 500 });
  }
}
