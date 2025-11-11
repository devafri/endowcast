// Small helper to list a few users using the production pooled DB URL from repo vercel-prod.env
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../apps/vercel-prod.env');
let envRaw = '';
try { envRaw = fs.readFileSync(envPath, 'utf8'); } catch (e) { console.error('Failed to read vercel-prod.env:', e.message); process.exit(1); }
const m = envRaw.match(/^DATABASE_POSTGRES_PRISMA_URL=\"?(.*?)\"?$/m);
if (!m) { console.error('DATABASE_POSTGRES_PRISMA_URL not found in vercel-prod.env'); process.exit(1); }
process.env.DATABASE_POSTGRES_PRISMA_URL = m[1];

(async () => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const users = await prisma.user.findMany({ take: 5, select: { id: true, email: true, organizationId: true, createdAt: true } });
    console.log('Users:', users);
    await prisma.$disconnect();
  } catch (e) {
    console.error('Prisma error:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
