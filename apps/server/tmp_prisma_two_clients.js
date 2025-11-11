const { PrismaClient } = require('@prisma/client');
(async ()=>{
  const p1 = new PrismaClient();
  const p2 = new PrismaClient();
  try {
    console.log('Running sequential queries:');
    const c1 = await p1.simulation.count();
    console.log('p1 count:', c1);
    const c2 = await p2.simulation.count();
    console.log('p2 count:', c2);

    console.log('Running concurrent queries:');
    await Promise.all([
      p1.simulation.count(),
      p2.simulation.count(),
      p1.simulation.count(),
      p2.simulation.count()
    ]).then(results => console.log('concurrent results:', results))
      .catch(e => console.error('concurrent error:', e));
  } catch (e) {
    console.error('Error during tests:', e);
  } finally {
    try { await p1.$disconnect(); } catch(_){}
    try { await p2.$disconnect(); } catch(_){}
  }
})();
