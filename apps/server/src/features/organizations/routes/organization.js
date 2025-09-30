const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin, requireUserOrAdmin } = require('../../auth/middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Get current organization details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      include: {
        subscription: true,
        _count: {
          select: {
            users: true,
            simulations: true
          }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        industry: organization.industry,
        createdAt: organization.createdAt,
        userCount: organization._count.users,
        simulationCount: organization._count.simulations
      },
      subscription: organization.subscription
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to get organization details' });
  }
});

// Update organization details
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, industry } = req.body;
    
    const organization = await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: {
        ...(name && { name }),
        ...(industry && { industry })
      },
      include: {
        subscription: true
      }
    });

    res.json({ organization });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Get organization users
router.get('/users', authenticateToken, requireUserOrAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: req.user.organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        lastLogin: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    console.error('Get organization users error:', error);
    res.status(500).json({ error: 'Failed to get organization users' });
  }
});

// Invite user to organization (admin only)
router.post('/invite', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, role = 'USER' } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // For now, just return success - full invitation system would need email service
    res.json({ 
      message: 'Invitation would be sent',
      email,
      role,
      organizationId: req.user.organizationId
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// Update user role (admin only)
router.put('/users/:userId/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent removing last admin
    if (role !== 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { 
          organizationId: req.user.organizationId,
          role: 'ADMIN'
        }
      });

      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove last admin' });
      }
    }

    const user = await prisma.user.update({
      where: { 
        id: userId,
        organizationId: req.user.organizationId
      },
      data: { role },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get organization usage statistics  
router.get('/usage', authenticateToken, requireUserOrAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalSimulations, monthlySimulations, subscription] = await Promise.all([
      prisma.simulation.count({
        where: { organizationId: req.user.organizationId }
      }),
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

    const limits = {
      FREE: 10,
      ANALYST_PRO: 100,
      FOUNDATION: 500,
      FOUNDATION_PRO: -1 // unlimited
    };

    const monthlyLimit = limits[subscription?.planType] || 10;

    res.json({
      usage: {
        totalSimulations,
        monthlySimulations,
        monthlyLimit,
        remainingSimulations: monthlyLimit === -1 ? 'unlimited' : Math.max(0, monthlyLimit - monthlySimulations)
      },
      subscription: {
        planType: subscription?.planType,
        status: subscription?.status,
        currentPeriodEnd: subscription?.currentPeriodEnd
      }
    });
  } catch (error) {
    console.error('Get usage statistics error:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

module.exports = router;