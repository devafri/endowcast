const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../../auth/middleware/auth');
const prisma = require('../../../shared/db/prisma');

// Get current subscription details
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: req.user.organizationId },
      include: {
        organization: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!subscription) {
      return res.json({
        planType: 'FREE',
        status: 'ACTIVE',
        organization: await prisma.organization.findUnique({
          where: { id: req.user.organizationId }
        })
      });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});

// Change subscription plan
router.post('/change-plan', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { planType, billingCycle = 'MONTHLY' } = req.body;
    const organizationId = req.user.organizationId;

    // Validate plan type
    const validPlans = ['PROFESSIONAL', 'INSTITUTION'];
    if (!validPlans.includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // Validate billing cycle
    if (!['MONTHLY', 'ANNUAL'].includes(billingCycle)) {
      return res.status(400).json({ error: 'Invalid billing cycle' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Get price mapping
    let priceMap;
    try {
      priceMap = JSON.parse(process.env.STRIPE_PRICE_IDS || '{}');
    } catch (e) {
      return res.status(500).json({ error: 'Invalid Stripe price configuration' });
    }

    const priceKey = `${planType}_${billingCycle}`;
    const priceId = priceMap[priceKey];

    if (!priceId) {
      return res.status(400).json({ error: `Price not found for ${priceKey}` });
    }

    // Check current subscription
    const currentSubscription = await prisma.subscription.findUnique({
      where: { organizationId }
    });

    if (currentSubscription?.stripeSubscriptionId) {
      // Update existing Stripe subscription
      const updatedSubscription = await stripe.subscriptions.update(
        currentSubscription.stripeSubscriptionId,
        {
          items: [{
            id: currentSubscription.stripeSubscriptionId,
            price: priceId,
          }],
          proration_behavior: 'create_prorations',
        }
      );

      // Update local subscription
      await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          planType,
          billingCycle,
          stripePriceId: priceId,
          currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
        }
      });

      res.json({
        success: true,
        message: 'Subscription updated successfully',
        subscription: updatedSubscription
      });
    } else {
      // Create new checkout session for plan change
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/organization?success=true&plan=${planType}`,
        cancel_url: `${process.env.FRONTEND_URL}/organization?canceled=true`,
        client_reference_id: organizationId,
        metadata: {
          organizationId,
          planType,
          billingCycle
        }
      });

      res.json({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id
      });
    }
  } catch (error) {
    console.error('Error changing plan:', error);
    res.status(500).json({ error: 'Failed to change subscription plan' });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: { organization: true }
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Cancel the Stripe subscription at period end
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    // Update local subscription
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { 
        status: 'CANCELLED',
        // Keep access until current period ends
        currentPeriodEnd: new Date(canceledSubscription.current_period_end * 1000)
      }
    });

    // Send cancellation email
    const emailService = require('../../../infrastructure/email/emailService');
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    try {
      await emailService.sendCancellationEmail({
        email: user.email,
        firstName: user.firstName,
        planType: subscription.planType,
        planExpires: new Date(canceledSubscription.current_period_end * 1000)
      });
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Subscription canceled successfully',
      accessUntil: new Date(canceledSubscription.current_period_end * 1000)
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Reactivate canceled subscription
router.post('/reactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId }
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    if (subscription.status !== 'CANCELLED') {
      return res.status(400).json({ error: 'Subscription is not canceled' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Reactivate the Stripe subscription
    const reactivatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );

    // Update local subscription
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { 
        status: 'ACTIVE',
        currentPeriodEnd: new Date(reactivatedSubscription.current_period_end * 1000)
      }
    });

    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
      subscription: reactivatedSubscription
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// Create billing portal session
router.post('/billing-portal', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId }
    });

    if (!subscription?.stripeCustomerId) {
      return res.status(404).json({ error: 'No customer found' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/organization`,
    });

    res.json({
      success: true,
      portalUrl: session.url
    });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// Get usage and billing history
router.get('/billing-history', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const payments = await prisma.payment.findMany({
      where: { 
        subscription: {
          organizationId
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json({ payments });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

module.exports = router;
