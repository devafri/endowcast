const express = require('express');
const router = express.Router();

// Reuse existing auth middleware which attaches req.user
const { authenticateToken } = require('../../auth/middleware/auth');

// Temporary debug endpoint to verify a Bearer token and return decoded user info.
// This route is intended to be opt-in. Enable it by setting ENABLE_WHOAMI=true
// in the environment, or it will be available automatically in non-production
// environments (NODE_ENV !== 'production').
router.get('/whoami', authenticateToken, async (req, res) => {
  try {
    // req.user is populated by authenticateToken middleware
    const safeUser = {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      organizationId: req.user.organizationId,
      organization: req.user.organization ? {
        id: req.user.organization.id,
        name: req.user.organization.name,
        // avoid leaking sensitive subscription provider details
        subscription: req.user.subscription ? {
          id: req.user.subscription.id,
          status: req.user.subscription.status,
          plan: req.user.subscription.plan
        } : null
      } : null
    };

    return res.json({
      ok: true,
      user: safeUser
    });
  } catch (err) {
    console.error('Whoami route error:', err);
    return res.status(500).json({ error: 'Failed to decode token' });
  }
});

module.exports = router;
