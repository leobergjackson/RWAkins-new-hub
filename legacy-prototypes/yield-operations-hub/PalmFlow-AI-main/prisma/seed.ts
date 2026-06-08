// Built by vsrupeshkumar
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Clear existing data
  await prisma.policy.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.stream.deleteMany();

  // Create Agents
  const productAgent = await prisma.agent.create({
    data: {
      name: 'Product AI',
      role: 'Treasury Strategy & Allocation',
      status: 'active',
      budget: 50000,
      spent: 12450,
      tasksCount: 124,
      efficiency: 98,
    },
  });

  const marketingAgent = await prisma.agent.create({
    data: {
      name: 'Marketing AI',
      role: 'Autonomous Ad Buying & Growth',
      status: 'executing',
      budget: 25000,
      spent: 18200,
      tasksCount: 89,
      efficiency: 94,
    },
  });

  // Create Transactions
  await prisma.transaction.createMany({
    data: [
      {
        amount: 250,
        type: 'payment',
        description: 'Ad Credits Purchase',
        agentId: marketingAgent.id,
        status: 'completed',
      },
      {
        amount: 1200,
        type: 'payment',
        description: 'Cloud Infrastructure Settlement',
        status: 'completed',
      },
    ],
  });

  // Create Streams
  await prisma.stream.createMany({
    data: [
      {
        recipientName: 'Alex Rivera',
        recipientRole: 'Full Stack Developer',
        ratePerSecond: 0.015,
        totalStreamed: 452.20,
        status: 'active',
        walletAddress: 'SolanaWalletAddress123...',
      },
    ],
  });

  // Create Policies
  await prisma.policy.createMany({
    data: [
      {
        name: 'Daily Spending Cap',
        type: 'spending_limit',
        value: 1000,
        description: 'Maximum PUSD an agent can spend per 24 hours.',
        isActive: true,
      },
      {
        name: 'Emergency Reserve',
        type: 'reserve_ratio',
        value: 0.3,
        description: 'Keep 30% of treasury in liquid reserve.',
        isActive: true,
      },
    ],
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
