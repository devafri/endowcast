const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Stripe webhook handler - requires raw body for signature verification
router.post('/stripe', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('Stripe webhook called but keys not configured');
    return res.status(400).json({ error: 'Stripe not configured' });
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  // Diagnostics: log incoming webhook metadata (safe to log headers except secret)
  try {
    const rawPreview = (req.body && typeof req.body === 'string') ? req.body.slice(0, 200) : JSON.stringify(req.body || {}).slice(0,200);
    console.log('Stripe webhook received: headers:', { 'stripe-signature': !!sig }, 'bodyPreview:', rawPreview, 'bodyLength:', req.body ? (req.body.length || JSON.stringify(req.body).length) : 0);
  } catch (diagErr) {
    console.warn('Failed to log webhook preview:', diagErr.message || diagErr);
  }

  try {
    // Verify webhook signature using raw body
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log('Stripe webhook event:', event.type, event.id);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Handling checkout.session.completed for id:', event.data.object.id);
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      default:
        console.log('Unhandled webhook event type:', event.type);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleCheckoutCompleted(session) {
  console.log('Processing checkout completion:', session.id);
  
  const organizationId = session.client_reference_id;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  console.log('checkout.session details: client_reference_id=', organizationId, 'customer=', customerId, 'subscription=', subscriptionId);
  
  if (!organizationId) {
    console.error('No organization ID in checkout session. session metadata:', session.metadata || {});
    return;
  }

  // Get subscription details from Stripe
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Map Stripe price ID to our plan type
  const priceId = subscription.items.data[0].price.id;
  let planType = null;
  try {
    planType = await getPlanTypeFromPriceId(priceId);
  } catch (e) {
    console.error('Error mapping priceId to planType:', priceId, e.message || e);
  }
  
  if (!planType) {
    console.error('Unknown price ID:', priceId, ' - ensure STRIPE_PRICE_IDS includes this price. subscription.items:', subscription.items.data);
    return;
  }

  // Update or create subscription record
  try {
    const upsertResult = await prisma.subscription.upsert({
      where: { organizationId },
      update: {
        planType,
        status: subscription.status,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
      create: {
        organizationId,
        planType,
        status: subscription.status,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        simulationsUsed: 0,
        simulationsReset: new Date(),
      }
    });
    console.log('Upserted subscription result:', { id: upsertResult.id, organizationId: upsertResult.organizationId, planType: upsertResult.planType });
  } catch (e) {
    console.error('Failed to upsert subscription for org', organizationId, e.message || e);
  }

  // Create payment record
  try {
    const payment = await prisma.payment.create({
      data: {
        organizationId,
        amount: session.amount_total / 100, // Convert from cents
        currency: session.currency,
        status: 'succeeded',
        stripePaymentIntentId: session.payment_intent,
        description: `Subscription: ${planType}`,
      }
    });
    console.log('Created payment record id:', payment.id, 'amount:', payment.amount);
  } catch (e) {
    console.error('Failed to create payment record for org', organizationId, e.message || e);
  }

  console.log(`Subscription created/updated for org ${organizationId}: ${planType}`);
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Processing successful payment:', invoice.id);
  
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;
  
  // Find organization by Stripe customer ID
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId }
  });
  
  if (!subscription) {
    console.error('No subscription found for customer:', customerId);
    return;
  }

  // Create payment record
  await prisma.payment.create({
    data: {
      organizationId: subscription.organizationId,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: 'succeeded',
      stripeInvoiceId: invoice.id,
      description: 'Subscription payment',
    }
  });

  // Reset usage counter for new billing period if this is a recurring payment
  if (invoice.billing_reason === 'subscription_cycle') {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        simulationsUsed: 0,
        simulationsReset: new Date(),
      }
    });
    console.log('Usage counter reset for subscription:', subscriptionId);
  }
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('Processing failed payment:', invoice.id);
  
  const customerId = invoice.customer;
  
  // Find and update subscription status
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId }
  });
  
  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'past_due' }
    });

    // Create failed payment record
    await prisma.payment.create({
      data: {
        organizationId: subscription.organizationId,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        status: 'failed',
        stripeInvoiceId: invoice.id,
        description: 'Failed subscription payment',
      }
    });
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Processing subscription update:', subscription.id);
  
  const customerId = subscription.customer;
  const priceId = subscription.items.data[0].price.id;
  const planType = await getPlanTypeFromPriceId(priceId);
  
  // Update subscription record
  const existingSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId }
  });
  
  if (existingSubscription) {
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        planType: planType || existingSubscription.planType,
        status: subscription.status,
        stripePriceId: priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      }
    });
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Processing subscription deletion:', subscription.id);
  
  const customerId = subscription.customer;
  
  // Update subscription to canceled status
  const existingSubscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId }
  });
  
  if (existingSubscription) {
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: { 
        status: 'canceled',
        planType: 'FREE' // Revert to free plan
      }
    });
  }
}

async function getPlanTypeFromPriceId(priceId) {
  try {
    const priceMap = JSON.parse(process.env.STRIPE_PRICE_IDS || '{}');
    
    // Reverse lookup: find plan type by price ID
    for (const [planType, id] of Object.entries(priceMap)) {
      if (id === priceId) {
        return planType;
      }
    }
    
    return null;
  } catch (e) {
    console.error('Error parsing STRIPE_PRICE_IDS:', e);
    return null;
  }
}

module.exports = router;
