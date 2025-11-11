const jwt = require('jsonwebtoken');
const prisma = require('../../../shared/db/prisma');

// Main authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN  

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user with organization and subscription data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
        error: 'Invalid or expired token' 
      });
    }

    // Check if subscription is active
    const subscription = user.organization.subscription;
    if (subscription && subscription.status !== 'active') {
      return res.status(403).json({ 
        error: 'Organization subscription is not active',
        subscriptionStatus: subscription.status
      });
    }

    // Add user and organization data to request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization,
      subscription: subscription
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ 
      error: 'Invalid token' 
    });
  }
};

// Role-based middleware: require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

// Role-based middleware: require user or admin role
const requireUserOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!['USER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
};

// Authentication middleware for payment/billing routes - allows users without active subscriptions
const authenticateForPayments = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN  

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user with organization and subscription data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
        error: 'Invalid or expired token' 
      });
    }

    // Add user and organization data to request (no subscription status check)
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      organization: user.organization,
      subscription: user.organization.subscription
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ 
      error: 'Invalid token' 
    });
  }
};

module.exports = {
  authenticateToken,
  authenticateForPayments,
  requireAdmin,
  requireUserOrAdmin,
  prisma
};
