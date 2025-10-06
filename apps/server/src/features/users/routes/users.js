const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, prisma } = require('../../auth/middleware/auth');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

// GET /api/users/profile
router.get('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        jobTitle: true,
        department: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        lastLogin: true,
        organization: {
          select: {
            id: true,
            name: true,
            domain: true,
            subscription: {
              select: {
                planType: true,
                status: true,
                simulationsPerMonth: true,
                simulationsUsed: true,
                simulationsReset: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Extract subscription info
    const subscription = user.organization?.subscription;
    const planType = subscription?.planType || 'FREE';
    
    // Calculate simulation limits based on plan
    const limits = {
      FREE: 10,
      ANALYST_PRO: 50,
      FOUNDATION: 250,
      FOUNDATION_PRO: 500
    };

    const simulationLimit = limits[planType];
    const simulationsUsed = subscription?.simulationsUsed || 0;
    const simulationsRemaining = simulationLimit === -1 ? -1 : Math.max(0, simulationLimit - simulationsUsed);

    res.json({
      ...user,
      planType,
      simulationLimit,
      simulationsUsed,
      simulationsRemaining,
      subscriptionStatus: subscription?.status,
      currentPeriodEnd: subscription?.currentPeriodEnd,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Failed to get user profile' 
    });
  }
});

// PUT /api/users/profile
router.put('/profile', [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('jobTitle').optional().trim(),
  body('department').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { firstName, lastName, jobTitle, department } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(jobTitle !== undefined && { jobTitle }),
        ...(department !== undefined && { department }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        department: true,
        updatedAt: true,
        organization: {
          select: {
            name: true,
            subscription: {
              select: {
                planType: true
              }
            }
          }
        }
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile' 
    });
  }
});

// GET /api/users/usage
router.get('/usage', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        organization: {
          select: {
            subscription: {
              select: {
                planType: true,
                simulationsPerMonth: true,
                simulationsUsed: true,
                simulationsReset: true,
                currentPeriodEnd: true
              }
            }
          }
        }
      }
    });

    if (!user?.organization?.subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = user.organization.subscription;
    
    // Get simulation counts for this month
    const simulationCounts = await prisma.simulation.groupBy({
      by: ['createdAt'],
      where: {
        userId: req.user.id,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) // This month
        }
      },
      _count: true
    });

    // Get plan limits
    const limits = {
      FREE: 10,
      ANALYST_PRO: 50,
      FOUNDATION: 250,
      FOUNDATION_PRO: 500
    };

    const simulationLimit = limits[subscription.planType];
    const simulationsUsed = subscription.simulationsUsed;
    const simulationsRemaining = simulationLimit === -1 ? -1 : Math.max(0, simulationLimit - simulationsUsed);

    // Calculate days until reset
    const nextReset = new Date(subscription.currentPeriodEnd);
    const daysUntilReset = Math.ceil((nextReset - new Date()) / (1000 * 60 * 60 * 24));

    res.json({
      planType: subscription.planType,
      simulationLimit,
      simulationsUsed,
      simulationsRemaining,
      daysUntilReset: Math.max(0, daysUntilReset),
      nextResetDate: nextReset,
      currentPeriodEnd: subscription.currentPeriodEnd,
      monthlyUsage: simulationCounts.length
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ 
      error: 'Failed to get usage information' 
    });
  }
});

// POST /api/users/upgrade-plan
router.post('/upgrade-plan', [
  body('planType').isIn(['ANALYST_PRO', 'FOUNDATION', 'FOUNDATION_PRO']).withMessage('Invalid plan type'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { planType } = req.body;
    const userId = req.user.id;

    // Get current subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        organization: {
          select: {
            subscription: {
              select: {
                id: true,
                planType: true,
                currentPeriodEnd: true
              }
            }
          }
        }
      }
    });

    if (!user?.organization?.subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const currentSubscription = user.organization.subscription;

    // Prevent downgrading
    const planHierarchy = { FREE: 0, ANALYST_PRO: 1, FOUNDATION: 2, FOUNDATION_PRO: 3 };
    if (planHierarchy[currentSubscription.planType] >= planHierarchy[planType]) {
      return res.status(400).json({ 
        error: 'Cannot downgrade or stay on the same plan' 
      });
    }

    // Set new plan limits
    const planLimits = {
      ANALYST_PRO: 50,
      FOUNDATION: 250,
      FOUNDATION_PRO: 500
    };

    // Set plan expiration (1 year from now for paid plans)
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);

    // Update subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        planType,
        simulationsPerMonth: planLimits[planType],
        currentPeriodEnd,
        // Reset simulations for new plan
        simulationsUsed: 0,
        simulationsReset: new Date()
      },
      select: {
        planType: true,
        simulationsPerMonth: true,
        simulationsUsed: true,
        currentPeriodEnd: true,
      }
    });

    // Get updated user info
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organization: {
          select: {
            name: true,
            subscription: {
              select: {
                planType: true,
                simulationsPerMonth: true,
                simulationsUsed: true,
                currentPeriodEnd: true,
              }
            }
          }
        }
      }
    });

    const simulationLimit = updatedSubscription.simulationsPerMonth;
    const simulationsRemaining = simulationLimit === -1 ? -1 : simulationLimit - updatedSubscription.simulationsUsed;

    res.json({
      message: 'Plan upgraded successfully',
      user: {
        ...updatedUser,
        planType: updatedSubscription.planType,
        simulationLimit,
        simulationsRemaining
      }
    });
  } catch (error) {
    console.error('Upgrade plan error:', error);
    res.status(500).json({ 
      error: 'Failed to upgrade plan' 
    });
  }
});

// DELETE /api/users/account
router.delete('/account', async (req, res) => {
  try {
    // Delete all user data (cascading deletes handled by Prisma schema)
    await prisma.user.delete({
      where: { id: req.user.id }
    });

    res.json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ 
      error: 'Failed to delete account' 
    });
  }
});

module.exports = router;
