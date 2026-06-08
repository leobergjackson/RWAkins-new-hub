// Built by vsrupeshkumar
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { idoService } from '@/server/services/ido.service';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { investments: true } } }
    });
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const project = await idoService.createProject(body);
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
