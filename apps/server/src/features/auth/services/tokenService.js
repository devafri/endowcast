const crypto = require('crypto');
const prisma = require('../../../shared/db/prisma');
const { TokenType } = require('@prisma/client');

/**
 * Generates a cryptographically secure random token.
 * @param {number} length - The length of the raw token in bytes.
 * @returns {string} A hex-encoded token.
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hashes a token using SHA256.
 * @param {string} rawToken - The raw token to hash.
 * @returns {string} The SHA256 hash of the token.
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Creates a new token for a user.
 * @param {string} userId - The ID of the user.
 * @param {TokenType} type - The type of the token (e.g., EMAIL_VERIFICATION, PASSWORD_RESET).
 * @param {number} expiresInMinutes - The token's lifespan in minutes.
 * @returns {Promise<string>} The raw token.
 */
async function createToken(userId, type, expiresInMinutes) {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await prisma.userToken.create({
    data: {
      userId,
      type,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken;
}

/**
 * Verifies and consumes a token.
 * @param {string} rawToken - The raw token from the user.
 * @param {TokenType} type - The expected type of the token.
 * @returns {Promise<import('@prisma/client').UserToken | null>} The token record if valid, otherwise null.
 */
async function verifyAndConsumeToken(rawToken, type) {
  const tokenHash = hashToken(rawToken);

  const token = await prisma.userToken.findUnique({
    where: { tokenHash },
  });

  if (!token || token.type !== type || token.usedAt || token.expiresAt < new Date()) {
    return null;
  }

  // Mark the token as used
  return prisma.userToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });
}

module.exports = {
  generateToken,
  hashToken,
  createToken,
  verifyAndConsumeToken,
  TokenType,
};
