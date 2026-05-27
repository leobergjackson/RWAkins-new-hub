// Built by vsrupeshkumar
// Server-side Ed25519 keypair + signer for policy decisions.
//
// The private key lives in module scope on the Node runtime — every Next.js
// API route on the same server instance shares it. The public key is exposed
// at /api/agents/policy/pubkey so anyone can verify signatures externally.
//
// Each Decision is signed over a canonical message: "${id}|${allowed}|${decidedAt}".
// That message is reconstructable from the persisted Decision object, so an
// auditor can replay every decision and verify its signature offline.
import crypto from 'node:crypto'

// One keypair per process. Generated at module load; persists for the
// lifetime of the function instance. On Vercel a cold start regenerates,
// which means signatures from before-and-after the cold start use different
// keys — acceptable for hackathon-grade demos, swap to a persistent KMS key
// in production.
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')

export function getPublicKeySpkiBase64(): string {
  return publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
}

export function getPublicKeyPem(): string {
  return publicKey.export({ type: 'spki', format: 'pem' }) as string
}

export function signDecision(message: string): string {
  const sig = crypto.sign(null, Buffer.from(message, 'utf8'), privateKey)
  return sig.toString('base64')
}

export function verifyDecision(message: string, signatureBase64: string): boolean {
  try {
    return crypto.verify(null, Buffer.from(message, 'utf8'), publicKey, Buffer.from(signatureBase64, 'base64'))
  } catch {
    return false
  }
}

/** Stable identifier for a request — hash of canonical fields. */
export function requestId(input: {
  agentType: string
  action: string
  amountUSD?: number
  proposedAt: number
}): string {
  const canonical = `${input.agentType}|${input.action}|${input.amountUSD ?? 0}|${input.proposedAt}`
  const h = crypto.createHash('sha256').update(canonical).digest('hex')
  return h.slice(0, 24) // 96 bits of entropy, short enough for UI display
}
