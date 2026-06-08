// Built by vsrupeshkumar
import { Module } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { TrpcRouter } from './trpc.router';
import { AgentService } from '../agents/agent.service';
import { SimulationService } from '../simulations/simulation.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ComplianceService } from '../compliance/compliance.service';
import { PrivacyService } from '../privacy/privacy.service';
import { SafetyService } from '../safety/safety.service';
import { PrismaService } from '../common/prisma.service';
import { NexusGateway } from './nexus.gateway';

@Module({
  providers: [
    PrismaService,
    TrpcService,
    TrpcRouter,
    AgentService,
    SimulationService,
    BlockchainService,
    ComplianceService,
    PrivacyService,
    SafetyService,
    NexusGateway,
  ],
  exports: [TrpcService, NexusGateway],
})
export class TrpcModule {}
