// Built by vsrupeshkumar
// Raw JSON-RPC + ABI encoding helpers for QIE Mainnet contract calls.
// No ethers.js — pure fetch plus a self-contained keccak-256 implementation
// (Ethereum variant, 0x01 domain padding).

const QIE_RPC = 'https://mainnet.qie.digital/api/eth-rpc'

// ─── keccak-256 ──────────────────────────────────────────────────────────────

// BigInt literal syntax (123n) requires an ES2020 target; this project targets
// ES2017, so every 64-bit constant is built with the BigInt() constructor.
const MASK64 = (BigInt(1) << BigInt(64)) - BigInt(1)

const RC: bigint[] = [
  '0x0000000000000001', '0x0000000000008082', '0x800000000000808A', '0x8000000080008000',
  '0x000000000000808B', '0x0000000080000001', '0x8000000080008081', '0x8000000000008009',
  '0x000000000000008A', '0x0000000000000088', '0x0000000080008009', '0x000000008000000A',
  '0x000000008000808B', '0x800000000000008B', '0x8000000000008089', '0x8000000000008003',
  '0x8000000000008002', '0x8000000000000080', '0x000000000000800A', '0x800000008000000A',
  '0x8000000080008081', '0x8000000000008080', '0x0000000080000001', '0x8000000080008008',
].map((h) => BigInt(h))
const ROTC = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44]
const PILN = [10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4, 15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1]

function rotl64(x: bigint, n: number): bigint {
  const b = BigInt(n)
  return ((x << b) | (x >> (BigInt(64) - b))) & MASK64
}

function keccakF(s: bigint[]): void {
  const bc = new Array<bigint>(5)
  for (let round = 0; round < 24; round++) {
    // theta
    for (let i = 0; i < 5; i++) bc[i] = s[i] ^ s[i + 5] ^ s[i + 10] ^ s[i + 15] ^ s[i + 20]
    for (let i = 0; i < 5; i++) {
      const t = bc[(i + 4) % 5] ^ rotl64(bc[(i + 1) % 5], 1)
      for (let j = 0; j < 25; j += 5) s[j + i] ^= t
    }
    // rho + pi
    let t = s[1]
    for (let i = 0; i < 24; i++) {
      const j = PILN[i]
      const tmp = s[j]
      s[j] = rotl64(t, ROTC[i])
      t = tmp
    }
    // chi
    for (let j = 0; j < 25; j += 5) {
      for (let i = 0; i < 5; i++) bc[i] = s[j + i]
      for (let i = 0; i < 5; i++) s[j + i] = bc[i] ^ ((~bc[(i + 1) % 5] & MASK64) & bc[(i + 2) % 5])
    }
    // iota
    s[0] ^= RC[round]
  }
}

export function keccak256(msg: Uint8Array): Uint8Array {
  const RATE = 136 // bytes (1088-bit rate, 512-bit capacity)
  const s: bigint[] = new Array(25).fill(BigInt(0))
  const padLen = RATE - (msg.length % RATE)
  const padded = new Uint8Array(msg.length + padLen)
  padded.set(msg)
  padded[msg.length] ^= 0x01           // domain suffix
  padded[padded.length - 1] ^= 0x80    // final block marker

  for (let off = 0; off < padded.length; off += RATE) {
    for (let i = 0; i < RATE / 8; i++) {
      let lane = BigInt(0)
      for (let b = 0; b < 8; b++) lane |= BigInt(padded[off + i * 8 + b]) << BigInt(8 * b)
      s[i] ^= lane
    }
    keccakF(s)
  }

  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    out[i] = Number((s[i >> 3] >> BigInt(8 * (i & 7))) & BigInt(0xff))
  }
  return out
}

// ─── ABI encoding ────────────────────────────────────────────────────────────

function toHex(bytes: Uint8Array): string {
  let h = ''
  for (const b of bytes) h += b.toString(16).padStart(2, '0')
  return h
}

/** Pads an EVM address to a 32-byte (64 hex char) ABI word. */
export function encodeAddress(address: string): string {
  return address.toLowerCase().replace(/^0x/, '').padStart(64, '0')
}

/** Encodes a non-negative integer (decimal string or bigint) to a 32-byte word. */
function encodeUint(value: string | bigint): string {
  return BigInt(value).toString(16).padStart(64, '0')
}

/**
 * Encodes a contract call to hex calldata.
 *   encodeCall('getCreditScore(address)', '0xabc...') -> '0x<selector><arg>'
 * Args that look like an address are ABI-encoded as address, everything else
 * is treated as a uint256 (pass wei/base-unit decimal strings).
 */
export function encodeCall(functionSignature: string, ...args: string[]): string {
  const sigBytes = new TextEncoder().encode(functionSignature)
  const selector = toHex(keccak256(sigBytes)).slice(0, 8)
  let data = '0x' + selector
  for (const arg of args) {
    if (/^0x[0-9a-fA-F]{40}$/.test(arg)) data += encodeAddress(arg)
    else data += encodeUint(arg)
  }
  return data
}

/** Decodes the first 32-byte word of a hex result to a bigint. */
export function decodeUint256(hex: string): bigint {
  const clean = hex.replace(/^0x/, '')
  if (!clean) return BigInt(0)
  return BigInt('0x' + clean.slice(0, 64).padEnd(64, '0'))
}

/** Splits a hex result into its 32-byte words as bigints. */
export function decodeWords(hex: string): bigint[] {
  const clean = hex.replace(/^0x/, '')
  const words: bigint[] = []
  for (let i = 0; i < clean.length; i += 64) {
    words.push(BigInt('0x' + clean.slice(i, i + 64).padEnd(64, '0')))
  }
  return words
}

// ─── JSON-RPC ────────────────────────────────────────────────────────────────

/** Read-only contract call against the QIE Mainnet RPC. Returns the result hex. */
export async function ethCall(contractAddress: string, encodedData: string): Promise<string> {
  const res = await fetch(QIE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: contractAddress, data: encodedData }, 'latest'],
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || 'eth_call failed')
  return json.result as string
}
