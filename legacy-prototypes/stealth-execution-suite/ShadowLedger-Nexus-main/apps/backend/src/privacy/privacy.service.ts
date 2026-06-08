// Built by vsrupeshkumar
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PrivacyService {
  /**
   * Calculates the exposure score of a set of transactions.
   * Lower scores mean higher risk of deanonymization.
   */
  calculateExposureScore(transactions: any[]) {
    let score = 100;
    
    // Penalty for rapid successive transactions (Timing Correlation)
    const timingThreshold = 60000; // 1 minute
    for (let i = 1; i < transactions.length; i++) {
      const diff = new Date(transactions[i].createdAt).getTime() - new Date(transactions[i-1].createdAt).getTime();
      if (diff < timingThreshold) score -= 10;
    }
    
    // Penalty for repeated address patterns (Address Correlation)
    const addresses = transactions.map(tx => tx.recipient);
    const uniqueAddresses = new Set(addresses);
    if (addresses.length > uniqueAddresses.size) {
      score -= (addresses.length - uniqueAddresses.size) * 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Fragments a single large transfer into multiple randomized paths to avoid detection.
   */
  generateStealthPaths(amount: number, recipient: string) {
    const fragmentCount = Math.floor(Math.random() * 3) + 3; // 3-5 fragments
    let remainingAmount = amount;
    const paths: any[] = [];

    for (let i = 0; i < fragmentCount; i++) {
      const isLast = i === fragmentCount - 1;
      const fragmentAmount = isLast ? remainingAmount : +(Math.random() * (remainingAmount / (fragmentCount - i)) * 1.5).toFixed(4);
      remainingAmount -= fragmentAmount;

      paths.push({
        pathId: crypto.randomBytes(4).toString('hex'),
        amount: fragmentAmount,
        delayMs: Math.floor(Math.random() * 7200000), // Random delay up to 2 hours
        route: `Stealth Pool -> Fragmentation Node ${i + 1} -> ${recipient.slice(0, 4)}...`,
        status: 'PENDING',
        entropyLevel: 'HIGH'
      });
    }

    return paths;
  }

  /**
   * Scrubs sensitive metadata from transaction logs.
   */
  scrubMetadata(data: any) {
    const scrubbed = { ...data };
    const sensitiveKeys = ['address', 'owner', 'signature', 'memo'];
    
    sensitiveKeys.forEach(key => {
      if (scrubbed[key]) {
        scrubbed[key] = `cloak_${crypto.createHash('sha256').update(scrubbed[key]).digest('hex').slice(0, 12)}`;
      }
    });
    
    return scrubbed;
  }
}
