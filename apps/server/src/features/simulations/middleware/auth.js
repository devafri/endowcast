/**
 * Auth middleware for simulations
 * Provides JWT verification and PrismaClient instance
 */

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Middleware to authenticate requests via JWT token
 * Expects Authorization header: "Bearer <token>"
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(403).json({ error: 'Unauthorized - invalid token' });
  }
};

module.exports = {
  authenticateToken,
  prisma
};
