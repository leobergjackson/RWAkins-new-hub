export type PFAgent = {
  id: string; name: string; type: string; status: 'active'|'idle'|'error'
  allocation: number; efficiency: number; resourceUsed: number
  lastAction: string; rating: number; tasks: number; pnlDelta?: string
}

export type PFStream = {
  id: string; recipientName: string; role: string; wallet: string
  ratePerHour: number; token: string; status: 'active'|'paused'; totalStreamed: number; region: string
}

export type PFHistoryItem = {
  id: string; event: string; agent: string; type: 'payment'|'deposit'|'withdrawal'
  amount: string; status: 'Finalized'|'Pending'; blockchain: string; timestamp: string
}

export type PFPolicy = {
  id: string; name: string; description: string; threshold: number|string
  unit: string; policyType: 'spending'|'yield'|'risk'; status: 'active'|'paused'
}

export const PF_AGENTS: PFAgent[] = [
  { id:'a1', name:'Arbitrage Hunter', type:'DeFi Specialist',               status:'active', allocation:500,   efficiency:100, resourceUsed:0,     lastAction:'Arbitrage cycle on Solana DEXs for PUSD pairs',         rating:4.9, tasks:24, pnlDelta:'+2.1%' },
  { id:'a2', name:'Atlas',            type:'Product AI',                     status:'active', allocation:1000,  efficiency:100, resourceUsed:0,     lastAction:'Product roadmap analysis and sprint planning complete',  rating:5.0, tasks:12 },
  { id:'a3', name:'Arbitrage Hunter', type:'DeFi Specialist',               status:'active', allocation:500,   efficiency:100, resourceUsed:0.45,  lastAction:'Triangular arbitrage PUSD/USDC/SOL executed',           rating:4.9, tasks:18, pnlDelta:'+90.3%' },
  { id:'a4', name:'Arbitrage Hunter', type:'DeFi Specialist',               status:'active', allocation:500,   efficiency:100, resourceUsed:1.8,   lastAction:'4-hour cycle on Orca, Raydium, Jupiter',                rating:4.9, tasks:31, pnlDelta:'+15.2%' },
  { id:'a5', name:'Risk Manager',     type:'Risk Manager',                   status:'active', allocation:5000,  efficiency:100, resourceUsed:10,    lastAction:'Emergency lock engaged: velocity anomaly detected',      rating:5.0, tasks:8 },
  { id:'a6', name:'Treasury Analyst', type:'Treasury Analyst',               status:'active', allocation:100,   efficiency:100, resourceUsed:5,     lastAction:'Capital allocation optimized: 60/40 split',             rating:5.0, tasks:14 },
  { id:'a7', name:'Marketing AI',     type:'Autonomous Ad Buying & Growth',  status:'idle',   allocation:25000, efficiency:100, resourceUsed:18200, lastAction:'Ad campaigns paused pending budget review',             rating:4.8, tasks:45 },
  { id:'a8', name:'Product AI',       type:'Treasury Strategy & Allocation', status:'active', allocation:50000, efficiency:100, resourceUsed:12450, lastAction:'Yield strategy rebalancing in progress',                rating:4.9, tasks:124 },
]

export const PF_STREAMS: PFStream[] = [
  { id:'s1', recipientName:'Alex Rivera', role:'Full Stack Developer', wallet:'7xKp...9mQZ', ratePerHour:54, token:'PUSD', status:'paused', totalStreamed:469.8547, region:'Global' },
]

export const PF_HISTORY: PFHistoryItem[] = [
  { id:'h1',  event:'Arbitrage cycle on Solana DEXs — PUSD monitoring',       agent:'Arbitrage Hunter',  type:'payment',    amount:'1.8 PUSD',     status:'Finalized', blockchain:'Internal', timestamp:'5/19/2026, 1:25:44 PM' },
  { id:'h2',  event:'4-hour Arbitrage Hunter cycle on Orca, Raydium, Jupiter', agent:'Arbitrage Hunter',  type:'payment',    amount:'0.25 PUSD',    status:'Finalized', blockchain:'Internal', timestamp:'5/19/2026, 1:25:30 PM' },
  { id:'h3',  event:'Triangular arbitrage PUSD/USDC/SOL',                      agent:'Arbitrage Hunter',  type:'payment',    amount:'0.2 PUSD',     status:'Finalized', blockchain:'Internal', timestamp:'5/19/2026, 1:19:31 PM' },
  { id:'h4',  event:'Initial funding from Treasury',                            agent:'Risk Manager',      type:'deposit',    amount:'5,000 PUSD',   status:'Finalized', blockchain:'Internal', timestamp:'5/19/2026, 9:53:38 AM' },
  { id:'h5',  event:'Initial funding from Treasury',                            agent:'Treasury Analyst',  type:'deposit',    amount:'100 PUSD',     status:'Finalized', blockchain:'Internal', timestamp:'5/19/2026, 9:51:49 AM' },
  { id:'h6',  event:'Ad Credits Purchase',                                      agent:'Marketing AI',      type:'payment',    amount:'250 PUSD',     status:'Finalized', blockchain:'Internal', timestamp:'5/18/2026, 3:42:11 PM' },
  { id:'h7',  event:'Initial funding from Treasury',                            agent:'Marketing AI',      type:'deposit',    amount:'25,000 PUSD',  status:'Finalized', blockchain:'Internal', timestamp:'5/18/2026, 10:00:00 AM' },
  { id:'h8',  event:'Yield optimization rebalance — Kamino/Raydium/Jito',      agent:'Product AI',        type:'payment',    amount:'1,200 PUSD',   status:'Finalized', blockchain:'Internal', timestamp:'5/17/2026, 4:15:00 PM' },
  { id:'h9',  event:'Kamino lending protocol deposit',                          agent:'Treasury Analyst',  type:'deposit',    amount:'3,500 PUSD',   status:'Finalized', blockchain:'Internal', timestamp:'5/16/2026, 8:30:00 AM' },
  { id:'h10', event:'Payroll stream disbursement — Alex Rivera',                agent:'Payroll System',    type:'payment',    amount:'469.85 PUSD',  status:'Finalized', blockchain:'Internal', timestamp:'5/15/2026, 9:00:00 AM' },
  { id:'h11', event:'Initial funding from Treasury',                            agent:'Product AI',        type:'deposit',    amount:'50,000 PUSD',  status:'Finalized', blockchain:'Internal', timestamp:'5/13/2026, 12:00:00 PM' },
  { id:'h12', event:'Risk sentinel: daily threshold reset',                     agent:'Risk Manager',      type:'withdrawal', amount:'0 PUSD',       status:'Finalized', blockchain:'Internal', timestamp:'5/13/2026, 8:00:00 AM' },
]

export const PF_POLICIES: PFPolicy[] = [
  { id:'p1', name:'Global Emergency Lock', description:'Emergency Lock: Abnormal spending velocity detected.',  threshold:0,    unit:'PUSD', policyType:'spending', status:'active' },
  { id:'p2', name:'Daily Spending Cap',    description:'Maximum PUSD an agent can spend per 24 hours.',        threshold:1000, unit:'PUSD', policyType:'spending', status:'active' },
  { id:'p3', name:'Emergency Reserve',     description:'Keep 30% of treasury in liquid reserve at all times.', threshold:0.3,  unit:'PUSD', policyType:'risk',     status:'paused' },
]

export const PF_ACTIVITY_POOL = [
  { agent:'AGENT YXEF', action:'Arbitrage cycle on Solana DEXs for PUSD pairs initiated' },
  { agent:'AGENT OR7W', action:'4-hour Arbitrage Hunter cycle on Orca, Raydium, Jupiter' },
  { agent:'AGENT OR7W', action:'Triangular arbitrage PUSD/USDC/SOL — yield: +0.003%' },
  { agent:'AGENT Y40Q', action:'Initial funding from Treasury — allocation confirmed' },
  { agent:'AGENT RQ9O', action:'Initial funding from Treasury — Solana vault initialized' },
  { agent:'AGENT ZKXY', action:'Risk sentinel velocity threshold reset to baseline levels' },
  { agent:'AGENT 8TPN', action:'Capital rebalance: Kamino 35%, Raydium 28%, Jito 20%' },
  { agent:'AGENT M2WQ', action:'Marketing campaign budget consumed: 18,200 PUSD utilized' },
  { agent:'AGENT PFAX', action:'Payroll stream paused pending budget review authorization' },
  { agent:'AGENT YXEF', action:'Micro-arbitrage identified: PUSD/USDC spread on Orca DEX' },
  { agent:'AGENT 7GBN', action:'Neural advisor recommendation applied: rebalance executed' },
  { agent:'AGENT KRMT', action:'Emergency reserve threshold maintained at 30% of treasury' },
]

export const PF_TREASURY_CHART = [220000, 450000, 780000, 999945, 920000, 880000, 999945]
export const PF_CHART_LABELS = ['May 13', 'May 14', 'May 15', 'May 16', 'May 17', 'May 18', 'May 19']

export const MARKETPLACE_AGENTS = [
  { name:'Arbitrage Hunter',   role:'DeFi Specialist',    efficiency:98, complexity:'High',   price:'Free',         rating:4.9, category:'DeFi',       desc:'Continuously monitors Solana DEXs for PUSD arbitrage opportunities across Orca, Raydium and Jupiter.' },
  { name:'Liquidity Optimizer', role:'LP Manager',         efficiency:96, complexity:'High',   price:'Free',         rating:4.7, category:'DeFi',       desc:'Maximizes LP positions across Solana AMMs with auto-compounding and rebalancing.' },
  { name:'Flash Loan Executor', role:'DeFi Arbitrageur',   efficiency:91, complexity:'Expert', price:'200 PUSD/mo', rating:4.6, category:'DeFi',       desc:'Executes flash loan arbitrage strategies across multiple Solana protocols for zero-capital profits.' },
  { name:'Sentinel v1',         role:'Security AI',        efficiency:100,complexity:'High',   price:'Free',         rating:5.0, category:'Security',   desc:'Behavioral ML model that detects anomalous transaction patterns and triggers emergency locks.' },
  { name:'Fraud Watchdog',      role:'Anomaly Detector',   efficiency:99, complexity:'High',   price:'Free',         rating:4.9, category:'Security',   desc:'Real-time fraud detection using on-chain pattern recognition and wallet graph analysis.' },
  { name:'Growth Engine',       role:'Marketing AI',       efficiency:94, complexity:'Medium', price:'100 PUSD/mo', rating:4.8, category:'Marketing',  desc:'Autonomous social growth campaigns and community engagement optimization.' },
  { name:'Narrative AI',        role:'Content Strategist', efficiency:88, complexity:'Medium', price:'75 PUSD/mo',  rating:4.5, category:'Marketing',  desc:'Generates protocol narratives, documentation, and community content at scale.' },
  { name:'Treasury Oracle',     role:'Analytics Engine',   efficiency:97, complexity:'High',   price:'150 PUSD/mo', rating:4.9, category:'Analytics',  desc:'Deep treasury analytics with predictive modeling and risk-adjusted yield forecasting.' },
  { name:'Risk Modeler',        role:'Quantitative AI',    efficiency:94, complexity:'Expert', price:'200 PUSD/mo', rating:4.7, category:'Analytics',  desc:'Quantitative risk modeling with VaR calculations and portfolio stress testing.' },
  { name:'Audit Trail',         role:'Compliance AI',      efficiency:100,complexity:'Medium', price:'Free',         rating:5.0, category:'Compliance', desc:'Cryptographically signed immutable audit logs for every treasury operation.' },
  { name:'Policy Enforcer',     role:'Guardrail Agent',    efficiency:100,complexity:'High',   price:'Free',         rating:5.0, category:'Compliance', desc:'Enforces neural laws cryptographically on every transaction before execution.' },
  { name:'Cloud Cost AI',       role:'DevOps Optimizer',   efficiency:89, complexity:'Medium', price:'100 PUSD/mo', rating:4.6, category:'DevOps',     desc:'Monitors and optimizes cloud infrastructure costs for AI agent operations.' },
]
