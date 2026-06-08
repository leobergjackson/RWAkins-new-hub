// Built by vsrupeshkumar
// Mantle contract utilities — ABI encoding, decoding, formatting

export function encodeAddress(address: string): string {
  const clean = address.startsWith('0x') ? address.slice(2) : address
  return clean.toLowerCase().padStart(64, '0')
}

export function decodeUint256(hex: string): bigint {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  return BigInt('0x' + (clean || '0'))
}

export function formatTokenAmount(raw: bigint, decimals: number): string {
  if (raw === BigInt(0)) return '0.00'
  const divisor = BigInt(10) ** BigInt(decimals)
  const whole = raw / divisor
  const fraction = raw % divisor
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 2)
  return `${whole.toLocaleString('en-US')}.${fractionStr}`
}

export async function ethCall(
  rpcUrl: string,
  to: string,
  data: string
): Promise<string> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.result as string
}
