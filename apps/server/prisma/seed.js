// Minimal Prisma seed script for local development
// Creates a default organization and admin user if they don't exist.
// This script is intentionally small and idempotent.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Running seed script...');

  const orgName = process.env.SEED_ORG_NAME || 'Local Dev Org';
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@local.test';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'password';

  // Upsert organization
  const organization = await prisma.organization.upsert({
    where: { name: orgName },
    update: {},
    create: {
      name: orgName,
      contactEmail: adminEmail,
      isActive: true,
    },
  });

  // Upsert admin user
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        firstName: 'Local',
        lastName: 'Admin',
        password: hashed,
        organizationId: organization.id,
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    console.log('Created admin user:', user.email);
  } else {
    console.log('Admin user already exists:', existing.email);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
