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
        planType: true,
        planExpires: true,
        planStarted: true,
        organization: true,
        jobTitle: true,
        simulationsUsed: true,
        simulationsReset: true,
        emailVerified: true,
        createdAt: true,
        lastLogin: true,
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Calculate simulation limits
    const limits = {
      FREE_TRIAL: 3,
      PROFESSIONAL: 50,
      INSTITUTION: 200
    };

    const simulationLimit = limits[user.planType] || 0;
    const simulationsRemaining = Math.max(0, simulationLimit - user.simulationsUsed);

    res.json({
      ...user,
      simulationLimit,
      simulationsRemaining
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
  body('organization').optional().trim(),
  body('jobTitle').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { firstName, lastName, organization, jobTitle } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(organization !== undefined && { organization }),
        ...(jobTitle !== undefined && { jobTitle }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        planType: true,
        planExpires: true,
        organization: true,
        jobTitle: true,
        simulationsUsed: true,
        updatedAt: true,
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
    const user = req.user;
    
    // Get simulation counts
    const simulationCounts = await prisma.simulation.groupBy({
      by: ['createdAt'],
      where: {
        userId: user.id,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) // This month
        }
      },
      _count: true
    });

    // Get plan limits
    const limits = {
      FREE_TRIAL: 3,
      PROFESSIONAL: 50,
      INSTITUTION: 200
    };

    const simulationLimit = limits[user.planType] || 0;
    const simulationsRemaining = Math.max(0, simulationLimit - user.simulationsUsed);

    // Calculate days until reset
    const nextReset = new Date(user.simulationsReset);
    nextReset.setMonth(nextReset.getMonth() + 1);
    const daysUntilReset = Math.ceil((nextReset - new Date()) / (1000 * 60 * 60 * 24));

    res.json({
      planType: user.planType,
      simulationLimit,
      simulationsUsed: user.simulationsUsed,
      simulationsRemaining,
      daysUntilReset: Math.max(0, daysUntilReset),
      nextResetDate: nextReset,
      planExpires: user.planExpires,
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
  body('planType').isIn(['PROFESSIONAL', 'INSTITUTION']).withMessage('Invalid plan type'),
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

    // Check current plan
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true, planExpires: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent downgrading
    const planHierarchy = { FREE_TRIAL: 0, PROFESSIONAL: 1, INSTITUTION: 2 };
    if (planHierarchy[currentUser.planType] >= planHierarchy[planType]) {
      return res.status(400).json({ 
        error: 'Cannot downgrade or stay on the same plan' 
      });
    }

    // Set plan expiration (1 year from now for paid plans)
    const planExpires = new Date();
    planExpires.setFullYear(planExpires.getFullYear() + 1);

    // Update user plan
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        planType,
        planExpires,
        planStarted: new Date(),
        // Reset simulations for new plan
        simulationsUsed: 0,
        simulationsReset: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        planType: true,
        planExpires: true,
        planStarted: true,
        simulationsUsed: true,
        simulationsReset: true,
      }
    });

    // Calculate new limits
    const limits = {
      FREE_TRIAL: 3,
      PROFESSIONAL: 50,
      INSTITUTION: 200
    };

    const simulationLimit = limits[updatedUser.planType];
    const simulationsRemaining = simulationLimit - updatedUser.simulationsUsed;

    res.json({
      message: 'Plan upgraded successfully',
      user: {
        ...updatedUser,
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
