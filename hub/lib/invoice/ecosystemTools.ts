export interface EcoTool {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  href: string; // internal hub route
  previewTitle: string;
  previewDesc: string;
  stats: { label: string; value: string }[];
  connects: string;
}

export const ECO_TOOLS: EcoTool[] = [
  {
    id: 'credit',
    name: 'Credit Passport',
    tagline: 'On-chain credit scoring',
    icon: 'Shield',
    color: '#F59E0B',
    href: '/credit',
    previewTitle: 'Your On-Chain Credit Score',
    previewDesc: 'Every USDC invoice you receive builds your on-chain credit history. Get a soulbound NFT credit score that unlocks better lending rates.',
    stats: [
      { label: 'Score Range', value: '300–850' },
      { label: 'NFT Type', value: 'Soulbound' },
      { label: 'Chain', value: 'Mantle Network' },
    ],
    connects: 'Invoice payments build your credit score',
  },
  {
    id: 'lend',
    name: 'AI Lending',
    tagline: 'Borrow against your USDC',
    icon: 'TrendingUp',
    color: '#10B981',
    href: '/lend',
    previewTitle: 'Instant Liquidity on Your USDC',
    previewDesc: 'Use your credit score to unlock undercollateralized loans. AI agents negotiate the best rates automatically.',
    stats: [
      { label: 'Gold Tier', value: '6.8% APR' },
      { label: 'Platinum', value: '4.2% APR' },
      { label: 'Max LTV', value: '85%' },
    ],
    connects: 'Use received USDC as collateral',
  },
  {
    id: 'split',
    name: 'Bill Split',
    tagline: 'Split invoices on-chain',
    icon: 'Split',
    color: '#8B5CF6',
    href: '/split',
    previewTitle: 'Split Any Invoice Instantly',
    previewDesc: 'Working with multiple clients? Split the invoice amount automatically via Mantle smart contracts.',
    stats: [
      { label: 'Network', value: 'Mantle' },
      { label: 'Settlement', value: 'Instant' },
      { label: 'Parties', value: 'Up to 10' },
    ],
    connects: 'Split invoice payments between multiple parties',
  },
  {
    id: 'treasury',
    name: 'Yield Hub',
    tagline: 'Earn yield on your USDC',
    icon: 'Zap',
    color: '#F97316',
    href: '/treasury',
    previewTitle: 'Put Your USDC to Work',
    previewDesc: 'AI agents automatically move your USDC into the highest-yielding protocols. Set it and forget it.',
    stats: [
      { label: 'Avg APY', value: '8–15%' },
      { label: 'Strategy', value: 'Auto' },
      { label: 'Chain', value: 'Mantle Sepolia' },
    ],
    connects: 'Auto-compound USDC after receiving payment',
  },
  {
    id: 'vault',
    name: 'Private Vault',
    tagline: 'Secure cross-chain assets',
    icon: 'Lock',
    color: '#06B6D4',
    href: '/vault',
    previewTitle: 'Bank-Grade Asset Security',
    previewDesc: 'Store and protect your USDC earnings in a private vault with zero transaction metadata exposed.',
    stats: [
      { label: 'Encryption', value: 'AES-GCM' },
      { label: 'Chain', value: 'Mantle Network' },
      { label: 'Privacy', value: 'Full' },
    ],
    connects: 'Secure your USDC earnings privately',
  },
  {
    id: 'agents',
    name: 'AI Agents',
    tagline: 'Automate your finances',
    icon: 'Bot',
    color: '#EC4899',
    href: '/agents',
    previewTitle: 'AI Agents Working For You',
    previewDesc: 'Deploy AI agents that automatically manage your invoices, follow up on payments, and optimize your DeFi positions.',
    stats: [
      { label: 'Active', value: '3 Agents' },
      { label: 'Network', value: 'Mantle' },
      { label: 'Actions', value: 'On-chain' },
    ],
    connects: 'Agents auto-follow-up on unpaid invoices',
  },
  {
    id: 'legacy',
    name: 'Family Vault',
    tagline: 'Encrypted inheritance',
    icon: 'Heart',
    color: '#EF4444',
    href: '/legacy',
    previewTitle: 'Protect Your Earnings Forever',
    previewDesc: 'Store important documents and pass USDC earnings to heirs securely with on-chain inheritance protocols.',
    stats: [
      { label: 'Encryption', value: 'AES-GCM' },
      { label: 'Access', value: 'On-chain' },
      { label: 'Storage', value: 'IPFS' },
    ],
    connects: 'Secure invoice earnings for inheritance',
  },
  {
    id: 'shadow',
    name: 'Stealth Suite',
    tagline: 'Private enterprise ops',
    icon: 'EyeOff',
    color: '#6B7280',
    href: '/shadow',
    previewTitle: 'Invisible Enterprise Operations',
    previewDesc: '7 specialized AI agents handle CFO, Payroll, Compliance, and Tax autonomously with full privacy.',
    stats: [
      { label: 'AI Agents', value: '7' },
      { label: 'Operations', value: 'Autonomous' },
      { label: 'Privacy', value: 'Full stealth' },
    ],
    connects: 'Process invoices with full privacy',
  },
];
