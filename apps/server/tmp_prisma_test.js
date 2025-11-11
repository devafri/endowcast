process.env.PRISMA_DISABLE_PREPARED_STATEMENTS = 'true';
console.log('PRISMA_DISABLE_PREPARED_STATEMENTS (before require):', process.env.PRISMA_DISABLE_PREPARED_STATEMENTS);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    console.log('Running prisma.simulation.count()...');
    const c = await prisma.simulation.count();
    console.log('Count result:', c);
  } catch (e) {
    console.error('Prisma error:', e);
  } finally {
    try { await prisma.$disconnect(); } catch(_){}
  }
})();
