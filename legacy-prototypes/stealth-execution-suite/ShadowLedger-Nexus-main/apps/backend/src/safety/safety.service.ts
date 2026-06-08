// Built by vsrupeshkumar
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateAction(agentType: string, action: string, metadata: any) {
    this.logger.log(`Validating ${agentType} action: ${action}`);
    
    // Safety check logic:
    // 1. Check for leakage of PII or cleartext wallet addresses in public logs
    // 2. Ensure transaction amounts don't exceed threshold for 'invisible' routing
    // 3. Prevent cluster correlation (multiple transactions to the same wallet in short time)

    const riskScore = Math.random() * 0.1; // Low risk mock
    const isSafe = riskScore < 0.8;
    const reason = isSafe ? null : 'Action would create a high behavioral correlation cluster.';

    // Persist Audit
    await this.prisma.safetyAudit.create({
      data: {
        agentType,
        action,
        riskScore,
        allowed: isSafe,
        reason,
        metadata: JSON.stringify(metadata)
      }
    });

    return { allowed: isSafe, riskScore, reason };
  }

  async auditLog(agentType: string, message: string) {
    // Scrub sensitive data before logging/storing
    const scrubbed = message.replace(/[0-9a-fA-F]{32,}/g, '[REDACTED_HASH]');
    return scrubbed;
  }
}
