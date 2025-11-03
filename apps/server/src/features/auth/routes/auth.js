const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const authController = require('../controllers/authController');
const { forgotPassword, resetPassword } = require('../controllers/passwordController');
const { verifyEmail, resendVerificationEmail } = require('../controllers/emailVerificationController');

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

// Auth routes
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);

// Password management
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Email verification
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Token verification
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
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
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            subscription: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ valid: false, error: 'Invalid or inactive user' });
    }

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
      },
      organization: user.organization,
      subscription: user.organization.subscription,
    });
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ 
      valid: false, 
      error: 'Invalid or expired token' 
    });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    // Invalidate the token (implementation depends on your token strategy)
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// GET /api/auth/session
router.get('/session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
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
      return res.status(401).json({ error: 'Invalid session' });
    }

    res.json({
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
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Debugging and testing routes (remove or secure in production)
router.get('/debug/subscription', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, organizationId: true, email: true }
    });
    
    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: decoded.organizationId },
      include: {
        organization: {
          select: { name: true, id: true }
        }
      }
    });

    const allSubscriptions = await prisma.subscription.findMany({
      where: { organizationId: decoded.organizationId }
    });

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

router.post('/debug/update-subscription', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { planType = 'ANALYST_PRO' } = req.body;

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
