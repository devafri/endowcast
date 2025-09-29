const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearTestData() {
  try {
    console.log('🧹 Clearing test data...');
    
    // Delete in order to respect foreign key constraints
    await prisma.simulation.deleteMany({});
    console.log('   ✅ Cleared simulations');
    
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@example.com'
        }
      }
    });
    console.log('   ✅ Cleared test users');
    
    await prisma.subscription.deleteMany({});
    console.log('   ✅ Cleared subscriptions');
    
    await prisma.organization.deleteMany({
      where: {
        name: {
          contains: 'Test'
        }
      }
    });
    console.log('   ✅ Cleared test organizations');
    
    console.log('🎉 Test data cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing test data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearTestData();
