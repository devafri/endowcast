const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Simple test endpoint to verify webhook is accessible
router.get('/stripe-test', (req, res) => {
  console.log('✅ Webhook test endpoint hit');
  res.json({ 
    success: true, 
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

// Stripe webhook handler - requires raw body for signature verification
router.post('/stripe', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('Stripe webhook called but keys not configured');
    return res.status(400).json({ error: 'Stripe not configured' });
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  
  let event;
  
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
  console.log('Session data:', JSON.stringify(session, null, 2));
  
  const organizationId = session.client_reference_id;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  
  console.log('Extracted IDs:', { organizationId, customerId, subscriptionId });
  
  if (!organizationId) {
    console.error('No organization ID in checkout session');
    return;
  }

  // Get subscription details from Stripe
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  console.log('Stripe subscription data:', JSON.stringify(subscription, null, 2));
  
  // Map Stripe price ID to our plan type
  const priceId = subscription.items.data[0].price.id;
  console.log('Price ID from subscription:', priceId);
  
  const planType = await getPlanTypeFromPriceId(priceId);
  console.log('Mapped plan type:', planType);
  
  if (!planType) {
    console.error('Unknown price ID:', priceId);
    console.error('Available price mappings:', process.env.STRIPE_PRICE_IDS);
    return;
  }

  console.log('Updating subscription for organization:', organizationId);

  // Update or create subscription record
  const updatedSubscription = await prisma.subscription.upsert({
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

  console.log('Subscription upserted:', JSON.stringify(updatedSubscription, null, 2));

  // Create payment record
  const paymentRecord = await prisma.payment.create({
    data: {
      organizationId,
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency,
      status: 'succeeded',
      stripePaymentIntentId: session.payment_intent,
      description: `Subscription: ${planType}`,
    }
  });

  console.log('Payment record created:', JSON.stringify(paymentRecord, null, 2));
  console.log(`✅ Subscription successfully updated for org ${organizationId}: ${planType}`);
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
    const priceMapString = process.env.STRIPE_PRICE_IDS || '{}';
    console.log('STRIPE_PRICE_IDS env var:', priceMapString);
    
    const priceMap = JSON.parse(priceMapString);
    console.log('Parsed price map:', priceMap);
    
    // Reverse lookup: find plan type by price ID
    for (const [planKey, id] of Object.entries(priceMap)) {
      console.log(`Checking ${planKey}: ${id} === ${priceId}?`);
      if (id === priceId) {
        // Extract just the plan type part (remove billing cycle suffix)
        const planType = planKey.replace(/_MONTHLY$|_ANNUAL$/, '');
        console.log(`Found match! Plan key: ${planKey}, Plan type: ${planType}`);
        return planType;
      }
    }
    
    console.error('No plan type found for price ID:', priceId);
    console.error('Available price IDs:', Object.values(priceMap));
    return null;
  } catch (e) {
    console.error('Error parsing STRIPE_PRICE_IDS:', e);
    return null;
  }
}

module.exports = router;
