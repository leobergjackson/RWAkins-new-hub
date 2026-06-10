// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Circom ZK-SNARK circuit for private credit score verification.
//
// Proves that a credit/reputation score exceeds a public threshold
// WITHOUT revealing the actual score. Uses Poseidon hash for the
// commitment and GreaterEqThan for the range check.

pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/poseidon.circom";

// Prove credit score >= threshold without revealing score
template CreditProof() {
    // ── Private inputs (known only to the prover) ───────────────
    signal input score;        // The actual credit/reputation score
    signal input salt;         // Random blinding factor

    // ── Public inputs ───────────────────────────────────────────
    signal input threshold;    // Minimum score the prover claims to exceed

    // ── Public outputs ──────────────────────────────────────────
    signal output commitment;  // Poseidon(score, salt) — binds prover to score

    // ── Step 1: Compute Poseidon hash commitment ────────────────
    // The commitment hides the score behind a cryptographic hash.
    // Anyone can verify the commitment matches later without
    // learning the score (as long as salt remains secret).
    component hasher = Poseidon(2);
    hasher.inputs[0] <== score;
    hasher.inputs[1] <== salt;
    commitment <== hasher.out;

    // ── Step 2: Range proof — score >= threshold ────────────────
    // GreaterEqThan(n) checks that in[0] >= in[1] using n-bit
    // decomposition. 32 bits supports scores up to 2^32 - 1.
    component gte = GreaterEqThan(32);
    gte.in[0] <== score;
    gte.in[1] <== threshold;
    gte.out === 1;
}

component main {public [threshold]} = CreditProof();
