const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Create checkout session for plan purchase
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  const { planType } = req.body;

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_IDS) {
    return res.status(500).json({ error: 'Stripe not configured on this server' });
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // STRIPE_PRICE_IDS is a JSON map like {"ANALYST_PRO":"price_...","FOUNDATION":"price_..."}
    const priceMap = JSON.parse(process.env.STRIPE_PRICE_IDS);
    const priceId = priceMap[planType];

    if (!priceId) return res.status(400).json({ error: 'Unknown plan' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pricing`,
      client_reference_id: req.user.organizationId,
      metadata: { userId: req.user.id }
    });

    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

module.exports = router;
