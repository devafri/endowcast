const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createFoundationProTestUser() {
  try {
    console.log('🔧 Creating FOUNDATION_PRO test user...');

    // Hash password
    const hashedPassword = await bcrypt.hash('testpassword123', 12);

    // Create the user, organization, and subscription in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Create organization
      const organization = await prisma.organization.create({
        data: {
          name: 'Test Foundation Pro Organization',
          contactEmail: 'test@foundationpro.com',
          industry: 'Education',
          size: 'Large (1000+ employees)',
        }
      });

      console.log('✅ Created organization:', organization.id);

      // 2. Create subscription with FOUNDATION_PRO plan
      const subscription = await prisma.subscription.create({
        data: {
          organizationId: organization.id,
          planType: 'FOUNDATION_PRO',
          billingCycle: 'ANNUAL',
          status: 'ACTIVE',
          userLimit: 50, // High limit for Foundation Pro
          simulationsPerMonth: -1, // -1 indicates unlimited
          simulationsUsed: 0,
          simulationsReset: new Date(),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          trialEnds: null, // No trial for paid plan
        }
      });

      console.log('✅ Created FOUNDATION_PRO subscription:', subscription.id);

      // 3. Create admin user for the organization
      const user = await prisma.user.create({
        data: {
          email: 'test@foundationpro.com',
          password: hashedPassword,
          firstName: 'Foundation',
          lastName: 'Pro User',
          role: 'ADMIN',
          organizationId: organization.id,
          jobTitle: 'Chief Investment Officer',
          isActive: true,
        }
      });

      console.log('✅ Created test user:', user.id);

      return { user, organization, subscription };
    });

    console.log('\n🎉 FOUNDATION_PRO test user created successfully!');
    console.log('\n📧 Login Credentials:');
    console.log('Email:', result.user.email);
    console.log('Password: testpassword123');
    console.log('\n🏢 Organization:', result.organization.name);
    console.log('📊 Plan Type:', result.subscription.planType);
    console.log('🚀 Simulations:', result.subscription.simulationsPerMonth === -1 ? 'Unlimited' : result.subscription.simulationsPerMonth);
    console.log('👤 User Role:', result.user.role);

    return result;

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createFoundationProTestUser()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = createFoundationProTestUser;
