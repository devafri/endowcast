const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// This endpoint expects the raw body (signature verification), so it should be
// mounted with raw body parser in server.js for the /api/payments/webhook path.

router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');

  if (!webhookSecret) {
    console.warn('Stripe webhook received but STRIPE_WEBHOOK_SECRET not configured');
    return res.status(400).send('Webhook secret not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event types we care about
  (async () => {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          // Update/create subscription record for organization
          const orgId = session.client_reference_id;
          const customerId = session.customer;
          const subscriptionId = session.subscription;
          const priceId = session.display_items?.[0]?.price?.id || session.metadata?.priceId || null;

          if (orgId) {
            await prisma.subscription.upsert({
              where: { organizationId: orgId },
              update: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: priceId,
                status: 'active'
              },
              create: {
                organizationId: orgId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: priceId,
                status: 'active',
                simulationsUsed: 0
              }
            });
          }

          break;
        }
        case 'invoice.paid': {
          const invoice = event.data.object;
          // Create Payment record if possible
          try {
            await prisma.payment.create({
              data: {
                organizationId: invoice.metadata?.organizationId || '',
                amount: invoice.amount_paid / 100.0,
                currency: invoice.currency || 'usd',
                status: 'succeeded',
                stripeInvoiceId: invoice.id,
                description: invoice.description || 'Stripe invoice'
              }
            });
          } catch (e) {
            console.warn('Failed to create payment record from invoice.paid', e.message || e);
          }
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          try {
            await prisma.payment.create({
              data: {
                organizationId: invoice.metadata?.organizationId || '',
                amount: invoice.amount_paid / 100.0,
                currency: invoice.currency || 'usd',
                status: 'failed',
                stripeInvoiceId: invoice.id,
                description: invoice.description || 'Stripe invoice'
              }
            });
          } catch (e) {
            console.warn('Failed to create payment record from invoice.payment_failed', e.message || e);
          }
          break;
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          const customerId = subscription.customer;
          const subId = subscription.id;
          const status = subscription.status;
          try {
            await prisma.subscription.updateMany({
              where: { stripeSubscriptionId: subId },
              data: { status }
            });
          } catch (e) {
            console.warn('Failed to update subscription status from webhook', e.message || e);
          }
          break;
        }
        default:
          // Unhandled event types
          break;
      }
    } catch (e) {
      console.error('Error handling webhook event:', e.message || e);
    }
  })();

  res.json({ received: true });
});

module.exports = router;
