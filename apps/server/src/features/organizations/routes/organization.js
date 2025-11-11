const express = require('express');
const prisma = require('../../../shared/db/prisma');
const { authenticateToken, requireAdmin, requireUserOrAdmin } = require('../../auth/middleware/auth');
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
    const organizationId = req.user.organizationId;
    const inviterId = req.user.id;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate role
    if (!['USER', 'ADMIN', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists in the organization
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        organizationId
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User is already a member of this organization' });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        organizationId,
        status: 'PENDING'
      }
    });

    if (existingInvitation) {
      return res.status(400).json({ error: 'An invitation has already been sent to this email' });
    }

    // Generate invitation token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    const invitation = await prisma.invitation.create({
      data: {
        email,
        organizationId,
        inviterId,
        role,
        token,
        expiresAt
      },
      include: {
        organization: true,
        inviter: true
      }
    });

    // Send invitation email
    const emailService = require('../../../infrastructure/email/emailService');
    
    try {
      await emailService.sendInvitationEmail({
        email,
        inviterName: `${invitation.inviter.firstName} ${invitation.inviter.lastName}`,
        organizationName: invitation.organization.name,
        invitationToken: token,
        role
      });

      res.json({
        success: true,
        message: 'Invitation sent successfully',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt
        }
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      
      // Delete the invitation if email failed
      await prisma.invitation.delete({
        where: { id: invitation.id }
      });
      
      res.status(500).json({ 
        error: 'Failed to send invitation email. Please try again.' 
      });
    }
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
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
      ANALYST_PRO: 50,
      FOUNDATION: 250,
      FOUNDATION_PRO: 500
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

// Accept invitation
router.post('/accept-invitation', async (req, res) => {
  try {
    const { token, password, firstName, lastName } = req.body;

    if (!token || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Token, password, firstName, and lastName are required' 
      });
    }

    // Find invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        token,
        status: 'PENDING',
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        organization: true
      }
    });

    if (!invitation) {
      return res.status(400).json({ 
        error: 'Invalid or expired invitation token' 
      });
    }

    // Check if user already exists globally
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email }
    });

    if (existingUser) {
      // If user exists, just add them to the organization
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          organizationId: invitation.organizationId,
          role: invitation.role
        }
      });

      // Mark invitation as accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date()
        }
      });

      return res.json({
        success: true,
        message: 'Invitation accepted successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          organizationId: updatedUser.organizationId
        }
      });
    }

    // Create new user
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        email: invitation.email,
        firstName,
        lastName,
        password: hashedPassword,
        organizationId: invitation.organizationId,
        role: invitation.role,
        emailVerified: true // Auto-verify since they came from invitation
      }
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    });

    // Send welcome email
    const emailService = require('../../../infrastructure/email/emailService');
    try {
      await emailService.sendWelcomeEmail(newUser.email, newUser.firstName);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the request if welcome email fails
    }

    res.json({
      success: true,
      message: 'Account created and invitation accepted successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        organizationId: newUser.organizationId
      }
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to accept invitation',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;