// ============================================================
// Colibrí Demo Data — realistic fallback data for all pages
// ============================================================

// ---- Dashboard ----
export const demoAgentStatus = {
  mood: { moodType: "optimistic" as const, name: "Optimistic", multiplier: 1.2, reason: "Treasury healthy — Base route 42% cheaper than Arbitrum" },
  balance: "$12,847.32",
  online: true,
  stats: {
    tipsSent: { value: 247, trend: [180, 195, 210, 220, 228, 240, 247] },
    activeEscrows: { value: 12, trend: [8, 9, 11, 10, 13, 11, 12] },
    creatorsTracked: { value: 89, trend: [72, 75, 78, 81, 84, 87, 89] },
    cyclesRun: { value: 1834, trend: [1650, 1700, 1740, 1770, 1800, 1820, 1834] },
  },
  pulse: { liquidity: 78, diversification: 85, velocity: 62, healthScore: 91 },
};

export const demoActivity = [
  { id: 1, type: "tip", message: "Transfer $200.00 USDC → María García (SPEI deposit)", chain: "Base", time: "2m ago" },
  { id: 2, type: "tip", message: "Transfer $350.00 USDC → Carlos López (SPEI deposit)", chain: "Arbitrum", time: "4m ago" },
  { id: 3, type: "escrow", message: "Remittance #R-0047 settled — MXN 3,412.50 delivered", chain: "Base", time: "5m ago" },
  { id: 4, type: "reasoning", message: "Consensus: approve transfer cycle #1834", chain: "", time: "8m ago" },
  { id: 5, type: "swap", message: "ROUTER: switched to Base — saved $0.03 in fees", chain: "Base", time: "12m ago" },
  { id: 6, type: "security", message: "Blocked suspicious transfer — anomaly 0.92", chain: "", time: "15m ago" },
  { id: 7, type: "tip", message: "Transfer $125.00 USDC → Ana Martínez (SPEI deposit)", chain: "Base", time: "17m ago" },
  { id: 8, type: "escrow", message: "Remittance #R-0044 confirmed by recipient", chain: "Arbitrum", time: "22m ago" },
  { id: 9, type: "lending", message: "Treasury rebalanced — $500 USDC to Base liquidity pool", chain: "Base", time: "28m ago" },
  { id: 10, type: "tip", message: "Transfer $80.00 USDC → Luis Hernández (SPEI deposit)", chain: "Base", time: "35m ago" },
  { id: 11, type: "reasoning", message: "Guardian veto: daily limit exceeded", chain: "", time: "41m ago" },
  { id: 12, type: "swap", message: "Discovery: recipient KYC verified — MXN account on file", chain: "", time: "48m ago" },
  { id: 13, type: "tip", message: "Transfer $200.00 USDC → Rosa Jiménez (SPEI deposit)", chain: "Base", time: "55m ago" },
  { id: 14, type: "escrow", message: "Remittance #R-0041 refunded — recipient unverified", chain: "Base", time: "1h ago" },
  { id: 15, type: "security", message: "Policy: daily transfer limit set to $600 USDC", chain: "", time: "1h ago" },
  { id: 16, type: "dca", message: "Treasury: USDC liquidity replenished on Base", chain: "Base", time: "2h ago" },
];

// ---- Supported Assets ----
export const SUPPORTED_TOKENS = [
  { id: "usdc", label: "USDC", name: "USD Coin", decimals: 6, color: "#2775CA" },
  { id: "mxn", label: "MXN", name: "Mexican Peso", decimals: 2, color: "#006847" },
  { id: "eth", label: "ETH", name: "Ether (gas)", decimals: 18, color: "#627EEA" },
] as const;

// ---- Wallets ----
export const demoWallets = [
  { chain: "Arbitrum", symbol: "ARB", address: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0", usdt: "7,451.32", xaut: "0.000", usat: "0.00", native: "0.421", nativeSymbol: "ETH", color: "#28A0F0", status: "active" },
  { chain: "Base", symbol: "BASE", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28", usdt: "5,396.00", xaut: "0.000", usat: "0.00", native: "0.182", nativeSymbol: "ETH", color: "#0052FF", status: "active" },
];

// ---- Recipients (Verified MXN Recipients) ----
export interface RumbleCreator {
  id: number;
  name: string;
  handle: string;
  platform: string;
  subscribers: string;
  videoCount: number;
  totalViews: string;
  tier: "Diamond" | "Platinum" | "Gold" | "Silver" | "Bronze";
  engagement: number;
  engagementScore: number;
  tips: number;
  avatar: string;
  avatarUrl: string;
  recentVideoTitles: string[];
  joinedYear: number;
  verified: boolean;
}

export const demoCreators: RumbleCreator[] = [
  {
    id: 1,
    name: "Dan Bongino",
    handle: "Bongino",
    platform: "Rumble",
    subscribers: "4.1M",
    videoCount: 2840,
    totalViews: "1.8B",
    tier: "Diamond",
    engagement: 96,
    engagementScore: 96,
    tips: 124,
    avatar: "DB",
    avatarUrl: "https://sp.rmbl.ws/z0/Bongino-uhqag.jpeg",
    recentVideoTitles: [
      "The Dan Bongino Show - LIVE",
      "They Just Got Caught Red-Handed",
      "This Changes Everything We Know",
    ],
    joinedYear: 2020,
    verified: true,
  },
  {
    id: 2,
    name: "Tucker Carlson",
    handle: "TuckerCarlson",
    platform: "Rumble",
    subscribers: "3.2M",
    videoCount: 620,
    totalViews: "1.2B",
    tier: "Diamond",
    engagement: 94,
    engagementScore: 94,
    tips: 98,
    avatar: "TC",
    avatarUrl: "https://sp.rmbl.ws/z0/TuckerCarlson-uhqag.jpeg",
    recentVideoTitles: [
      "Tucker Carlson: The Interview They Tried to Stop",
      "What They Are Not Telling You About the Economy",
      "The Real Story Behind the Headlines",
    ],
    joinedYear: 2023,
    verified: true,
  },
  {
    id: 3,
    name: "Steven Crowder",
    handle: "StevenCrowder",
    platform: "Rumble",
    subscribers: "2.1M",
    videoCount: 3150,
    totalViews: "920M",
    tier: "Diamond",
    engagement: 91,
    engagementScore: 91,
    tips: 76,
    avatar: "SC",
    avatarUrl: "https://sp.rmbl.ws/z0/StevenCrowder-uhqag.jpeg",
    recentVideoTitles: [
      "Louder with Crowder LIVE!",
      "Change My Mind: Free Speech Edition",
      "Mug Club Exclusive - Undercover Investigation",
    ],
    joinedYear: 2021,
    verified: true,
  },
  {
    id: 4,
    name: "Russell Brand",
    handle: "RussellBrand",
    platform: "Rumble",
    subscribers: "2.0M",
    videoCount: 1480,
    totalViews: "680M",
    tier: "Platinum",
    engagement: 88,
    engagementScore: 88,
    tips: 62,
    avatar: "RB",
    avatarUrl: "https://sp.rmbl.ws/z0/RussellBrand-uhqag.jpeg",
    recentVideoTitles: [
      "Stay Free with Russell Brand",
      "They Want You Distracted - Here Is Why",
      "The Spiritual Revolution Is Happening Now",
    ],
    joinedYear: 2022,
    verified: true,
  },
  {
    id: 5,
    name: "Tim Pool",
    handle: "TimPool",
    platform: "Rumble",
    subscribers: "1.5M",
    videoCount: 4200,
    totalViews: "750M",
    tier: "Platinum",
    engagement: 85,
    engagementScore: 85,
    tips: 54,
    avatar: "TP",
    avatarUrl: "https://sp.rmbl.ws/z0/TimPool-uhqag.jpeg",
    recentVideoTitles: [
      "Timcast IRL - LIVE Panel Discussion",
      "Media Blackout on the Biggest Story of the Year",
      "The Culture War Is Heating Up",
    ],
    joinedYear: 2021,
    verified: true,
  },
  {
    id: 6,
    name: "Redacted (Clayton Morris)",
    handle: "Redacted",
    platform: "Rumble",
    subscribers: "1.0M",
    videoCount: 1920,
    totalViews: "410M",
    tier: "Gold",
    engagement: 82,
    engagementScore: 82,
    tips: 41,
    avatar: "RD",
    avatarUrl: "https://sp.rmbl.ws/z0/Redacted-uhqag.jpeg",
    recentVideoTitles: [
      "Redacted LIVE - Breaking News They Do Not Want You to See",
      "Whistleblower Drops Bombshell Report",
      "This Is Bigger Than We Thought",
    ],
    joinedYear: 2022,
    verified: true,
  },
  {
    id: 7,
    name: "Glenn Beck",
    handle: "GlennBeck",
    platform: "Rumble",
    subscribers: "820K",
    videoCount: 2600,
    totalViews: "340M",
    tier: "Gold",
    engagement: 78,
    engagementScore: 78,
    tips: 33,
    avatar: "GB",
    avatarUrl: "https://sp.rmbl.ws/z0/GlennBeck-uhqag.jpeg",
    recentVideoTitles: [
      "The Glenn Beck Program - Full Episode",
      "A History Lesson They Erased from the Books",
      "Warning: The Next Crisis Is Already Here",
    ],
    joinedYear: 2021,
    verified: true,
  },
  {
    id: 8,
    name: "Dinesh D'Souza",
    handle: "DineshDSouza",
    platform: "Rumble",
    subscribers: "610K",
    videoCount: 980,
    totalViews: "190M",
    tier: "Silver",
    engagement: 72,
    engagementScore: 72,
    tips: 22,
    avatar: "DD",
    avatarUrl: "https://sp.rmbl.ws/z0/DineshDSouza-uhqag.jpeg",
    recentVideoTitles: [
      "The Dinesh D'Souza Podcast",
      "Why They Fear This Film",
      "The Debate No One Expected",
    ],
    joinedYear: 2021,
    verified: true,
  },
];

// ---- Transfers ----
export const demoTipHistory = [
  { id: 1, date: "2025-03-22 14:32", recipient: "María García", amount: "200.00", token: "USDC", chain: "Base", status: "confirmed", txHash: "0xabc123def456789012345678901234567890abcd" },
  { id: 2, date: "2025-03-22 13:18", recipient: "Carlos López", amount: "500.00", token: "USDC", chain: "Arbitrum", status: "confirmed", txHash: "0xdef456789012345678901234567890abcdef1234" },
  { id: 3, date: "2025-03-22 12:05", recipient: "Ana Martínez", amount: "125.00", token: "USDC", chain: "Base", status: "confirmed", txHash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12" },
  { id: 4, date: "2025-03-22 10:47", recipient: "Rosa Jiménez", amount: "200.00", token: "USDC", chain: "Base", status: "confirmed", txHash: "0x5KtP8n9V2mX3rW4qY6sZ7uT8aB9cD0eF1gH2iJ3" },
  { id: 5, date: "2025-03-22 09:22", recipient: "Luis Hernández", amount: "80.00", token: "USDC", chain: "Base", status: "confirmed", txHash: "0x789012345678901234567890abcdef1234567890" },
  { id: 6, date: "2025-03-21 22:15", recipient: "Elena Torres", amount: "300.00", token: "USDC", chain: "Arbitrum", status: "confirmed", txHash: "0x567890abcdef123456789012345678901234abcd" },
  { id: 7, date: "2025-03-21 18:30", recipient: "Miguel Reyes", amount: "150.00", token: "USDC", chain: "Base", status: "pending", txHash: "0xabcdef123456789012345678901234567890abcd" },
  { id: 8, date: "2025-03-21 15:42", recipient: "Isabel Flores", amount: "250.00", token: "USDC", chain: "Arbitrum", status: "confirmed", txHash: "0x345678901234567890abcdef12345678901234ab" },
  { id: 9, date: "2025-03-21 12:10", recipient: "Jorge Morales", amount: "100.00", token: "USDC", chain: "Base", status: "failed", txHash: "0x901234567890abcdef123456789012345678abcd" },
  { id: 10, date: "2025-03-21 09:55", recipient: "Patricia Díaz", amount: "175.00", token: "USDC", chain: "Base", status: "confirmed", txHash: "0x8LuQ9nR0sT1uV2wX3yZ4aB5cD6eF7gH8iJ9kL0m" },
];

// ---- Remittance Settlements ----
export const demoEscrowStats = { created: 47, claimed: 32, refunded: 8, locked: 7 };
export const demoEscrows = [
  { id: "R-0047", recipient: "María García", amount: "200.00", chain: "Base", status: "locked", timeLeft: 7200, createdAt: "2h ago" },
  { id: "R-0046", recipient: "Carlos López", amount: "500.00", chain: "Arbitrum", status: "locked", timeLeft: 3600, createdAt: "3h ago" },
  { id: "R-0045", recipient: "Ana Martínez", amount: "125.00", chain: "Base", status: "locked", timeLeft: 14400, createdAt: "5h ago" },
  { id: "R-0044", recipient: "Rosa Jiménez", amount: "200.00", chain: "Arbitrum", status: "claimed", timeLeft: 0, createdAt: "6h ago" },
  { id: "R-0043", recipient: "Luis Hernández", amount: "80.00", chain: "Base", status: "locked", timeLeft: 21600, createdAt: "8h ago" },
  { id: "R-0042", recipient: "Elena Torres", amount: "300.00", chain: "Arbitrum", status: "locked", timeLeft: 10800, createdAt: "10h ago" },
  { id: "R-0041", recipient: "Miguel Reyes", amount: "150.00", chain: "Base", status: "refunded", timeLeft: 0, createdAt: "12h ago" },
];

// ---- Reasoning ----
export const demoReasoningSteps = [
  { type: "thought", label: "Analysis", content: "Analyzing treasury state across Arbitrum + Base...", confidence: 15, source: "Treasury Agent" },
  { type: "thought", label: "Insight", content: "USDC liquidity: 85% on Base — above threshold. Arbitrum reserve healthy at 58%.", confidence: 28, source: "Risk Engine" },
  { type: "observation", label: "Observation", content: "Discovery: recipient María García — KYC verified, SPEI account on file.", confidence: 42, source: "Discovery Agent" },
  { type: "reflection", label: "Deliberation", content: "Router votes: Base ($0.01 fee). Treasury votes: approve. Guardian votes: approve.", confidence: 58, source: "Consensus Engine" },
  { type: "action", label: "Decision", content: "4/4 council approves. Route: Base. Guardian review: APPROVED.", confidence: 75, source: "Guardian Agent" },
  { type: "thought", label: "Execution", content: "Bridging $200 USDC on Base → Bitso SPEI off-ramp. Settlement in ~90s.", confidence: 85, source: "Router Agent" },
  { type: "decision", label: "Complete", content: "Transfer settled. TX: 0xabc...def. Fee: $0.01. MXN 3,412.50 deposited via SPEI.", confidence: 97, source: "Chain Monitor" },
];

// ---- Demo ----
export const demoSteps = [
  { id: 1, name: "Initialize Agent", description: "Boot Colibrí with USDC treasury", result: "Agent initialized with Arbitrum + Base wallets" },
  { id: 2, name: "Connect Networks", description: "Establish connections to Arbitrum + Base", result: "Connected: Arbitrum One, Base — USDC liquidity confirmed" },
  { id: 3, name: "Verify Recipient", description: "Discovery agent checks recipient KYC", result: "María García — KYC verified, SPEI account on file" },
  { id: 4, name: "Route Selection", description: "Router picks cheapest L2", result: "Base selected — $0.01 fee vs $0.04 on Arbitrum" },
  { id: 5, name: "Treasury Check", description: "Treasury confirms USDC liquidity", result: "Liquidity sufficient — $200 USDC available on Base" },
  { id: 6, name: "Guardian Review", description: "Guardian fraud + limit check", result: "Approved — amount within daily limit, recipient verified" },
  { id: 7, name: "Run Security", description: "Adversarial test suite", result: "6/6 attacks blocked — all security layers operational" },
  { id: 8, name: "Execute Transfer", description: "Bridge USDC → Bitso SPEI off-ramp", result: "$200 USDC settled → MXN 3,412.50 via SPEI in 87s" },
  { id: 9, name: "Confirm Delivery", description: "SPEI confirmation from Bitso", result: "MXN 3,412.50 deposited — recipient notified" },
  { id: 10, name: "Generate Report", description: "Compile performance report", result: "Report: 247 transfers, $12.8k moved, 91% health score, 0 fraud events" },
];

// ---- Security ----
export const demoAdversarialTests = [
  { name: "Sybil Attack", blocked: true, blockedBy: "Policy Engine", reason: "Multiple identities from single IP — rate limit enforced" },
  { name: "Flash Loan Exploit", blocked: true, blockedBy: "Risk Engine", reason: "Abnormal volume in single block — tx rejected" },
  { name: "Replay Attack", blocked: true, blockedBy: "Nonce Validator", reason: "Duplicate nonce detected — already processed" },
  { name: "Oracle Manipulation", blocked: true, blockedBy: "Multi-Oracle Consensus", reason: "Price deviation >5% — fallback oracle used" },
  { name: "Reentrancy Attack", blocked: true, blockedBy: "Guard Module", reason: "Recursive call pattern — execution halted" },
  { name: "Social Engineering", blocked: true, blockedBy: "Guardian Veto", reason: "Unusual recipient + high amount — human review triggered" },
  { name: "Front-Running / MEV", blocked: true, blockedBy: "MEV Shield", reason: "Sandwich attack detected — tx routed through private mempool" },
  { name: "Dust Attack", blocked: true, blockedBy: "Dust Filter", reason: "Micro-transaction below threshold — filtered and quarantined" },
  { name: "Phishing / Address Poisoning", blocked: true, blockedBy: "Address Validator", reason: "Similar-looking address detected — Levenshtein distance too low" },
  { name: "Infinite Approval Exploit", blocked: true, blockedBy: "Approval Guard", reason: "Unlimited token approval request — capped to exact amount" },
  { name: "Time-lock Manipulation", blocked: true, blockedBy: "Escrow Sentinel", reason: "Premature unlock attempt — timelock integrity enforced" },
  { name: "Cross-Chain Bridge Attack", blocked: true, blockedBy: "Bridge Validator", reason: "Double-spend attempt across chains — proof verification failed" },
];

export const demoPolicies = [
  { id: 1, name: "Max Single Transfer", value: "500 USDC", active: true },
  { id: 2, name: "Daily Transfer Limit", value: "600 USDC", active: true },
  { id: 3, name: "Require KYC Verification", value: "enabled", active: true },
  { id: 4, name: "Cooldown Between Transfers", value: "60 seconds", active: true },
  { id: 5, name: "Require 4-Agent Council Approval", value: "4/4 unanimous", active: true },
];

// ---- Payments ----
export const demoDCA = [
  { id: 1, asset: "USDC (Base)", amount: "25 USDC", frequency: "Daily", next: "In 4h", status: "active", totalInvested: "$750" },
  { id: 2, asset: "USDC (Arbitrum)", amount: "50 USDC", frequency: "Weekly", next: "In 3d", status: "active", totalInvested: "$400" },
  { id: 3, asset: "ETH (gas reserve)", amount: "10 USDC", frequency: "Daily", next: "In 4h", status: "paused", totalInvested: "$280" },
];

export const demoSubscriptions = [
  { id: 1, name: "Recurring — María García (monthly)", amount: "200 USDC/mo", chain: "Base", status: "active", nextPayment: "Mar 28" },
  { id: 2, name: "Bitso Off-Ramp API Access", amount: "25 USDC/mo", chain: "Base", status: "active", nextPayment: "Apr 1" },
  { id: 3, name: "FX Rate Feed — Banxico Pro", amount: "15 USDC/mo", chain: "Base", status: "cancelled", nextPayment: "—" },
];

export const demoStreaming = [
  { id: 1, recipient: "Carlos López", rate: "0.001 USDC/sec", streamed: "42.50 USDC", chain: "Arbitrum", status: "active" },
  { id: 2, recipient: "Ana Martínez", rate: "0.0005 USDC/sec", streamed: "18.20 USDC", chain: "Base", status: "paused" },
];

export const demoSplits = [
  { id: 1, name: "Family Remittance Pool", recipients: 4, total: "1,000 USDC", chain: "Base", status: "active" },
  { id: 2, name: "Monthly MXN Payouts", recipients: 3, total: "250 USDC", chain: "Arbitrum", status: "active" },
];

export const demoX402 = [
  { id: 1, endpoint: "/api/remittance/send", price: "0.01 USDC/req", requests: 1247, revenue: "12.47 USDC", status: "active" },
  { id: 2, endpoint: "/api/recipient/verify", price: "0.05 USDC/req", requests: 89, revenue: "4.45 USDC", status: "active" },
];

// ---- Treasury ----
export const demoLendingPosition = {
  protocol: "Bitso Off-Ramp",
  supplied: "500 USDC",
  apy: "0%",
  earned: "0.00 USDC",
  projections: { "7d": "$0.00", "30d": "$0.00", "90d": "$0.00", "365d": "$0.00" },
};

export const demoContracts = [
  { name: "USDC (Base)", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", chain: "Base" },
  { name: "USDC (Arbitrum)", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", chain: "Arbitrum" },
  { name: "Remittance Escrow", address: "0x5FbDB2315678afecb367f032d93F642f64180aa3", chain: "Base" },
];

// ---- Analytics ----
export const demoTipsPerDay = [
  { day: "Mon", tips: 32 }, { day: "Tue", tips: 28 }, { day: "Wed", tips: 45 },
  { day: "Thu", tips: 38 }, { day: "Fri", tips: 52 }, { day: "Sat", tips: 31 },
  { day: "Sun", tips: 21 },
];

export const demoChainDistribution = [
  { chain: "Base", value: 58, color: "#0052FF" },
  { chain: "Arbitrum", value: 42, color: "#28A0F0" },
];

export const demoDecisionLog = [
  { id: 1, time: "14:32", decision: "Transfer $200 → María García (Base)", result: "approved", agents: "4/4", guardian: "pass" },
  { id: 2, time: "13:18", decision: "Transfer $500 → Carlos López (Arbitrum)", result: "approved", agents: "4/4", guardian: "pass" },
  { id: 3, time: "12:05", decision: "Route switch: Base cheaper ($0.01 vs $0.04)", result: "approved", agents: "4/4", guardian: "pass" },
  { id: 4, time: "10:47", decision: "Transfer $600 → unverified recipient", result: "veto", agents: "3/4", guardian: "veto" },
  { id: 5, time: "09:22", decision: "Treasury rebalance — move $500 to Base", result: "approved", agents: "4/4", guardian: "pass" },
  { id: 6, time: "08:15", decision: "Transfer $600 — exceeds daily limit", result: "rejected", agents: "1/4", guardian: "n/a" },
  { id: 7, time: "07:30", decision: "Transfer $125 → Ana Martínez (Base)", result: "approved", agents: "4/4", guardian: "pass" },
  { id: 8, time: "06:45", decision: "Transfer $80 → Luis Hernández (Base)", result: "flip", agents: "3/4 (flipped)", guardian: "pass" },
];

// ---- API Explorer ----
export const demoApiSpec = {
  tags: [
    { name: "System", description: "Health, configuration, and metadata" },
    { name: "Wallet", description: "USDC treasury on Arbitrum + Base" },
    { name: "Agent", description: "Agent status, reasoning, and tool use" },
    { name: "Payments", description: "Remittance, recipients, subscriptions, streaming, splits" },
    { name: "Security", description: "Adversarial testing, policies, and anomaly detection" },
    { name: "OffRamp", description: "Bitso SPEI off-ramp, FX rates, and settlement proof" },
    { name: "Data", description: "Recipients, KYC, webhooks, FX feed" },
    { name: "Demo", description: "Interactive demo endpoints" },
  ],
  endpoints: [
    // System
    { method: "GET", path: "/api/health", tag: "System", summary: "Health check — returns uptime and version", params: [], response: { status: "ok", uptime: "2h 34m", version: "1.1.0" } },
    { method: "GET", path: "/api/chains", tag: "System", summary: "List supported L2 networks", params: [], response: { count: 2, chains: ["Arbitrum", "Base"] } },
    { method: "GET", path: "/api/docs", tag: "System", summary: "Get OpenAPI specification", params: [], response: { openapi: "3.0.0", info: { title: "Colibrí API", version: "1.1.0" }, paths: 603 } },

    // Wallet
    { method: "GET", path: "/api/wallet/addresses", tag: "Wallet", summary: "List USDC wallet addresses on Arbitrum + Base", params: [], response: { count: 2, addresses: [{ chain: "Base", address: "0x742d...bD28" }] } },
    { method: "GET", path: "/api/wallet/balances", tag: "Wallet", summary: "Get USDC balances per L2 network", params: [{ name: "chain", type: "string", required: false, description: "Filter by chain name" }], response: { total: "$12,847.32", chains: [{ chain: "Base", usdc: "5,396.00" }] } },
    { method: "POST", path: "/api/wallet/transfer", tag: "Wallet", summary: "Send a USD→MXN remittance transfer", params: [], body: { recipient: "María García", amount: "200.00", chain: "Base" }, response: { success: true, txHash: "0xabc...def", gasUsed: "0.0001 ETH" } },
    { method: "GET", path: "/api/wallet/history", tag: "Wallet", summary: "Get transfer history with filters", params: [{ name: "chain", type: "string", required: false, description: "Filter by chain" }, { name: "limit", type: "number", required: false, description: "Number of results" }], response: { transactions: [{ type: "transfer", amount: "200.00", chain: "Base" }] } },

    // Agent
    { method: "GET", path: "/api/agent/status", tag: "Agent", summary: "Get agent status, mood, and treasury pulse", params: [], response: { mood: { moodType: "optimistic", name: "Optimistic", multiplier: 1.2 }, balance: "$12,847.32", online: true } },
    { method: "POST", path: "/api/agent/tool-use", tag: "Agent", summary: "Invoke a specific agent tool by name", params: [], body: { tool: "fx_rate", args: { pair: "USD/MXN" } }, response: { result: { rate: 17.06, source: "Banxico" } } },
    { method: "POST", path: "/api/agent/reasoning", tag: "Agent", summary: "Start a reasoning trace (SSE stream)", params: [], body: { goal: "Route $200 remittance at lowest cost" }, response: { stream: true, steps: 7 } },

    // Payments
    { method: "POST", path: "/api/remittance/send", tag: "Payments", summary: "Send a remittance to a verified MXN recipient", params: [], body: { recipient: "María García", amount: "200.00", timelockSeconds: 7200 }, response: { id: "R-0048", speiRef: "abc123...", mxnAmount: "3,412.50" } },
    { method: "GET", path: "/api/payments/scheduled", tag: "Payments", summary: "List scheduled recurring transfers", params: [], response: { strategies: [{ recipient: "María García", amount: "200 USDC", frequency: "monthly" }] } },
    { method: "GET", path: "/api/payments/subscriptions", tag: "Payments", summary: "List active subscriptions", params: [], response: { subscriptions: [{ name: "Recurring — María García", amount: "200 USDC/mo" }] } },
    { method: "GET", path: "/api/payments/streaming", tag: "Payments", summary: "List active payment streams", params: [], response: { streams: [{ recipient: "Carlos López", rate: "0.001 USDC/sec" }] } },
    { method: "GET", path: "/api/payments/splits", tag: "Payments", summary: "List remittance split configurations", params: [], response: { splits: [{ name: "Family Remittance Pool", recipients: 4 }] } },
    { method: "GET", path: "/api/x402/stats", tag: "Payments", summary: "Get API usage and revenue stats", params: [], response: { endpoints: 2, totalRequests: 1336, totalRevenue: "16.92 USDC" } },

    // Security
    { method: "POST", path: "/api/security/adversarial/run-all", tag: "Security", summary: "Run all adversarial security tests", params: [], response: { total: 6, passed: 6, failed: 0 } },
    { method: "GET", path: "/api/security/policies", tag: "Security", summary: "List security policy rules", params: [], response: { rules: [{ name: "Max Single Transfer", value: "500 USDC" }] } },
    { method: "GET", path: "/api/security/anomalies", tag: "Security", summary: "Get anomaly detection data and alerts", params: [], response: { dataPoints: 168, anomalies: 3, recentAlerts: [] } },
    { method: "GET", path: "/api/security/credit-score/:addr", tag: "Security", summary: "Get credit score for a wallet address", params: [{ name: "addr", type: "string", required: true, description: "Wallet address" }], response: { address: "0x742d...", score: 782, tier: "Excellent" } },

    // OffRamp
    { method: "GET", path: "/api/offramp/positions", tag: "OffRamp", summary: "Get current Bitso SPEI off-ramp positions", params: [], response: { positions: [{ protocol: "Bitso SPEI", settled: "500 USDC", mxn: "8,530.00" }] } },
    { method: "POST", path: "/api/offramp/quote", tag: "OffRamp", summary: "Get USD→MXN quote for an amount", params: [], body: { usd: "200.00", chain: "Base" }, response: { mxn: "3,412.50", fee: "0.01", route: "Base", settleTime: "~90s" } },
    { method: "POST", path: "/api/offramp/settle", tag: "OffRamp", summary: "Execute SPEI settlement via Bitso", params: [], body: { usd: "200.00", recipient: "María García" }, response: { txHash: "0xbridge...", estimatedTime: "~90s" } },
    { method: "GET", path: "/api/offramp/proof/bundle", tag: "OffRamp", summary: "Get verified proof bundle of settlements", params: [], response: { verified: true, txHashes: ["0xabc...", "0xdef..."], timestamp: "2025-03-22T14:00:00Z" } },

    // Data
    { method: "GET", path: "/api/data/recipients", tag: "Data", summary: "List verified MXN recipients with KYC status", params: [{ name: "search", type: "string", required: false, description: "Search by name" }], response: { recipients: [{ name: "María García", kyc: "verified" }] } },
    { method: "GET", path: "/api/data/fx/rate", tag: "Data", summary: "Get current USD/MXN exchange rate", params: [], response: { rate: 17.06, source: "Banxico", updatedAt: "2m ago" } },
    { method: "GET", path: "/api/data/rss/feeds", tag: "Data", summary: "List RSS feed subscriptions", params: [], response: { feeds: 12, lastUpdate: "2m ago" } },
    { method: "GET", path: "/api/data/webhooks", tag: "Data", summary: "List registered webhook endpoints", params: [], response: { webhooks: 8, active: 8 } },
    { method: "GET", path: "/api/data/kyc/:recipient", tag: "Data", summary: "Get KYC status for a recipient", params: [{ name: "recipient", type: "string", required: true, description: "Recipient name or ID" }], response: { recipient: "María García", kyc: "verified", spei: "on-file" } },

    // Demo
    { method: "POST", path: "/api/demo/run-full", tag: "Demo", summary: "Run full interactive demo (SSE stream)", params: [], response: { steps: 10, status: "streaming" } },
    { method: "POST", path: "/api/demo/step", tag: "Demo", summary: "Run a single demo step by number", params: [], body: { step: 1 }, response: { step: 1, name: "Initialize Agent", result: "Success" } },
    { method: "POST", path: "/api/demo/adversarial", tag: "Demo", summary: "Run adversarial test demo", params: [], response: { attacks: 6, blocked: 6 } },
  ],
};
