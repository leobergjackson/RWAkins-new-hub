// Content rebrand for the Turing Test (Mantle) submission.
// SAFE single-word handling: a word is only replaced when it is NOT part of a
// larger identifier (camelCase/PascalCase/snake) — the negative look-behind/ahead
// on identifier chars leaves `solanaSlot`, `getStellarBoost`, `ArbitrumActivity`
// and `@/components/ui/ArbitrumActivity` untouched. Verified with `tsc --noEmit`.
//
// 'QIE' is intentionally NOT auto-replaced (it doubles as a ChainType literal);
// analytics/page.tsx is skipped (its chart keys are structural). Both hand-fixed.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, sep } from 'node:path';

const ROOTS = ['hub/app', 'hub/components', 'hub/lib'];
const EXTS = new Set(['.ts', '.tsx']);
const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__']);
const SKIP_FILES = new Set(['hub/app/analytics/page.tsx']); // forward-slash relative

const PHRASES = [
  ['Arbitrum Sepolia Devnet', 'Mantle Sepolia'],
  ['Arbitrum Sepolia', 'Mantle Sepolia'],
  ['Arbitrum Mainnet', 'Mantle Network'],
  ['Arbitrum Testnet', 'Mantle Sepolia'],
  ['Arbitrum Gateway', 'Mantle Gateway'],
  ['Arbitrum One', 'Mantle Network'],
  ['Arbitrum-native', 'Mantle-native'],
  ['QIE Mainnet', 'Mantle Network'],
  ['Solana Devnet', 'Mantle Sepolia'],
  ['Solana Agent', 'Mantle Agent'],
  ['Stellar Testnet', 'Mantle Sepolia'],
  ['Stellar Soroban', 'Mantle'],
  ['Phantom (Solana)', 'MetaMask (Mantle)'],
  ['Freighter (Stellar)', 'WalletConnect (Mantle)'],
  ['View on Arbiscan', 'View on Mantle Explorer'],
  ['Arbiscan', 'Mantle Explorer'],
  ['Ruphex', 'Kubryx'],
];

const URLS = [
  ['mainnet.qie.digital', 'explorer.sepolia.mantle.xyz'],
  ['mainnet.qie.info', 'explorer.sepolia.mantle.xyz'],
  ['explorer.solana.com', 'explorer.sepolia.mantle.xyz'],
  ['stellar.expert/explorer/testnet', 'explorer.sepolia.mantle.xyz'],
  ['sepolia.arbiscan.io', 'sepolia.mantlescan.xyz'],
  ['arbiscan.io', 'mantlescan.xyz'],
  ['arb1.arbitrum.io/rpc', 'rpc.sepolia.mantle.xyz'],
  ['api.devnet.solana.com', 'rpc.sepolia.mantle.xyz'],
  ['horizon-testnet.stellar.org', 'rpc.sepolia.mantle.xyz'],
];

// Standalone capitalized words only (identifier-safe).
const WORDS = [['Solana', 'Mantle'], ['Stellar', 'Mantle'], ['Arbitrum', 'Mantle']];
const wordRegexes = WORDS.map(([from, to]) => [
  new RegExp(`(?<![A-Za-z0-9_])${from}(?![A-Za-z0-9_])`, 'g'),
  to,
]);
// QIE display strings only: guard quotes, dots AND a trailing colon so the 'QIE'
// ChainType literal, `blocks.QIE` access, and bare `QIE:` object keys are all
// preserved; only prose/JSX "QIE" changes.
wordRegexes.push([/(?<![A-Za-z0-9_'".])QIE(?![A-Za-z0-9_'".:])/g, 'Mantle']);

// Solana-ecosystem demo terms → Mantle-native equivalents (the hackathon names
// Merchant Moe & Agni Finance as Mantle DeFi). Word-boundary so 'SOLANA' (a
// ChainType literal) and identifiers are untouched.
const ECO = [
  [/\bRaydium\b/g, 'Merchant Moe'],
  [/\bOrca\b/g, 'Agni Finance'],
  [/\bJupiter\b/g, 'FusionX'],
  [/\bKamino\b/g, 'Lendle'],
  [/\bJito\b/g, 'Init Capital'],
  [/\bPUSD\b/g, 'USDC'],
  [/\bSOL\b/g, 'MNT'],
  // Stellar (Soroban) leftovers in the Split tool. Phrases first.
  [/\bSoroban Testnet\b/g, 'Mantle Sepolia'],
  [/\bSoroban-powered\b/g, 'Mantle-powered'],
  [/\bSoroban smart escrow\b/g, 'on-chain smart escrow'],
  [/\bSoroban · Mantle\b/g, 'Smart Escrow · Mantle'],
  [/\bSoroban\b/g, 'Mantle'],
  [/\bXLM\b/g, 'MNT'],
];
for (const r of ECO) wordRegexes.push(r);

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(p))) out.push(p);
  }
}

const files = [];
for (const r of ROOTS) walk(r, files);

let changed = 0;
let edits = 0;
for (const f of files) {
  const rel = f.split(sep).join('/');
  if (SKIP_FILES.has(rel)) continue;
  let src = readFileSync(f, 'utf8');
  const before = src;
  for (const [from, to] of [...PHRASES, ...URLS]) {
    const parts = src.split(from);
    if (parts.length > 1) { edits += parts.length - 1; src = parts.join(to); }
  }
  for (const [re, to] of wordRegexes) {
    src = src.replace(re, () => { edits++; return to; });
  }
  if (src !== before) { writeFileSync(f, src); changed++; }
}
console.log(`Scanned ${files.length} files. Modified ${changed}. Total replacements: ${edits}.`);
