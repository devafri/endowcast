require('dotenv').config();
const prisma = require('./src/shared/db/prisma');

(async () => {
  try {
  const rows = await prisma.$queryRawUnsafe('SELECT id, name, "createdAt" FROM simulations ORDER BY "createdAt" DESC LIMIT 20');
    console.log('Recent simulations (id | name | createdAt):');
    rows.forEach(r => console.log(`${r.id} | ${r.name || '<no-name>'} | ${r.createdAt}`));
  } catch (err) {
    console.error('Error querying simulations (raw):', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
