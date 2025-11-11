require('dotenv').config();
const prisma = require('./src/shared/db/prisma');

(async () => {
  try {
    const sims = await prisma.simulation.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
    console.log('Recent simulations (id | name | createdAt):');
    sims.forEach(s => console.log(`${s.id} | ${s.name || '<no-name>'} | ${s.createdAt}`));
  } catch (err) {
    console.error('Error querying simulations:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
