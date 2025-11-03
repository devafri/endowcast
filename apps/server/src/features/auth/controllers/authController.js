const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { sendVerificationEmail } = require('../services/emailAuthService');
const { createToken, TokenType } = require('../services/tokenService');

const prisma = new PrismaClient();

// Helper function to generate JWT
const generateToken = (user, rememberMe) => {
  const payload = { 
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role
  };
  const expiresIn = rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '7d');
  return jwt.sign(
    payload,
    process.env.JWT_SECRET, 
    { expiresIn }
  );
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, organizationName, jobTitle } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'User already exists with this email' 
      });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await prisma.$transaction(async (prisma) => {
      const organization = await prisma.organization.create({
        data: {
          name: organizationName || `${firstName} ${lastName}'s Organization`,
          contactEmail: email,
        }
      });

      const subscription = await prisma.subscription.create({
        data: {
          organizationId: organization.id,
          planType: 'FREE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }
      });

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

    // Generate email verification token
    const verificationToken = await createToken(result.user.id, TokenType.EMAIL_VERIFICATION, 24 * 60); // 24 hours
    
    // Send verification email, but don't block the response
    sendVerificationEmail(
      result.user.email,
      result.user.firstName,
      verificationToken,
      result.user.id
    ).catch(console.error);

    const token = generateToken(result.user, false);

    res.status(201).json({
      message: 'User and organization registered successfully. Please check your email to verify your account.',
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
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Failed to register user and organization',
      details: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, rememberMe } = req.body;

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
    
    if (!user.emailVerified) {
      // Resend verification email as a courtesy
      sendVerificationEmail(user).catch(console.error);
      return res.status(403).json({
        error: 'Email not verified',
        message: 'You must verify your email address before you can log in. A new verification link has been sent to your email.'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const token = generateToken(user, rememberMe);
    const expiresIn = rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '7d');

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        jobTitle: user.jobTitle,
        emailVerified: user.emailVerified,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
      subscription: user.organization.subscription,
      token,
      expiresIn
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      details: error.message 
    });
  }
};

module.exports = {
  register,
  login,
};
