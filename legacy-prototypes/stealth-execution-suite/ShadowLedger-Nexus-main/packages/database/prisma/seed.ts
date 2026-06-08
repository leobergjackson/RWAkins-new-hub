// Built by vsrupeshkumar
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { id: 'default-org' },
    update: {},
    create: {
      id: 'default-org',
      name: 'Stealth Executive Suite Nexus DAO',
      description: 'The primary invisible organizational entity for Stealth Executive Suite operations.',
    },
  });

  console.log(`✅ Organization created: ${org.name}`);

  // 2. Create Treasury
  const treasury = await prisma.treasury.upsert({
    where: { address: 'SHADOW_TREASURY_MAIN_01' },
    update: {},
    create: {
      address: 'SHADOW_TREASURY_MAIN_01',
      organizationId: org.id,
      balance: 12402.91,
      currency: 'ETH',
      isPrivate: true,
      exposureScore: 98,
    },
  });

  console.log(`✅ Treasury created: ${treasury.address}`);

  // 3. Create Specialized AI Agents
  const agentsData = [
    { name: 'Aegis', type: 'TREASURY', status: 'ACTIVE', lastAction: 'Optimizing asset allocation across stealth paths.' },
    { name: 'Nomad', type: 'PAYROLL', status: 'ACTIVE', lastAction: 'Fragmenting contributor disbursements for privacy.' },
    { name: 'Sentinel', type: 'COMPLIANCE', status: 'IDLE', lastAction: 'Monitoring cross-chain regulatory shifts.' },
    { name: 'Wraith', type: 'RISK', status: 'ACTIVE', lastAction: 'Analyzing depeg risk for USDC-ETH liquidity pools.' },
    { name: 'Oracle', type: 'STRATEGY', status: 'ACTIVE', lastAction: 'Formulating Q3 privacy expansion roadmap.' },
    { name: 'Phantom', type: 'EXECUTION', status: 'IDLE', lastAction: 'Ready for on-chain settlement via Cloak SDK.' },
    { name: 'Echo', type: 'MARKET', status: 'ACTIVE', lastAction: 'Scanning real-time price feeds for volatility spikes.' },
  ];

  for (const agent of agentsData) {
    await prisma.agent.create({
      data: {
        ...agent,
        organizationId: org.id,
        lastActionAt: new Date(),
      },
    });
  }

  console.log('✅ AI Agents initialized');

  // 4. Create Initial Payroll
  const payroll = await prisma.payroll.create({
    data: {
      name: 'Core Contributors - May 2026',
      amount: 450.5,
      frequency: 'monthly',
      nextRun: new Date('2026-06-01'),
      status: 'ACTIVE',
      organizationId: org.id,
      recipients: {
        create: [
          { address: 'ETH_DEV_111...', name: 'Lead Architect' },
          { address: 'ETH_DEV_222...', name: 'AI Researcher' },
          { address: 'ETH_DEV_333...', name: 'Frontend Lead' },
        ],
      },
    },
  });

  console.log(`✅ Payroll created: ${payroll.name}`);

  // 5. Create Initial Transactions
  await prisma.transaction.createMany({
    data: [
      {
        treasuryId: treasury.id,
        amount: -1200,
        type: 'PAYROLL_DISBURSEMENT',
        status: 'CONFIRMED',
        metadata: JSON.stringify({ detail: 'April Core Contributor Payroll' }),
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
      {
        treasuryId: treasury.id,
        amount: 2500,
        type: 'LIQUIDITY_INJECTION',
        status: 'CONFIRMED',
        metadata: JSON.stringify({ detail: 'Seed Funding Round A' }),
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      },
      {
        treasuryId: treasury.id,
        amount: -45.2,
        type: 'INFRA_OPEX',
        status: 'CONFIRMED',
        metadata: JSON.stringify({ detail: 'Cloud Compute Settlement' }),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ],
  });

  console.log('✅ Initial transactions recorded');

  // 6. Create Initial Safety Audits
  await prisma.safetyAudit.createMany({
    data: [
      {
        agentType: 'ORCHESTRATOR',
        action: 'Fragmenting Payroll Batch #042',
        riskScore: 0.042,
        allowed: true,
        metadata: JSON.stringify({ strategy: 'Time-jitter fragmenting' }),
      },
      {
        agentType: 'ORCHESTRATOR',
        action: 'Liquidity Withdrawal (1.2M ETH)',
        riskScore: 0.89,
        allowed: false,
        reason: 'Action would create a high behavioral correlation cluster.',
        metadata: JSON.stringify({ strategy: 'Direct transfer' }),
      },
      {
        agentType: 'RISK_AGENT',
        action: 'Sub-wallet Rotation',
        riskScore: 0.12,
        allowed: true,
        metadata: JSON.stringify({ count: 8 }),
      }
    ],
  });

  console.log('✅ Initial safety audits recorded');
  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
