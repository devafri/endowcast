const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupDatabase() {
  try {
    console.log('🔗 Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Check if we have any organizations
    const orgCount = await prisma.organization.count();
    console.log(`📊 Current organizations: ${orgCount}`);
    
    // Create a demo organization if none exist
    if (orgCount === 0) {
      console.log('🏢 Creating demo organization...');
      
      const demoOrg = await prisma.organization.create({
        data: {
          name: 'Demo Foundation',
          contactEmail: 'demo@endowcast.com',
          industry: 'Education',
          size: 'Medium',
        }
      });
      
      console.log(`✅ Created demo organization: ${demoOrg.name} (ID: ${demoOrg.id})`);
      
      // Create a subscription for the demo org
      const subscription = await prisma.subscription.create({
        data: {
          organizationId: demoOrg.id,
          planType: 'FREE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          userLimit: 3,
          simulationsPerMonth: 50,
        }
      });
      
      console.log(`✅ Created subscription: ${subscription.planType} plan`);
      
      // Create a demo user (using simple hash for demo purposes)
      const crypto = require('crypto');
      const hashedPassword = crypto.createHash('sha256').update('demo123').digest('hex');
      
      const demoUser = await prisma.user.create({
        data: {
          email: 'demo@endowcast.com',
          firstName: 'Demo',
          lastName: 'User',
          password: hashedPassword,
          organizationId: demoOrg.id,
          role: 'ADMIN',
          jobTitle: 'Demo Administrator',
          emailVerified: true,
        }
      });
      
      console.log(`✅ Created demo user: ${demoUser.email} (ID: ${demoUser.id})`);
    }
    
    // Display current database stats
    const stats = {
      organizations: await prisma.organization.count(),
      subscriptions: await prisma.subscription.count(),
      users: await prisma.user.count(),
      simulations: await prisma.simulation.count(),
      portfolios: await prisma.portfolio.count(),
    };
    
    console.log('\n📈 Database Statistics:');
    console.log(`  Organizations: ${stats.organizations}`);
    console.log(`  Subscriptions: ${stats.subscriptions}`);
    console.log(`  Users: ${stats.users}`);
    console.log(`  Simulations: ${stats.simulations}`);
    console.log(`  Portfolios: ${stats.portfolios}`);
    
    console.log('\n🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();
