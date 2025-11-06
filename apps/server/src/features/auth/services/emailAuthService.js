const { sendEmail } = require('../../../infrastructure/email/sesService');

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';

function getPasswordResetTemplate(name, resetLink) {
  const subject = 'Reset your EndowCast password';

  const htmlBody = `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h2>Password Reset Request</h2>
      <p>Hi ${name || 'there'},</p>
      <p>We received a request to reset the password for your EndowCast account. Click the button below to set a new password. This link will expire in 60 minutes.</p>
      <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #0369a1; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
      <p style="margin-top: 24px;">If you can't click the button, copy and paste this link into your browser:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn't request this, you can safely ignore this email — no changes will be made.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #718096;">The EndowCast Team</p>
    </div>
  `;

  const textBody = `
Hi ${name || 'there'},

We received a request to reset the password for your EndowCast account. Click the link below to set a new password. This link will expire in 60 minutes.

Reset password: ${resetLink}

If you didn't request this, you can safely ignore this email — no changes will be made.

Thanks,
The EndowCast Team
  `;

  return { subject, htmlBody, textBody };
}

function getEmailVerificationTemplate(name, verificationLink) {
    const subject = 'Confirm your EndowCast email address';
  
    const htmlBody = `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <h2>Welcome to EndowCast!</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Thanks for signing up. Please confirm your email address by clicking the button below. This link will expire in 24 hours.</p>
        <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #0369a1; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
        <p style="margin-top: 24px;">If you can't click the button, copy and paste this link into your browser:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
        <p>If you didn't sign up for EndowCast, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #718096;">The EndowCast Team</p>
      </div>
    `;
  
    const textBody = `
  Hi ${name || 'there'},
  
  Thanks for signing up for EndowCast! Please confirm your email address by clicking the link below. This link will expire in 24 hours.
  
  Verify your email: ${verificationLink}
  
  If you didn't sign up, you can safely ignore this email.
  
  Thanks,
  The EndowCast Team
    `;
  
    return { subject, htmlBody, textBody };
  }

/**
 * Sends a password reset email.
 * @param {string} to - The recipient's email address.
 * @param {string} name - The recipient's name.
 * @param {string} token - The password reset token.
 * @param {string} userId - The user's ID.
 */
async function sendPasswordResetEmail(to, name, token, userId) {
  const resetLink = `${FRONTEND_URL}/auth/reset-password?token=${token}&uid=${userId}`;
  const { subject, htmlBody, textBody } = getPasswordResetTemplate(name, resetLink);
  await sendEmail({ to, subject, htmlBody, textBody });
}

/**
 * Sends an email verification email.
 * @param {string} to - The recipient's email address.
 * @param {string} name - The recipient's name.
 * @param {string} token - The verification token.
 * @param {string} userId - The user's ID.
 */
async function sendVerificationEmail(to, name, token, userId) {
  const encodedToken = encodeURIComponent(token);
  const encodedUserId = encodeURIComponent(userId);
  const verificationLink = `${FRONTEND_URL}/auth/verify-email?token=${encodedToken}&uid=${encodedUserId}&userId=${encodedUserId}`;
    const { subject, htmlBody, textBody } = getEmailVerificationTemplate(name, verificationLink);
    await sendEmail({ to, subject, htmlBody, textBody });
}

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
};
