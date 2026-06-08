// Built by vsrupeshkumar
// Raw JSON-RPC reads for LegacyVault on Mantle Network — no ethers/viem dependency.

const QIE_RPC = 'https://rpc.qie.digital'
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_LEGACY_VAULT_ADDRESS || ''

// Precomputed keccak256 function selectors (computed via ethers.keccak256):
//   owner()           → keccak256("owner()")           = 0x8da5cb5b
//   deceased()        → keccak256("deceased()")        = 0x72faf2d9
//   unlockTimestamp() → keccak256("unlockTimestamp()") = 0xaa082a9d
//   canAccess(address)→ keccak256("canAccess(address)")= 0x18a9d222
const SEL = {
  owner:           '0x8da5cb5b',
  deceased:        '0x72faf2d9',
  unlockTimestamp: '0xaa082a9d',
  canAccess:       '0x18a9d222',
} as const

async function ethCall(calldata: string, timeoutMs = 5000): Promise<string | null> {
  if (!VAULT_ADDRESS) return null
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(QIE_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: VAULT_ADDRESS, data: calldata }, 'latest'],
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.error) return null
    return json.result as string
  } catch { return null }
  finally { clearTimeout(t) }
}

function decodeAddress(hex: string): string {
  return '0x' + hex.slice(-40)
}

function decodeBool(hex: string): boolean {
  return (BigInt(hex) & BigInt(1)) === BigInt(1)
}

function padAddress(address: string): string {
  return '000000000000000000000000' + address.replace('0x', '').toLowerCase()
}

export type LegacyVaultState = {
  vaultAddress: string
  owner: string
  deceased: boolean
  unlockTimestamp: bigint
  unlockDate: Date | null
  canAccess: boolean | null
  isLive: true
}

export async function readLegacyVault(userAddress?: string): Promise<LegacyVaultState | null> {
  if (!VAULT_ADDRESS) return null
  try {
    const [ownerHex, deceasedHex, tsHex, accessHex] = await Promise.all([
      ethCall(SEL.owner),
      ethCall(SEL.deceased),
      ethCall(SEL.unlockTimestamp),
      userAddress
        ? ethCall(SEL.canAccess + padAddress(userAddress))
        : Promise.resolve(null),
    ])
    if (!ownerHex || !deceasedHex || !tsHex) return null
    const unlockTs = BigInt(tsHex)
    return {
      vaultAddress: VAULT_ADDRESS,
      owner: decodeAddress(ownerHex),
      deceased: decodeBool(deceasedHex),
      unlockTimestamp: unlockTs,
      unlockDate: unlockTs > BigInt(0) ? new Date(Number(unlockTs) * 1000) : null,
      canAccess: accessHex !== null ? decodeBool(accessHex) : null,
      isLive: true,
    }
  } catch { return null }
}
