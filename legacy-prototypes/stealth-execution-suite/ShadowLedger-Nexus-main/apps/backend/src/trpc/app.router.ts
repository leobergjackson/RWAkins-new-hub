// Built by vsrupeshkumar
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const t = initTRPC.create();
const prisma = new PrismaClient();

export const appRouter = t.router({
  getTreasury: t.procedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      return await prisma.treasury.findUnique({
        where: { address: input.address },
        include: { transactions: true },
      });
    }),
    
  getAgents: t.procedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input }) => {
      return await prisma.agent.findMany({
        where: { organizationId: input.orgId },
      });
    }),

  getPayroll: t.procedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input }) => {
      return await prisma.payroll.findMany({
        where: { organizationId: input.orgId },
        include: { recipients: true },
      });
    }),
});

export type AppRouter = typeof appRouter;
