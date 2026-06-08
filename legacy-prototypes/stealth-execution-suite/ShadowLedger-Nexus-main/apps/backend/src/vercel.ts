// Built by vsrupeshkumar
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TrpcRouter } from './trpc/trpc.router';
import * as trpcExpress from '@trpc/server/adapters/express';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();

export const bootstrap = async (expressApp: express.Express) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );
  
  app.enableCors();
  
  const trpcRouter = app.get(TrpcRouter);
  
  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: trpcRouter.appRouter,
      createContext: () => ({}),
    }),
  );

  await app.init();
};

bootstrap(server);

export default server;
