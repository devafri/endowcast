const prisma = require('../db/prisma');

// Track simulation usage for the organization
const trackSimulationUsage = async (req, res, next) => {
  try {
    if (!req.user || !req.user.organizationId) {
      return next();
    }

    // Check current usage for this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthlyUsage, subscription] = await Promise.all([
      prisma.simulation.count({
        where: {
          organizationId: req.user.organizationId,
          createdAt: { gte: startOfMonth }
        }
      }),
      prisma.subscription.findUnique({
        where: { organizationId: req.user.organizationId }
      })
    ]);

    // Define limits based on plan type
    const limits = {
      FREE: 10,
      ANALYST_PRO: 50,
      FOUNDATION: 250,
      FOUNDATION_PRO: 500 // unlimited
    };

    const monthlyLimit = limits[subscription?.planType] || 10;

    // Check if limit exceeded
    if (monthlyLimit !== -1 && monthlyUsage >= monthlyLimit) {
      return res.status(429).json({
        error: 'Monthly simulation limit exceeded',
        details: {
          currentUsage: monthlyUsage,
          monthlyLimit,
          planType: subscription?.planType || 'FREE'
        }
      });
    }

    // Add usage info to request for reference
    req.usage = {
      currentUsage: monthlyUsage,
      monthlyLimit,
      remainingSimulations: monthlyLimit === -1 ? 'unlimited' : monthlyLimit - monthlyUsage
    };

    next();
  } catch (error) {
    console.error('Usage tracking error:', error);
    // Don't block the request if usage tracking fails
    next();
  }
};

// Get usage statistics for organization
const getUsageStats = async (organizationId) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalSimulations, monthlySimulations, subscription] = await Promise.all([
      prisma.simulation.count({
        where: { organizationId }
      }),
      prisma.simulation.count({
        where: { 
          organizationId,
          createdAt: { gte: startOfMonth }
        }
      }),
      prisma.subscription.findUnique({
        where: { organizationId }
      })
    ]);

    const limits = {
      FREE: 10,
      ANALYST_PRO: 50,
      FOUNDATION: 250,
      FOUNDATION_PRO:500
    };

    const monthlyLimit = limits[subscription?.planType] || 10;

    return {
      totalSimulations,
      monthlySimulations,
      monthlyLimit,
      remainingSimulations: monthlyLimit === -1 ? 'unlimited' : Math.max(0, monthlyLimit - monthlySimulations),
      planType: subscription?.planType || 'FREE',
      subscriptionStatus: subscription?.status || 'active'
    };
  } catch (error) {
    console.error('Get usage stats error:', error);
    throw error;
  }
};

module.exports = {
  trackSimulationUsage,
  getUsageStats
};