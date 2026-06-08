// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const stream = await prisma.stream.findUnique({ where: { id } });
    if (!stream) return NextResponse.json({ error: 'Stream not found' }, { status: 404 });

    const updated = await prisma.stream.update({
      where: { id },
      data: { status: stream.status === 'active' ? 'paused' : 'active' },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Stream toggle error:', error);
    return NextResponse.json({ error: 'Failed to toggle stream' }, { status: 500 });
  }
}
