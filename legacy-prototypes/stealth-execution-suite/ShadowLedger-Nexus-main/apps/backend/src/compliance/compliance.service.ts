// Built by vsrupeshkumar
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class ComplianceService {
  private activeKeys: Map<string, { expires: number; permissions: string[] }> = new Map();

  generateTemporalKey(durationMinutes: number = 60, permissions: string[] = ['VIEW_TRANSACTIONS']) {
    const key = `nexus_view_${crypto.randomBytes(16).toString('hex')}`;
    const expires = Date.now() + durationMinutes * 60 * 1000;
    
    this.activeKeys.set(key, { expires, permissions });
    
    return {
      key,
      expiresAt: new Date(expires).toISOString(),
      permissions
    };
  }

  validateKey(key: string) {
    const session = this.activeKeys.get(key);
    
    if (!session) return { valid: false, reason: 'INVALID_KEY' };
    if (Date.now() > session.expires) {
      this.activeKeys.delete(key);
      return { valid: false, reason: 'KEY_EXPIRED' };
    }

    return { valid: true, permissions: session.permissions };
  }

  scrambleAuditTrail(transactions: any[]) {
    // Generate an audit-ready but privacy-preserving report
    return transactions.map(tx => ({
      id: `anon_${crypto.createHash('sha256').update(tx.id).digest('hex').slice(0, 8)}`,
      amount: tx.amount,
      type: tx.type,
      timestamp: tx.createdAt
    }));
  }
}
