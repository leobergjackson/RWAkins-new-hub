import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TrpcRouter } from './trpc/trpc.router';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { NexusLogger } from './common/logging/nexus.logger';
import * as trpcExpress from '@trpc/server/adapters/express';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not set — AI orchestration features will be degraded.');
  }

  const app = await NestFactory.create(AppModule, {
    logger: new NexusLogger(),
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(helmet());
  app.use(compression());
  app.enableCors();

  const trpcRouter = app.get(TrpcRouter);
  
  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: trpcRouter.appRouter,
      createContext: () => ({}),
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
