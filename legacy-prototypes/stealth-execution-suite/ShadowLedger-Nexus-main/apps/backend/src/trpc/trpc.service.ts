// Built by vsrupeshkumar
import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

@Injectable()
export class TrpcService {
  readonly trpc = initTRPC.create({
    transformer: superjson,
  });
  readonly procedure = this.trpc.procedure;
  readonly router = this.trpc.router;
  readonly mergeRouters = this.trpc.mergeRouters;
}
