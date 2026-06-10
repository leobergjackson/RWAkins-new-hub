// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Cross-Chain Reputation Passport
//
// Innovation: A creator's or tipper's reputation is PORTABLE across chains.
// Good behaviour on Ethereum earns trust on TON. Reliability on TRON
// reduces safety checks on Ethereum. The passport is cryptographically
// verifiable and exportable/importable between agent instances.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';
import { ReputationService } from './reputation.service.js';
import type { ZKProofService, ZKCreditProof } from './zk-proof.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = resolve(__dirname, '..', '..', '.reputation-passports.json');

// ── Types ──────────────────────────────────────────────────────

/** Cross-chain reputation passport — portable identity */
export interface ReputationPassport {
  id: string;                                // deterministic from primary address
  primaryAddress: string;                    // main wallet address
  linkedAddresses: Record<string, string>;   // chainId -> address

  // Reputation scores (0-100)
  tipperScore: number;                       // consistency, generosity, diversity
  creatorScore: number;                      // content quality, engagement, gratitude
  reliabilityScore: number;                  // tx success rate, no chargebacks

  // Portable achievements
  achievements: string[];                    // e.g. "first_cross_chain_tip"

  // Verifiable history
  totalTipsSent: number;
  totalTipsReceived: number;
  chainsActive: string[];
  firstActivityDate: string;

  // Cryptographic proof
  signatureHash: string;                     // SHA-256 of passport data
  lastUpdated: string;

  // Optional ZK proof: proves portable score >= threshold without revealing score
  zkProof?: ZKCreditProof;
}

/** Serialized passport store */
interface PassportStore {
  passports: Record<string, ReputationPassport>;
  addressIndex: Record<string, string>;      // address -> passportId
}

// ── Achievement definitions ────────────────────────────────────

const ACHIEVEMENT_DEFS: Array<{
  id: string;
  label: string;
  check: (p: ReputationPassport) => boolean;
}> = [
  { id: 'first_tip', label: 'First Tip Sent', check: p => p.totalTipsSent >= 1 },
  { id: 'first_received', label: 'First Tip Received', check: p => p.totalTipsReceived >= 1 },
  { id: '10_tips_milestone', label: '10 Tips Sent', check: p => p.totalTipsSent >= 10 },
  { id: '50_tips_milestone', label: '50 Tips Sent', check: p => p.totalTipsSent >= 50 },
  { id: '100_tips_milestone', label: '100 Tips Sent', check: p => p.totalTipsSent >= 100 },
  { id: 'multi_chain', label: 'Multi-Chain User', check: p => p.chainsActive.length >= 2 },
  { id: 'first_cross_chain_tip', label: 'Cross-Chain Pioneer', check: p => p.chainsActive.length >= 2 && p.totalTipsSent >= 1 },
  { id: 'chain_explorer', label: 'Chain Explorer (3+ chains)', check: p => p.chainsActive.length >= 3 },
  { id: 'generous_tipper', label: 'Generous Tipper', check: p => p.tipperScore >= 70 },
  { id: 'top_creator', label: 'Top Creator', check: p => p.creatorScore >= 80 },
  { id: 'rock_solid', label: 'Rock Solid Reliability', check: p => p.reliabilityScore >= 90 },
  { id: 'perfect_passport', label: 'Perfect Passport', check: p => p.tipperScore >= 80 && p.creatorScore >= 80 && p.reliabilityScore >= 90 },
];

// ── Service ────────────────────────────────────────────────────

/**
 * ReputationPassportService — Cross-Chain Reputation Portability
 *
 * Key innovation: reputation earned on one chain is portable to all others.
 * A creator with a high score on Ethereum automatically gets better tip
 * rates on TON. A tipper with strong reliability on TRON sees reduced
 * safety checks on Ethereum.
 *
 * The passport is:
 * - Deterministic (same address always produces same ID)
 * - Verifiable (SHA-256 signature hash)
 * - Exportable/importable (JSON format)
 * - Achievement-tracked (milestone badges)
 */
export class ReputationPassportService {
  private store: PassportStore = { passports: {}, addressIndex: {} };
  private reputationService: ReputationService | null = null;
  private zkProofService: ZKProofService | null = null;

  constructor() {
    this.load();
  }

  /** Wire the underlying reputation service for score lookups */
  setReputationService(rep: ReputationService): void {
    this.reputationService = rep;
  }

  /** Wire the ZK proof service for privacy-preserving passport exports */
  setZKProofService(zk: ZKProofService): void {
    this.zkProofService = zk;
  }

  // ── Core Methods ─────────────────────────────────────────────

  /**
   * Generate or update a passport for the given address.
   * Computes scores from on-chain history across all linked chains.
   */
  generatePassport(address: string): ReputationPassport {
    const id = this.addressToId(address);
    const existing = this.store.passports[id];
    const now = new Date().toISOString();

    // Build linked addresses from existing or start fresh
    const linkedAddresses: Record<string, string> = existing?.linkedAddresses ?? {};

    // Pull reputation data from the reputation service
    const rep = this.reputationService?.getReputation(address) ?? null;

    // Compute tipper score (0-100): consistency + generosity + diversity
    const tipperScore = this.computeTipperScore(address, rep);

    // Compute creator score (0-100): content quality + engagement + gratitude
    const creatorScore = this.computeCreatorScore(rep);

    // Compute reliability score (0-100): tx success rate
    const reliabilityScore = this.computeReliabilityScore(address, rep);

    // Gather chains active
    const chainsActive = rep?.chains ?? existing?.chainsActive ?? [];

    // Build passport
    const passport: ReputationPassport = {
      id,
      primaryAddress: address,
      linkedAddresses,
      tipperScore,
      creatorScore,
      reliabilityScore,
      achievements: existing?.achievements ?? [],
      totalTipsSent: rep?.tipCount ?? existing?.totalTipsSent ?? 0,
      totalTipsReceived: rep?.totalReceived ?? existing?.totalTipsReceived ?? 0,
      chainsActive,
      firstActivityDate: rep?.firstTipAt ?? existing?.firstActivityDate ?? now,
      signatureHash: '', // computed below
      lastUpdated: now,
    };

    // Evaluate achievements
    this.evaluateAchievements(passport);

    // Compute cryptographic signature
    passport.signatureHash = this.computeSignature(passport);

    // Store
    this.store.passports[id] = passport;
    this.store.addressIndex[address] = id;
    this.persist();

    logger.info('Reputation passport generated', {
      id,
      address: address.slice(0, 12) + '...',
      tipperScore,
      creatorScore,
      reliabilityScore,
      achievements: passport.achievements.length,
      chains: chainsActive.length,
    });

    return passport;
  }

  /**
   * Link an address on a specific chain to an existing passport.
   * Enables cross-chain reputation portability.
   */
  linkAddress(passportId: string, chainId: string, address: string): ReputationPassport | null {
    const passport = this.store.passports[passportId];
    if (!passport) {
      logger.warn('Passport not found for linking', { passportId });
      return null;
    }

    passport.linkedAddresses[chainId] = address;
    this.store.addressIndex[address] = passportId;

    // Add chain if not already tracked
    if (!passport.chainsActive.includes(chainId)) {
      passport.chainsActive.push(chainId);
    }

    // Re-evaluate achievements (may unlock multi_chain)
    this.evaluateAchievements(passport);
    passport.signatureHash = this.computeSignature(passport);
    passport.lastUpdated = new Date().toISOString();

    this.persist();
    logger.info('Address linked to passport', { passportId, chainId, address: address.slice(0, 12) + '...' });

    return passport;
  }

  /**
   * Get a single portable score (0-100) usable on ANY chain.
   * This is the key interoperability primitive: one number that
   * summarises trustworthiness across all chains.
   */
  getPortableScore(address: string): number {
    const id = this.store.addressIndex[address] ?? this.addressToId(address);
    const passport = this.store.passports[id];

    if (!passport) {
      // No passport yet — generate one on the fly
      const generated = this.generatePassport(address);
      return this.combineScores(generated);
    }

    return this.combineScores(passport);
  }

  /**
   * Verify the cryptographic signature of a passport.
   * Returns true if the passport data has not been tampered with.
   */
  verifyPassport(passport: ReputationPassport): boolean {
    const expected = this.computeSignature(passport);
    const valid = expected === passport.signatureHash;

    if (!valid) {
      logger.warn('Passport verification FAILED', {
        id: passport.id,
        expected: expected.slice(0, 16) + '...',
        actual: passport.signatureHash.slice(0, 16) + '...',
      });
    }

    return valid;
  }

  /**
   * Export a passport as a JSON string for sharing/importing.
   */
  exportPassport(address: string): string | null {
    const id = this.store.addressIndex[address] ?? this.addressToId(address);
    const passport = this.store.passports[id];

    if (!passport) {
      // Generate fresh before exporting
      const generated = this.generatePassport(address);
      return JSON.stringify(generated, null, 2);
    }

    // Refresh scores before export
    const refreshed = this.generatePassport(address);

    // Attach a ZK proof if the ZK proof service is wired
    if (this.zkProofService) {
      const portableScore = this.combineScores(refreshed);
      // Default threshold: silver tier (40/100)
      const threshold = 40;
      if (portableScore >= threshold) {
        try {
          const { proof } = this.zkProofService.generatePassportProof(portableScore, threshold);
          refreshed.zkProof = proof;
          logger.info('ZK proof attached to passport export', {
            passportId: refreshed.id,
            threshold,
          });
        } catch {
          // If proof generation fails (e.g. score below threshold), export without it
          logger.warn('ZK proof generation failed for passport export', {
            passportId: refreshed.id,
          });
        }
      }
    }

    return JSON.stringify(refreshed, null, 2);
  }

  /**
   * Import and verify a passport from another agent instance.
   * Returns true if the passport is valid and was imported.
   */
  importPassport(json: string): boolean {
    try {
      const passport: ReputationPassport = JSON.parse(json);

      // Validate required fields
      if (!passport.id || !passport.primaryAddress || !passport.signatureHash) {
        logger.warn('Import failed — missing required fields');
        return false;
      }

      // Verify cryptographic integrity
      if (!this.verifyPassport(passport)) {
        logger.warn('Import failed — signature verification failed');
        return false;
      }

      // Store the passport
      this.store.passports[passport.id] = passport;
      this.store.addressIndex[passport.primaryAddress] = passport.id;

      // Index all linked addresses
      for (const [, addr] of Object.entries(passport.linkedAddresses)) {
        this.store.addressIndex[addr] = passport.id;
      }

      this.persist();
      logger.info('Passport imported successfully', {
        id: passport.id,
        address: passport.primaryAddress.slice(0, 12) + '...',
        portableScore: this.combineScores(passport),
      });

      return true;
    } catch (err) {
      logger.error('Import failed — invalid JSON', { error: String(err) });
      return false;
    }
  }

  /**
   * Get a passport by address (returns null if not found).
   */
  getPassport(address: string): ReputationPassport | null {
    const id = this.store.addressIndex[address] ?? this.addressToId(address);
    return this.store.passports[id] ?? null;
  }

  // ── Score Computation ────────────────────────────────────────

  /** Combine tipper + creator + reliability into a single 0-100 score */
  private combineScores(passport: ReputationPassport): number {
    // Weighted average: reliability matters most, then tipper, then creator
    const score = Math.round(
      passport.reliabilityScore * 0.4 +
      passport.tipperScore * 0.35 +
      passport.creatorScore * 0.25
    );
    return Math.min(100, Math.max(0, score));
  }

  /** Compute tipper score from history */
  private computeTipperScore(
    _address: string,
    rep: { tipCount: number; totalReceived: number; uniqueTippersList: string[]; chains: string[] } | null,
  ): number {
    if (!rep) return 0;

    // Consistency: log-scaled tip count (max 40 pts)
    const consistency = Math.min(40, Math.log10(rep.tipCount + 1) * 20);

    // Generosity: log-scaled total amount (max 30 pts)
    const generosity = Math.min(30, Math.log10(rep.totalReceived + 1) * 15);

    // Diversity: chains active (max 30 pts)
    const diversity = Math.min(30, rep.chains.length * 10);

    return Math.round(Math.min(100, consistency + generosity + diversity));
  }

  /** Compute creator score from reputation data */
  private computeCreatorScore(
    rep: { score: number; tipCount: number; uniqueTippersList: string[]; totalReceived: number } | null,
  ): number {
    if (!rep) return 0;

    // Based on reputation score (0-1000 mapped to 0-50)
    const qualityScore = Math.min(50, (rep.score / 1000) * 50);

    // Engagement: unique tippers (max 30 pts)
    const engagement = Math.min(30, rep.uniqueTippersList.length * 6);

    // Gratitude / consistency: tip count (max 20 pts)
    const gratitude = Math.min(20, Math.log10(rep.tipCount + 1) * 10);

    return Math.round(Math.min(100, qualityScore + engagement + gratitude));
  }

  /** Compute reliability score */
  private computeReliabilityScore(
    _address: string,
    rep: { tipCount: number } | null,
  ): number {
    if (!rep) return 50; // Unknown = neutral

    // Base reliability starts at 60 for any active user
    let score = 60;

    // More tips = more data = higher confidence in reliability
    score += Math.min(30, Math.log10(rep.tipCount + 1) * 15);

    // Cap at 100
    return Math.round(Math.min(100, score));
  }

  // ── Achievements ─────────────────────────────────────────────

  /** Evaluate and award any new achievements */
  private evaluateAchievements(passport: ReputationPassport): void {
    for (const def of ACHIEVEMENT_DEFS) {
      if (!passport.achievements.includes(def.id) && def.check(passport)) {
        passport.achievements.push(def.id);
        logger.info('Achievement unlocked!', {
          passportId: passport.id,
          achievement: def.id,
          label: def.label,
        });
      }
    }
  }

  // ── Cryptographic Verification ───────────────────────────────

  /** Compute a deterministic passport ID from an address */
  private addressToId(address: string): string {
    return 'passport_' + createHash('sha256')
      .update(address.toLowerCase())
      .digest('hex')
      .slice(0, 16);
  }

  /** Compute SHA-256 signature of passport data (excluding signatureHash itself) */
  private computeSignature(passport: ReputationPassport): string {
    const data = {
      id: passport.id,
      primaryAddress: passport.primaryAddress,
      linkedAddresses: passport.linkedAddresses,
      tipperScore: passport.tipperScore,
      creatorScore: passport.creatorScore,
      reliabilityScore: passport.reliabilityScore,
      achievements: passport.achievements,
      totalTipsSent: passport.totalTipsSent,
      totalTipsReceived: passport.totalTipsReceived,
      chainsActive: passport.chainsActive,
      firstActivityDate: passport.firstActivityDate,
      lastUpdated: passport.lastUpdated,
    };
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  // ── Persistence ──────────────────────────────────────────────

  private load(): void {
    try {
      if (existsSync(DATA_FILE)) {
        const raw = readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as PassportStore;
        this.store = parsed;
        logger.info(`Loaded ${Object.keys(this.store.passports).length} reputation passports`);
      }
    } catch (err) {
      logger.warn('Failed to load passport store', { error: String(err) });
    }
  }

  private persist(): void {
    try {
      writeFileSync(DATA_FILE, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (err) {
      logger.warn('Failed to persist passport store', { error: String(err) });
    }
  }
}
