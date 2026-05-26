// Built by vsrupeshkumar
// Pinata IPFS upload — pins an encrypted blob to IPFS and returns its CID.
// Server-side only so PINATA_JWT never leaks to the browser.
//
// Called by /legacy/upload after AES-GCM client-side encryption: the
// encrypted blob is uploaded to IPFS, the CID is stored on-chain as the
// vault's payload reference.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PINATA_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
const FETCH_TIMEOUT_MS = 30_000  // file uploads can be slow

export type PinataResponse = {
  cid: string
  size: number
  timestamp: string
  gatewayUrl: string
}

export async function POST(req: Request) {
  const jwt = process.env.PINATA_JWT
  if (!jwt) {
    return NextResponse.json({ error: 'PINATA_JWT not configured' }, { status: 503 })
  }
  // Sanity check — Pinata JWTs start with 'eyJ' and are ~200+ chars.
  // If the value is clearly wrong, fail fast with a useful message.
  if (!jwt.startsWith('eyJ') || jwt.length < 100) {
    return NextResponse.json({
      error: 'PINATA_JWT looks malformed (should start with "eyJ" and be ~200+ chars). Copy the JWT — not the API Key — from Pinata dashboard → API Keys.',
    }, { status: 503 })
  }

  // The browser sends the encrypted blob as multipart/form-data with the
  // 'file' field. We pass it straight through to Pinata.
  let upstreamForm: FormData
  try {
    const incoming = await req.formData()
    const file = incoming.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'no file uploaded (expected multipart field "file")' }, { status: 400 })
    }
    upstreamForm = new FormData()
    upstreamForm.append('file', file)
    // Optional metadata
    const name = incoming.get('name')
    if (typeof name === 'string' && name) {
      upstreamForm.append('pinataMetadata', JSON.stringify({ name }))
    }
    upstreamForm.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'invalid form' }, { status: 400 })
  }

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(PINATA_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${jwt}` },
      body: upstreamForm,
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      return NextResponse.json({ error: `Pinata HTTP ${res.status}: ${txt.slice(0, 200)}` }, { status: 502 })
    }
    const json = await res.json() as { IpfsHash: string; PinSize: number; Timestamp: string }
    const payload: PinataResponse = {
      cid: json.IpfsHash,
      size: json.PinSize,
      timestamp: json.Timestamp,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${json.IpfsHash}`,
    }
    return NextResponse.json(payload)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'network' }, { status: 504 })
  } finally {
    clearTimeout(t)
  }
}
