const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const securityService = require('../services/securityService');

// Initialize Prisma with optimized connection for Lambda
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Common CORS headers
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

/**
 * User Registration with Email Verification
 */
exports.register = async (event, context) => {
  // Lambda optimization
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const { email, password, firstName, lastName, organization, recaptchaToken } = JSON.parse(event.body);
    const userAgent = event.headers['User-Agent'] || '';
    const clientIp = event.requestContext?.identity?.sourceIp || '127.0.0.1';

    // Input validation
    if (!email || !password || !firstName || !lastName) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Email, password, first name, and last name are required' 
        })
      };
    }

    // Validate email format
    if (!securityService.validateEmail(email)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Validate password strength
    const passwordValidation = securityService.validatePassword(password);
    if (!passwordValidation.valid) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Password does not meet requirements',
          details: passwordValidation.issues
        })
      };
    }

    // Verify reCAPTCHA
    if (recaptchaToken) {
      const recaptchaResult = await securityService.verifyRecaptcha(recaptchaToken, clientIp);
      if (!recaptchaResult.success) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'reCAPTCHA verification failed',
            details: recaptchaResult.error
          })
        };
      }
    }

    // Detect suspicious activity
    const suspiciousActivity = securityService.detectSuspiciousActivity(
      email, firstName, lastName, organization, userAgent, clientIp
    );

    if (suspiciousActivity.recommendation === 'block') {
      console.log('Blocked suspicious registration attempt:', {
        email,
        signals: suspiciousActivity.signals,
        riskScore: suspiciousActivity.riskScore,
        ip: securityService.hashIpAddress(clientIp)
      });
      
      return {
        statusCode: 429,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Registration temporarily unavailable. Please try again later.' 
        })
      };
    }

    // Sanitize inputs
    const sanitizedData = {
      email: securityService.sanitizeInput(email.toLowerCase().trim()),
      firstName: securityService.sanitizeInput(firstName.trim()),
      lastName: securityService.sanitizeInput(lastName.trim()),
      organization: organization ? securityService.sanitizeInput(organization.trim()) : null
    };

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedData.email }
    });

    if (existingUser) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'An account with this email already exists' 
        })
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token
    const verificationToken = emailService.generateVerificationToken();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hours

    // Create user with verification token
    const user = await prisma.user.create({
      data: {
        email: sanitizedData.email,
        password: hashedPassword,
        firstName: sanitizedData.firstName,
        lastName: sanitizedData.lastName,
        organization: sanitizedData.organization,
        planType: 'FREE_TRIAL',
        emailVerified: false,
        verificationToken,
        verificationExpiry,
        isActive: false // User inactive until email verified
      }
    });

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        sanitizedData.email,
        sanitizedData.firstName,
        verificationToken
      );
    } catch (emailError) {
      // If email fails, delete the user to prevent orphaned accounts
      await prisma.user.delete({ where: { id: user.id } });
      
      console.error('Failed to send verification email:', emailError);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Failed to send verification email. Please try again.' 
        })
      };
    }

    // Log registration attempt (if suspicious but allowed)
    if (suspiciousActivity.suspicious) {
      console.log('Suspicious registration allowed:', {
        userId: user.id,
        email: sanitizedData.email,
        signals: suspiciousActivity.signals,
        riskScore: suspiciousActivity.riskScore
      });
    }

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Registration successful! Please check your email to verify your account.',
        userId: user.id,
        emailVerificationSent: true
      })
    };

  } catch (error) {
    console.error('Registration error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Registration failed. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

/**
 * Email Verification
 */
exports.verifyEmail = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const { token } = JSON.parse(event.body);

    if (!token) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Verification token is required' })
      };
    }

    // Find user with verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        emailVerified: false,
        verificationExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Invalid or expired verification token' 
        })
      };
    }

    // Update user as verified and active
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        isActive: true,
        verificationToken: null,
        verificationExpiry: null,
        lastLogin: new Date()
      }
    });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.firstName);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the verification if welcome email fails
    }

    // Generate JWT token for automatic login
    const jwtToken = jwt.sign(
      { userId: user.id, planType: user.planType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Email verified successfully! Welcome to EndowCast!',
        token: jwtToken,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          planType: updatedUser.planType,
          organization: updatedUser.organization,
          emailVerified: updatedUser.emailVerified
        }
      })
    };

  } catch (error) {
    console.error('Email verification error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Email verification failed. Please try again.' 
      })
    };
  }
};

/**
 * Resend Verification Email
 */
exports.resendVerification = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const { email } = JSON.parse(event.body);

    if (!email || !securityService.validateEmail(email)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Valid email address is required' })
      };
    }

    // Find unverified user
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        emailVerified: false
      }
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'If an unverified account exists with this email, a new verification email has been sent.'
        })
      };
    }

    // Generate new verification token
    const verificationToken = emailService.generateVerificationToken();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24);

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationExpiry
      }
    });

    // Send new verification email
    await emailService.sendVerificationEmail(
      user.email,
      user.firstName,
      verificationToken
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'A new verification email has been sent. Please check your inbox.'
      })
    };

  } catch (error) {
    console.error('Resend verification error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to resend verification email. Please try again.' 
      })
    };
  }
};

/**
 * User Login
 */
exports.login = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const { email, password, recaptchaToken } = JSON.parse(event.body);
    const clientIp = event.requestContext?.identity?.sourceIp || '127.0.0.1';

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }

    // Verify reCAPTCHA for login attempts (optional but recommended)
    if (recaptchaToken) {
      const recaptchaResult = await securityService.verifyRecaptcha(recaptchaToken, clientIp);
      if (!recaptchaResult.success) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Security verification failed. Please try again.' 
          })
        };
      }
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }

    // Check if user is active and email verified
    if (!user.isActive || !user.emailVerified) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Please verify your email address before logging in',
          requiresVerification: true
        })
      };
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, planType: user.planType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          planType: user.planType,
          organization: user.organization,
          emailVerified: user.emailVerified
        }
      })
    };

  } catch (error) {
    console.error('Login error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Login failed. Please try again.' 
      })
    };
  }
};

/**
 * Forgot Password
 */
exports.forgotPassword = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const { email, recaptchaToken } = JSON.parse(event.body);
    const clientIp = event.requestContext?.identity?.sourceIp || '127.0.0.1';

    if (!email || !securityService.validateEmail(email)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Valid email address is required' })
      };
    }

    // Verify reCAPTCHA
    if (recaptchaToken) {
      const recaptchaResult = await securityService.verifyRecaptcha(recaptchaToken, clientIp);
      if (!recaptchaResult.success) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Security verification failed. Please try again.' 
          })
        };
      }
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user || !user.emailVerified) {
      // Don't reveal if user exists for security
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'If an account exists with this email, a password reset link has been sent.'
        })
      };
    }

    // Generate password reset token
    const resetToken = emailService.generatePasswordResetToken();
    const resetExpiry = new Date();
    resetExpiry.setHours(resetExpiry.getHours() + 1); // 1 hour expiry

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetExpiry
      }
    });

    // Send password reset email
    await emailService.sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetToken
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'If an account exists with this email, a password reset link has been sent.'
      })
    };

  } catch (error) {
    console.error('Forgot password error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to process password reset request. Please try again.' 
      })
    };
  }
};

/**
 * Reset Password
 */
exports.resetPassword = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const { token, newPassword } = JSON.parse(event.body);

    if (!token || !newPassword) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Token and new password are required' })
      };
    }

    // Validate password strength
    const passwordValidation = securityService.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Password does not meet requirements',
          details: passwordValidation.issues
        })
      };
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Invalid or expired reset token' 
        })
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetExpiry: null,
        lastLogin: new Date()
      }
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Password reset successful! You can now log in with your new password.'
      })
    };

  } catch (error) {
    console.error('Reset password error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Password reset failed. Please try again.' 
      })
    };
  }
};
