require('dotenv').config();
const prisma = require('./src/shared/db/prisma');

const id = process.argv[2];
if (!id) {
  console.error('Usage: node find_simulation.js <simulation_id>');
  process.exit(1);
}

(async () => {
  try {
    const sim = await prisma.simulation.findUnique({ where: { id } });
    if (!sim) {
      console.log(`No simulation found with id ${id}`);
    } else {
      console.log(JSON.stringify(sim, null, 2));
    }
  } catch (err) {
    console.error('Error querying simulation:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
