# ZK-SNARK Circuits

## CreditProof Circuit

Proves a credit score exceeds a threshold without revealing the actual score.
Uses Poseidon hashing for commitments and Groth16 for succinct proofs.

### How It Works

1. **Prover** knows their score (e.g., 750) and a random salt
2. **Circuit** computes `commitment = Poseidon(score, salt)` and checks `score >= threshold`
3. **Verifier** sees only the commitment and threshold — never the score

### Prerequisites

- [circom](https://docs.circom.io/getting-started/installation/) >= 2.0.0
- [snarkjs](https://github.com/iden3/snarkjs) (included as project dependency)
- [circomlib](https://github.com/iden3/circomlib) for Poseidon and comparator templates

### Compilation

```bash
# Install circomlib templates
npm install circomlib

# Compile the circuit
circom CreditProof.circom --r1cs --wasm --sym

# Download a powers-of-tau ceremony file (one-time)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau -O pot12_final.ptau

# Generate proving key
snarkjs groth16 setup CreditProof.r1cs pot12_final.ptau CreditProof_0000.zkey

# Contribute to the ceremony (adds entropy)
snarkjs zkey contribute CreditProof_0000.zkey CreditProof_final.zkey --name="AeroFyta" -v

# Export verification key
snarkjs zkey export verificationkey CreditProof_final.zkey verification_key.json
```

### Generating a Proof

```bash
# Create input.json with your private inputs
echo '{"score": "750", "salt": "12345678", "threshold": "500"}' > input.json

# Generate the witness
node CreditProof_js/generate_witness.js CreditProof_js/CreditProof.wasm input.json witness.wtns

# Generate the proof
snarkjs groth16 prove CreditProof_final.zkey witness.wtns proof.json public.json
```

### Verification

```bash
# Verify the proof (returns OK if valid)
snarkjs groth16 verify verification_key.json public.json proof.json
```

### On-Chain Verification

```bash
# Export a Solidity verifier contract
snarkjs zkey export solidityverifier CreditProof_final.zkey CreditProofVerifier.sol
```

The exported contract can verify proofs on any EVM chain — see `contracts/CreditProofVerifier.sol` for the template.

### Integration with AeroFyta

The agent uses this circuit through the `ZKProofService`:

- If compiled circuit artifacts exist (`CreditProof.wasm`, `CreditProof_final.zkey`, `verification_key.json`), the service uses **real Groth16 proofs**
- Otherwise, it falls back to **hash-based proofs** (SHA-256 commitments)

Check available modes: `GET /api/zk/capabilities`
