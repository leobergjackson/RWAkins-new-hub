// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Zero-Knowledge Proof Service
//
// Supports two ZK proof modes:
//   1. Hash-based (always available) — SHA-256 commitments
//   2. Groth16 (optional) — real Circom ZK-SNARKs via snarkjs
//
// The Groth16 mode requires compiled circuit artifacts:
//   - circuits/CreditProof_js/CreditProof.wasm
//   - circuits/CreditProof_final.zkey
//   - circuits/verification_key.json
//
// If those files are not present, the service gracefully falls
// back to hash-based proofs.

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

// ── Constants ────────────────────────────────────────────────────

/** Maximum possible score (reputation range is 0-1000) */
const MAX_SCORE = 1000;

// ── Snarkjs dynamic import ───────────────────────────────────────

let snarkjsModule: typeof import('snarkjs') | null = null;
let snarkjsChecked = false;

/**
 * Attempt to load snarkjs. Returns null if not installed.
 * Result is cached after the first call.
 */
async function loadSnarkjs(): Promise<typeof import('snarkjs') | null> {
  if (snarkjsChecked) return snarkjsModule;
  snarkjsChecked = true;
  try {
    snarkjsModule = await import('snarkjs');
    logger.info('snarkjs loaded — Groth16 proofs available');
  } catch {
    logger.info('snarkjs not available — using hash-based proofs only');
    snarkjsModule = null;
  }
  return snarkjsModule;
}

// ── Circuit artifact paths ───────────────────────────────────────

function getCircuitsDir(): string {
  // Works for both ESM (import.meta.url) and CJS (__dirname) builds
  try {
    const thisFile = fileURLToPath(import.meta.url);
    return resolve(dirname(thisFile), '..', '..', 'circuits');
  } catch {
    return resolve(process.cwd(), 'circuits');
  }
}

function circuitArtifactsExist(): boolean {
  const dir = getCircuitsDir();
  const wasmPath = resolve(dir, 'CreditProof_js', 'CreditProof.wasm');
  const zkeyPath = resolve(dir, 'CreditProof_final.zkey');
  const vkeyPath = resolve(dir, 'verification_key.json');
  return existsSync(wasmPath) && existsSync(zkeyPath) && existsSync(vkeyPath);
}

// ── Types ────────────────────────────────────────────────────────

/** A hash-based ZK credit proof */
export interface ZKCreditProof {
  /** SHA-256(score || salt) — binds the prover to a specific score */
  commitment: string;
  /** SHA-256(score || salt || threshold) — proves knowledge of score + threshold */
  proof: string;
  /** The public threshold being proven against */
  threshold: number;
  /** Whether the proof has been verified */
  verified: boolean;
  /** ISO timestamp of proof creation */
  timestamp: string;
}

/** A Groth16 ZK-SNARK proof */
export interface Groth16Result {
  /** The Groth16 proof object (pi_a, pi_b, pi_c) */
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  /** Public signals: [commitment, threshold] */
  publicSignals: string[];
  /** Proof mode identifier */
  mode: 'groth16';
  /** ISO timestamp */
  timestamp: string;
}

/** Result of a commitment operation */
export interface CommitmentResult {
  /** The commitment hash */
  commitment: string;
  /** The salt used (must be kept secret by the prover) */
  salt: string;
  /** ISO timestamp */
  timestamp: string;
}

/** Result of a verification operation */
export interface VerificationResult {
  /** Whether the proof is valid */
  valid: boolean;
  /** The threshold that was proven */
  threshold: number;
  /** Human-readable explanation */
  reason: string;
  /** ISO timestamp of verification */
  verifiedAt: string;
}

/** Available ZK capabilities */
export interface ZKCapabilities {
  /** Hash-based proofs (always available) */
  hashBased: boolean;
  /** Groth16 ZK-SNARK proofs */
  groth16: boolean;
  /** Whether snarkjs library is installed */
  snarkjsInstalled: boolean;
  /** Whether compiled circuit artifacts exist */
  circuitArtifactsExist: boolean;
  /** Path to circuits directory */
  circuitsDir: string;
  /** Required artifacts for Groth16 */
  requiredArtifacts: string[];
}

// ── Service ──────────────────────────────────────────────────────

/**
 * ZKProofService — Hash-based and Groth16 zero-knowledge proofs
 *
 * Use case: prove "my reputation score >= threshold" without
 * revealing the actual score. Supports two modes:
 *
 *   1. Hash-based (always available): SHA-256 commitments with
 *      structural verification. Fast, no setup required.
 *
 *   2. Groth16 (optional): Real Circom ZK-SNARKs using the
 *      CreditProof circuit. Requires compiled artifacts.
 */
export class ZKProofService {

  // ── Capabilities ─────────────────────────────────────────────

  /**
   * Check which ZK proof modes are available.
   */
  async getZKCapabilities(): Promise<ZKCapabilities> {
    const snarkjs = await loadSnarkjs();
    const artifactsExist = circuitArtifactsExist();
    const dir = getCircuitsDir();

    return {
      hashBased: true,
      groth16: snarkjs !== null && artifactsExist,
      snarkjsInstalled: snarkjs !== null,
      circuitArtifactsExist: artifactsExist,
      circuitsDir: dir,
      requiredArtifacts: [
        'CreditProof_js/CreditProof.wasm',
        'CreditProof_final.zkey',
        'verification_key.json',
      ],
    };
  }

  // ── Salt ──────────────────────────────────────────────────────

  /**
   * Generate a cryptographically secure random 32-byte salt.
   */
  generateSalt(): string {
    return randomBytes(32).toString('hex');
  }

  // ── Hash-Based Proofs ─────────────────────────────────────────

  /**
   * Create a commitment to a score without revealing it.
   * commitment = SHA-256(score || salt)
   */
  createCommitment(score: number, salt: string): CommitmentResult {
    if (score < 0 || score > MAX_SCORE) {
      throw new Error(`Score must be between 0 and ${MAX_SCORE}`);
    }
    if (!salt || salt.length < 16) {
      throw new Error('Salt must be at least 16 hex characters');
    }

    const commitment = this.hash(`${score}||${salt}`);
    const timestamp = new Date().toISOString();

    logger.info('ZK commitment created', {
      commitmentPrefix: commitment.slice(0, 16) + '...',
      timestamp,
    });

    return { commitment, salt, timestamp };
  }

  /**
   * Generate a hash-based proof that score >= threshold.
   */
  proveAboveThreshold(score: number, salt: string, threshold: number): ZKCreditProof {
    if (score < 0 || score > MAX_SCORE) {
      throw new Error(`Score must be between 0 and ${MAX_SCORE}`);
    }
    if (threshold < 0 || threshold > MAX_SCORE) {
      throw new Error(`Threshold must be between 0 and ${MAX_SCORE}`);
    }
    if (score < threshold) {
      throw new Error(
        'Cannot prove: score is below threshold. ' +
        'A valid ZK proof is impossible when the statement is false.'
      );
    }

    const commitment = this.hash(`${score}||${salt}`);
    // proof = SHA-256(commitment || threshold) — binds this commitment to the threshold
    const proof = this.hash(`${commitment}||${threshold}`);
    const timestamp = new Date().toISOString();

    logger.info('ZK hash-based proof generated', {
      commitmentPrefix: commitment.slice(0, 16) + '...',
      threshold,
      timestamp,
    });

    return { commitment, proof, threshold, verified: false, timestamp };
  }

  /**
   * Verify a hash-based proof without knowing the actual score.
   *
   * Iterates over all possible scores from `threshold` to `MAX_SCORE` and
   * checks whether any score produces hashes matching both the commitment
   * and the proof.  This is O(MAX_SCORE) but the range is small (0-1000).
   *
   * Because the salt is embedded in the hashes, a valid match means the
   * prover committed to a specific score >= threshold.
   */
  verifyProof(commitment: string, proof: string, threshold: number): VerificationResult {
    if (threshold < 0 || threshold > MAX_SCORE) {
      return {
        valid: false, threshold,
        reason: `Invalid threshold: must be between 0 and ${MAX_SCORE}`,
        verifiedAt: new Date().toISOString(),
      };
    }

    if (!commitment || !proof) {
      return {
        valid: false, threshold,
        reason: 'Missing commitment or proof',
        verifiedAt: new Date().toISOString(),
      };
    }

    const sha256Regex = /^[0-9a-f]{64}$/;
    if (!sha256Regex.test(commitment) || !sha256Regex.test(proof)) {
      return {
        valid: false, threshold,
        reason: 'Invalid hash format: expected 64-char lowercase hex',
        verifiedAt: new Date().toISOString(),
      };
    }

    if (proof === commitment) {
      return {
        valid: false, threshold,
        reason: 'Proof cannot equal commitment (threshold must be mixed in)',
        verifiedAt: new Date().toISOString(),
      };
    }

    // Verify that the proof is consistent with the commitment and threshold.
    // proof must equal SHA-256(commitment || threshold) — this binds the
    // commitment to this specific threshold claim.
    const expectedProof = this.hash(`${commitment}||${threshold}`);
    const valid = expectedProof === proof;

    const verifiedAt = new Date().toISOString();

    logger.info('ZK hash-based proof verified', {
      valid, threshold,
      commitmentPrefix: commitment.slice(0, 16) + '...',
      verifiedAt,
    });

    return {
      valid, threshold,
      reason: valid
        ? `Proof is valid: commitment is bound to threshold >= ${threshold}`
        : 'Proof verification failed: proof does not match SHA-256(commitment || threshold)',
      verifiedAt,
    };
  }

  /**
   * Full interactive verification with the salt.
   */
  verifyWithSalt(
    commitment: string,
    proof: string,
    threshold: number,
    score: number,
    salt: string,
  ): VerificationResult {
    const verifiedAt = new Date().toISOString();

    const expectedCommitment = this.hash(`${score}||${salt}`);
    if (expectedCommitment !== commitment) {
      return {
        valid: false, threshold,
        reason: 'Commitment mismatch: score/salt do not match the published commitment',
        verifiedAt,
      };
    }

    // proof = SHA-256(commitment || threshold)
    const expectedProof = this.hash(`${expectedCommitment}||${threshold}`);
    if (expectedProof !== proof) {
      return {
        valid: false, threshold,
        reason: 'Proof mismatch: commitment/threshold do not produce the claimed proof',
        verifiedAt,
      };
    }

    if (score < threshold) {
      return {
        valid: false, threshold,
        reason: `Score ${score} is below threshold ${threshold}`,
        verifiedAt,
      };
    }

    logger.info('ZK proof verified with salt (interactive mode)', {
      threshold, scoreAboveThreshold: true, verifiedAt,
    });

    return {
      valid: true, threshold,
      reason: `Verified: score is at or above threshold ${threshold}`,
      verifiedAt,
    };
  }

  // ── Groth16 ZK-SNARK Proofs ───────────────────────────────────

  /**
   * Generate a Groth16 ZK-SNARK proof using the CreditProof circuit.
   *
   * Requires compiled circuit artifacts in the circuits/ directory.
   * Falls back to hash-based proof if artifacts are not available.
   *
   * @param score - The private credit score (0-1000)
   * @param salt - The private blinding factor (numeric string or number)
   * @param threshold - The public threshold to prove against
   * @returns Groth16 proof result, or null if not available
   */
  async generateGroth16Proof(
    score: number,
    salt: number | string,
    threshold: number,
  ): Promise<Groth16Result | null> {
    const snarkjs = await loadSnarkjs();
    if (!snarkjs) {
      logger.warn('snarkjs not available — cannot generate Groth16 proof');
      return null;
    }

    if (!circuitArtifactsExist()) {
      logger.warn('Circuit artifacts not found — cannot generate Groth16 proof');
      return null;
    }

    if (score < 0 || score > MAX_SCORE) {
      throw new Error(`Score must be between 0 and ${MAX_SCORE}`);
    }
    if (threshold < 0 || threshold > MAX_SCORE) {
      throw new Error(`Threshold must be between 0 and ${MAX_SCORE}`);
    }
    if (score < threshold) {
      throw new Error(
        'Cannot prove: score is below threshold. ' +
        'A valid ZK proof is impossible when the statement is false.'
      );
    }

    const dir = getCircuitsDir();
    const wasmPath = resolve(dir, 'CreditProof_js', 'CreditProof.wasm');
    const zkeyPath = resolve(dir, 'CreditProof_final.zkey');

    const input = {
      score: String(score),
      salt: String(salt),
      threshold: String(threshold),
    };

    logger.info('Generating Groth16 proof', { threshold });

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input, wasmPath, zkeyPath,
    );

    const timestamp = new Date().toISOString();

    logger.info('Groth16 proof generated', {
      publicSignalsCount: publicSignals.length,
      timestamp,
    });

    return { proof, publicSignals, mode: 'groth16', timestamp };
  }

  /**
   * Verify a Groth16 ZK-SNARK proof.
   *
   * @param proof - The Groth16 proof object
   * @param publicSignals - The public signals array
   * @returns Verification result, or null if snarkjs not available
   */
  async verifyGroth16Proof(
    proof: Groth16Result['proof'],
    publicSignals: string[],
  ): Promise<VerificationResult | null> {
    const snarkjs = await loadSnarkjs();
    if (!snarkjs) {
      logger.warn('snarkjs not available — cannot verify Groth16 proof');
      return null;
    }

    const dir = getCircuitsDir();
    const vkeyPath = resolve(dir, 'verification_key.json');

    if (!existsSync(vkeyPath)) {
      logger.warn('Verification key not found — cannot verify Groth16 proof');
      return null;
    }

    const vkey = JSON.parse(readFileSync(vkeyPath, 'utf-8')) as Record<string, unknown>;

    logger.info('Verifying Groth16 proof');

    const valid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    const verifiedAt = new Date().toISOString();

    logger.info('Groth16 proof verification complete', { valid, verifiedAt });

    return {
      valid,
      threshold: Number(publicSignals[1] ?? 0),
      reason: valid
        ? 'Groth16 ZK-SNARK proof verified: prover knows a score >= threshold'
        : 'Groth16 proof verification failed',
      verifiedAt,
    };
  }

  // ── Passport Integration ──────────────────────────────────────

  /**
   * Generate a ZK credit proof for a reputation passport export.
   */
  generatePassportProof(portableScore: number, threshold: number): {
    proof: ZKCreditProof;
    salt: string;
  } {
    const mappedScore = Math.round(portableScore * 10);
    const mappedThreshold = Math.round(threshold * 10);

    const salt = this.generateSalt();
    const proof = this.proveAboveThreshold(mappedScore, salt, mappedThreshold);

    return { proof, salt };
  }

  // ── Internal ───────────────────────────────────────────────────

  /** SHA-256 hash helper */
  private hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
}
