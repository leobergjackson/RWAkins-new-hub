// Built by vsrupeshkumar
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const agents = await prisma.agent.count();
  const transactions = await prisma.transaction.count();
  const policies = await prisma.policy.count();
  const streams = await prisma.stream.count();

  console.log(JSON.stringify({ agents, transactions, policies, streams }, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
