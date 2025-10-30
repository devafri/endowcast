const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function upgradeUserToFoundationPro(email) {
  try {
    console.log(`🔧 Upgrading user ${email} to FOUNDATION_PRO...\n`);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: { include: { subscription: true } } }
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      console.log('\n💡 Available users:');
      const users = await prisma.user.findMany({
        include: { organization: { include: { subscription: true } } }
      });
      users.forEach(u => {
        console.log(`   - ${u.email} (${u.firstName} ${u.lastName})`);
      });
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName}`);
    console.log(`📊 Organization: ${user.organization.name}`);
    console.log(`Current Plan: ${user.organization.subscription.planType}\n`);

    // Update subscription to FOUNDATION_PRO
    const updatedSubscription = await prisma.subscription.update({
      where: { organizationId: user.organizationId },
      data: {
        planType: 'FOUNDATION_PRO',
        status: 'active',
        simulationsUsed: 0,
        simulationsReset: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      }
    });

    console.log('🎉 User upgraded successfully!\n');
    console.log('📊 Upgrade Summary:');
    console.log(`  📧 Email: ${user.email}`);
    console.log(`  👤 Name: ${user.firstName} ${user.lastName}`);
    console.log(`  🏢 Organization: ${user.organization.name}`);
    console.log(`  📊 New Plan: ${updatedSubscription.planType}`);
    console.log(`  🚀 Simulations: Unlimited`);
    console.log(`  ✨ Status: ${updatedSubscription.status}`);
    console.log(`  ⏳ Valid Until: ${new Date(updatedSubscription.currentPeriodEnd).toLocaleDateString()}\n`);

  } catch (error) {
    console.error('❌ Error upgrading user:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide an email address as argument');
  console.error('\nUsage: node upgrade-user.js your-email@example.com');
  console.error('\nExample: node upgrade-user.js felix@example.com');
  process.exit(1);
}

upgradeUserToFoundationPro(email)
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
