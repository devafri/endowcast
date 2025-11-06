const { PrismaClient } = require('@prisma/client');
const { verifyAndConsumeToken, createToken, TokenType } = require('../services/tokenService');
const { sendVerificationEmail } = require('../services/emailAuthService');

const prisma = new PrismaClient();

/**
 * Verifies a user's email address using a token.
 */
async function verifyEmail(req, res, next) {
  try {
    const isPost = req.method === 'POST';
    const source = isPost ? (req.body || {}) : (req.query || {});
    const token = source.token;
    const userId = source.userId || source.uid;

    if (!token || !userId) {
      if (isPost) {
        return res.status(400).json({ error: 'Missing token or user ID.' });
      }
      // Redirect to a frontend page that shows an error
      return res.redirect(`${process.env.FRONTEND_URL}/auth/verify-email/error?message=Missing token or user ID.`);
    }

    const validToken = await verifyAndConsumeToken(token, TokenType.EMAIL_VERIFICATION);

    if (!validToken || String(validToken.userId) !== String(userId)) {
        if (isPost) {
          return res.status(400).json({ error: 'Invalid or expired token.' });
        }
        return res.redirect(`${process.env.FRONTEND_URL}/auth/verify-email/error?message=Invalid or expired token.`);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    if (isPost) {
      return res.json({ message: 'Email verified successfully.' });
    }

    // Redirect to a success page on the frontend
    res.redirect(`${process.env.FRONTEND_URL}/auth/verify-email/success`);
  } catch (error) {
    if (req.method === 'POST') {
      console.error('Email verification failed:', error);
      return res.status(500).json({ error: 'Failed to verify email.' });
    }
    next(error);
  }
}

/**
 * Resends the verification email.
 */
async function resendVerificationEmail(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      if (user.emailVerified) {
        return res.status(400).json({ message: 'This email address has already been verified.' });
      }

      // Invalidate old tokens
      await prisma.userToken.deleteMany({
        where: { userId: user.id, type: TokenType.EMAIL_VERIFICATION },
      });

      // Create a new token (e.g., expires in 24 hours)
      const token = await createToken(user.id, TokenType.EMAIL_VERIFICATION, 24 * 60);

      await sendVerificationEmail(user.email, user.firstName, token, user.id);
    }

    // Always return a generic success message to prevent email enumeration
    res.status(200).json({ message: 'If your email is registered and unverified, a new verification link has been sent.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  verifyEmail,
  resendVerificationEmail,
};
