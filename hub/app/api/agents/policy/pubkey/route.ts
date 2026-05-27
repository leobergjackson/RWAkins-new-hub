// Built by vsrupeshkumar
// Public Ed25519 key that signs every policy decision. Anyone can fetch this
// and verify Decision signatures offline using standard Ed25519 verify.
import { NextResponse } from 'next/server'
import { getPublicKeyPem, getPublicKeySpkiBase64 } from '@/lib/policy-signer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return NextResponse.json({
    algorithm: 'Ed25519',
    spkiBase64: getPublicKeySpkiBase64(),
    pem: getPublicKeyPem(),
    instructions:
      'Verify a Decision: reconstruct canonical message as `${id}|${allowed}|${decidedAt}`, ' +
      'then verify(message, base64-decode(signature)) using this Ed25519 SPKI public key.',
  })
}
