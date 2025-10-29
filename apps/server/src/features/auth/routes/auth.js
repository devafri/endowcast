const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Validation middleware
const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('organizationName').optional().trim().isLength({ min: 1 }),
  body('jobTitle').optional().trim()
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Helper function to generate JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Helper function to calculate plan expiration
const calculatePlanExpiration = (planType) => {
  if (planType === 'FREE_TRIAL') return null;
  
  const expiration = new Date();
  expiration.setMonth(expiration.getMonth() + 1);
  return expiration;
};

// POST /api/auth/register
router.post('/register', validateRegister, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, organizationName, jobTitle } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'User already exists with this email' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create organization and user in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create organization
      const organization = await prisma.organization.create({
        data: {
          name: organizationName || `${firstName} ${lastName}'s Organization`,
          contactEmail: email,
        }
      });

      // Create subscription for organization
      const subscription = await prisma.subscription.create({
        data: {
          organizationId: organization.id,
          planType: 'FREE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }
      });

      // Create user as admin of the organization
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'ADMIN',
          organizationId: organization.id,
          jobTitle,
        }
      });

      return { user, organization, subscription };
    });

    // Generate JWT token with organization context
    const token = jwt.sign(
      { 
        userId: result.user.id,
        organizationId: result.organization.id,
        role: result.user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User and organization registered successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        organizationId: result.user.organizationId,
        jobTitle: result.user.jobTitle,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
      },
      subscription: {
        planType: result.subscription.planType,
        status: result.subscription.status,
      },
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    console.error('Error details:', error);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);
    res.status(500).json({ 
      error: 'Failed to register user and organization',
      details: error.message // Include error message for debugging
    });
  }
});

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, rememberMe } = req.body;

    // Find user with organization and subscription data
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          include: {
            subscription: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate JWT token with organization context
    const expiresIn = rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '7d');
    const token = jwt.sign(
      { 
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role
      }, 
      process.env.JWT_SECRET, 
      { expiresIn }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        jobTitle: user.jobTitle,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        industry: user.organization.industry,
      },
      subscription: user.organization.subscription,
      token,
      expiresIn
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Failed to login' 
    });
  }
});

// POST /api/auth/verify-token
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        error: 'Token is required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verification for user:', decoded.userId);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        jobTitle: true,
        isActive: true,
        createdAt: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            subscription: {
              select: {
                id: true,
                planType: true,
                status: true,
                simulationsUsed: true,
                simulationsReset: true,
                currentPeriodEnd: true,
                stripeSubscriptionId: true,
                createdAt: true,
                updatedAt: true,
              }
            }
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'Invalid or expired token' 
      });
    }

    console.log('User data found:', {
      userId: user.id,
      organizationId: user.organizationId,
      subscription: user.organization?.subscription
    });

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        jobTitle: user.jobTitle,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      organization: user.organization,
      subscription: user.organization?.subscription
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      valid: false,
      error: 'Invalid or expired token' 
    });
  }
});

// POST /api/auth/forgot-password (placeholder for future implementation)
router.post('/forgot-password', async (req, res) => {
  res.status(501).json({ 
    error: 'Password reset functionality coming soon',
    message: 'Please contact support@endowcast.com for password reset assistance'
  });
});

// GET /api/auth/debug/subscription - Debug endpoint to check subscription status
router.get('/debug/subscription', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Debug subscription - Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Debug subscription - Token length:', token.length);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Debug subscription - Decoded token:', { userId: decoded.userId, organizationId: decoded.organizationId });
    
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, organizationId: true, email: true }
    });
    console.log('Debug subscription - User found:', user);
    
    // Get subscription data
    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: decoded.organizationId },
      include: {
        organization: {
          select: { name: true, id: true }
        }
      }
    });
    console.log('Debug subscription - Subscription found:', subscription);

    // Get all subscriptions for debugging
    const allSubscriptions = await prisma.subscription.findMany({
      where: { organizationId: decoded.organizationId }
    });
    console.log('Debug subscription - All subscriptions for org:', allSubscriptions);

    res.json({
      success: true,
      organizationId: decoded.organizationId,
      user,
      subscription,
      allSubscriptions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug subscription error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
});

// POST /api/auth/debug/update-subscription - Manually update subscription for testing
router.post('/debug/update-subscription', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { planType = 'ANALYST_PRO' } = req.body;

    console.log(`Manually updating subscription for org ${decoded.organizationId} to ${planType}`);

    const updatedSubscription = await prisma.subscription.update({
      where: { organizationId: decoded.organizationId },
      data: {
        planType,
        status: 'active',
        stripeSubscriptionId: 'manual_test_sub_123',
        stripePriceId: 'manual_test_price_123',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        updatedAt: new Date()
      }
    });

    console.log('Subscription updated manually:', updatedSubscription);

    res.json({
      success: true,
      message: `Subscription updated to ${planType}`,
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error('Manual subscription update error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
