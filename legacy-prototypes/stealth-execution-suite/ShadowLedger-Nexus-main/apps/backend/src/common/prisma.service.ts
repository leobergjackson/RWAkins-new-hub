// Built by vsrupeshkumar
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected');
    } catch (err) {
      this.logger.warn(
        `Prisma connect failed at startup (will lazy-connect on first query): ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect().catch(() => {});
  }
}
