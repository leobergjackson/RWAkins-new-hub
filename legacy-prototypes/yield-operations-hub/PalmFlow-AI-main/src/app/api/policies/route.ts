// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const policies = await prisma.policy.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(policies);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, type, value, description } = await req.json();
    const policy = await prisma.policy.create({
      data: {
        name,
        type,
        value: parseFloat(value),
        description,
        isActive: true
      }
    });
    return NextResponse.json(policy);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, isActive } = await req.json();
    const policy = await prisma.policy.update({
      where: { id },
      data: { isActive }
    });
    return NextResponse.json(policy);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
  }
}
