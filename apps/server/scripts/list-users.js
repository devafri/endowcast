const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      include: { organization: { include: { subscription: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('\n📋 Recent Users:\n');
    users.forEach((u, idx) => {
      console.log(`${idx + 1}. Email: ${u.email}`);
      console.log(`   Name: ${u.firstName} ${u.lastName}`);
      console.log(`   Plan: ${u.organization.subscription.planType}`);
      console.log(`   Org: ${u.organization.name}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
