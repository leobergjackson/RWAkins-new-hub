// Built by vsrupeshkumar
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@backend/trpc/trpc.router';

export const trpc = createTRPCReact<AppRouter>();
