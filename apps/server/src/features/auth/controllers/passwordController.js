const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createToken, verifyAndConsumeToken, TokenType } = require('../services/tokenService');
const { sendPasswordResetEmail } = require('../services/emailAuthService');
const securityService = require('../services/securityService');

const prisma = new PrismaClient();

/**
 * Handles the request to initiate a password reset.
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    // Basic input validation
    if (!email || !securityService.validateEmail(email)) {
      // Still return a generic success message to prevent email enumeration
      return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    console.log('[FORGOT PASSWORD] User lookup:', { email, userFound: !!user });

    if (user) {
      // Invalidate old password reset tokens for this user
      await prisma.userToken.deleteMany({
        where: {
          userId: user.id,
          type: TokenType.PASSWORD_RESET,
        },
      });

      // Create a new password reset token that expires in 1 hour
      const token = await createToken(user.id, TokenType.PASSWORD_RESET, 60);
      
      console.log('[FORGOT PASSWORD] Token created, sending email to:', user.email);
      
      // Send the password reset email
      await sendPasswordResetEmail(user.email, user.firstName, token, user.id);
      
      console.log('[FORGOT PASSWORD] Email send completed');
    }

    // Always return a generic success message
    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Handles the actual password reset with a valid token.
 */
async function resetPassword(req, res, next) {
  try {
    const { token, userId, password } = req.body;

    // Input validation
    if (!token || !userId || !password) {
      return res.status(400).json({ error: 'Token, userId, and new password are required.' });
    }

    // Validate password strength
    const passwordValidation = securityService.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements.',
        details: passwordValidation.issues,
      });
    }

    // Verify the token
    const validToken = await verifyAndConsumeToken(token, TokenType.PASSWORD_RESET);

    if (!validToken || validToken.userId !== userId) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update the user's password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        // Optional: Force user to log in again by invalidating sessions if you have a session store
      },
    });

    // Optionally, you could send a confirmation email that the password has been changed.

    res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  forgotPassword,
  resetPassword,
};
