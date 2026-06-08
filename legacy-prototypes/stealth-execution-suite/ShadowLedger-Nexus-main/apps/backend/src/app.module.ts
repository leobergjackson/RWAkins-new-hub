// Built by vsrupeshkumar
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrpcModule } from './trpc/trpc.module';
import { AgentService } from './agents/agent.service';
import { SimulationService } from './simulations/simulation.service';
import { ComplianceService } from './compliance/compliance.service';
import { PrivacyService } from './privacy/privacy.service';
import { SafetyService } from './safety/safety.service';
import { BlockchainService } from './blockchain/blockchain.service';
import { PrismaService } from './common/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TrpcModule,
  ],
  controllers: [AppController],
  providers: [
    PrismaService,
    AppService, 
    AgentService, 
    SimulationService, 
    ComplianceService,
    PrivacyService,
    SafetyService,
    BlockchainService
  ],
})
export class AppModule {}
