// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — ZK Proof API routes

import { Router } from 'express';
import type { ZKProofService, Groth16Result } from '../services/zk-proof.service.js';

// WDK type imports for ZK proof generation on wallet data via Tether Wallet Development Kit
import type WDK from '@tetherto/wdk';
import type WalletManagerEvm from '@tetherto/wdk-wallet-evm';
// ZK proofs attest to WDK wallet balance ranges without revealing exact amounts
export type _WdkRefs = WDK | WalletManagerEvm; // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Register ZK proof routes onto the given router.
 *
 * GET  /api/zk/capabilities — show available ZK modes
 * POST /api/zk/commit       — create a hash commitment to a score
 * POST /api/zk/prove         — generate a proof (hash-based or Groth16)
 * POST /api/zk/verify        — verify a proof without knowing the score
 * POST /api/zk/groth16/prove  — generate a Groth16 ZK-SNARK proof
 * POST /api/zk/groth16/verify — verify a Groth16 ZK-SNARK proof
 */
export function registerZKProofRoutes(
  router: Router,
  zkProofService: ZKProofService,
): void {

  /** GET /api/zk/capabilities — Show available ZK proof modes */
  router.get('/zk/capabilities', (_req, res) => {
    void (async () => {
      try {
        const capabilities = await zkProofService.getZKCapabilities();
        res.json({
          ...capabilities,
          modes: {
            hashBased: {
              available: capabilities.hashBased,
              description: 'SHA-256 commitment-based proofs — always available, no setup required',
            },
            groth16: {
              available: capabilities.groth16,
              description: 'Circom ZK-SNARK proofs via snarkjs — requires compiled circuit artifacts',
              snarkjsInstalled: capabilities.snarkjsInstalled,
              circuitArtifactsExist: capabilities.circuitArtifactsExist,
              circuitsDir: capabilities.circuitsDir,
              requiredArtifacts: capabilities.requiredArtifacts,
            },
          },
        });
      } catch (err) {
        res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
      }
    })();
  });

  /** POST /api/zk/commit — Create a commitment to a score */
  router.post('/zk/commit', (req, res) => {
    try {
      const { score, salt } = req.body as { score?: number; salt?: string };

      if (score == null || typeof score !== 'number') {
        res.status(400).json({ error: 'score (number) is required' });
        return;
      }

      const useSalt = salt ?? zkProofService.generateSalt();
      const result = zkProofService.createCommitment(score, useSalt);

      res.json({
        commitment: result.commitment,
        salt: result.salt,
        timestamp: result.timestamp,
        note: 'Keep the salt secret — it is needed to generate proofs later.',
      });
    } catch (err) {
      res.status(400).json({ error: String(err instanceof Error ? err.message : err) });
    }
  });

  /** POST /api/zk/prove — Generate proof that score >= threshold (hash-based) */
  router.post('/zk/prove', (req, res) => {
    try {
      const { score, salt, threshold } = req.body as {
        score?: number;
        salt?: string;
        threshold?: number;
      };

      if (score == null || typeof score !== 'number') {
        res.status(400).json({ error: 'score (number) is required' });
        return;
      }
      if (!salt || typeof salt !== 'string') {
        res.status(400).json({ error: 'salt (string) is required' });
        return;
      }
      if (threshold == null || typeof threshold !== 'number') {
        res.status(400).json({ error: 'threshold (number) is required' });
        return;
      }

      const proof = zkProofService.proveAboveThreshold(score, salt, threshold);

      res.json({
        commitment: proof.commitment,
        proof: proof.proof,
        threshold: proof.threshold,
        timestamp: proof.timestamp,
        mode: 'hash-based',
        note: 'Share commitment + proof + threshold with the verifier. Do NOT share score or salt.',
      });
    } catch (err) {
      res.status(400).json({ error: String(err instanceof Error ? err.message : err) });
    }
  });

  /** POST /api/zk/verify — Verify a proof without knowing the score */
  router.post('/zk/verify', (req, res) => {
    try {
      const { commitment, proof, threshold, score, salt } = req.body as {
        commitment?: string;
        proof?: string;
        threshold?: number;
        score?: number;
        salt?: string;
      };

      if (!commitment || typeof commitment !== 'string') {
        res.status(400).json({ error: 'commitment (string) is required' });
        return;
      }
      if (!proof || typeof proof !== 'string') {
        res.status(400).json({ error: 'proof (string) is required' });
        return;
      }
      if (threshold == null || typeof threshold !== 'number') {
        res.status(400).json({ error: 'threshold (number) is required' });
        return;
      }

      // If score + salt are provided, do full interactive verification
      if (score != null && salt) {
        const result = zkProofService.verifyWithSalt(commitment, proof, threshold, score, salt);
        res.json(result);
        return;
      }

      // Otherwise do structural verification
      const result = zkProofService.verifyProof(commitment, proof, threshold);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: String(err instanceof Error ? err.message : err) });
    }
  });

  /** POST /api/zk/groth16/prove — Generate a Groth16 ZK-SNARK proof */
  router.post('/zk/groth16/prove', (req, res) => {
    void (async () => {
      try {
        const { score, salt, threshold } = req.body as {
          score?: number;
          salt?: number | string;
          threshold?: number;
        };

        if (score == null || typeof score !== 'number') {
          res.status(400).json({ error: 'score (number) is required' });
          return;
        }
        if (salt == null) {
          res.status(400).json({ error: 'salt (number or string) is required' });
          return;
        }
        if (threshold == null || typeof threshold !== 'number') {
          res.status(400).json({ error: 'threshold (number) is required' });
          return;
        }

        const result = await zkProofService.generateGroth16Proof(score, salt, threshold);
        if (!result) {
          res.status(503).json({
            error: 'Groth16 proofs not available. Check GET /api/zk/capabilities for details.',
            fallback: 'Use POST /api/zk/prove for hash-based proofs.',
          });
          return;
        }

        res.json(result);
      } catch (err) {
        res.status(400).json({ error: String(err instanceof Error ? err.message : err) });
      }
    })();
  });

  /** POST /api/zk/groth16/verify — Verify a Groth16 ZK-SNARK proof */
  router.post('/zk/groth16/verify', (req, res) => {
    void (async () => {
      try {
        const { proof, publicSignals } = req.body as {
          proof?: Groth16Result['proof'];
          publicSignals?: string[];
        };

        if (!proof) {
          res.status(400).json({ error: 'proof (object with pi_a, pi_b, pi_c) is required' });
          return;
        }
        if (!publicSignals || !Array.isArray(publicSignals)) {
          res.status(400).json({ error: 'publicSignals (string[]) is required' });
          return;
        }

        const result = await zkProofService.verifyGroth16Proof(proof, publicSignals);
        if (!result) {
          res.status(503).json({
            error: 'Groth16 verification not available. Check GET /api/zk/capabilities for details.',
          });
          return;
        }

        res.json(result);
      } catch (err) {
        res.status(400).json({ error: String(err instanceof Error ? err.message : err) });
      }
    })();
  });
}
