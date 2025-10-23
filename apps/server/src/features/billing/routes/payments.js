const express = require('express');
const router = express.Router();
const { authenticateForPayments } = require('../../auth/middleware/auth');
const { PrismaClient } = require('@prisma/client');
const emailService = require('../../../infrastructure/email/emailService');

const prisma = new PrismaClient();

// Create checkout session for plan purchase
router.post('/create-checkout-session', authenticateForPayments, async (req, res) => {
  const { planType, billingCycle = 'MONTHLY', paymentMethod = 'card' } = req.body;

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_IDS) {
    return res.status(500).json({ error: 'Stripe not configured on this server' });
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // STRIPE_PRICE_IDS is a JSON map like {"ANALYST_PRO_MONTHLY":"price_...", "ANALYST_PRO_ANNUAL":"price_..."}
    const priceMap = JSON.parse(process.env.STRIPE_PRICE_IDS);
    
    // Construct the price key: planType + "_" + billingCycle
    const priceKey = `${planType}_${billingCycle.toUpperCase()}`;
    const priceId = priceMap[priceKey];

    if (!priceId) {
      console.error(`Price not found for key: ${priceKey}. Available keys:`, Object.keys(priceMap));
      return res.status(400).json({ 
        error: `Plan not available: ${planType} ${billingCycle}`,
        availablePlans: Object.keys(priceMap)
      });
    }

    // Handle invoice payment method
    if (paymentMethod === 'invoice') {
      // Create subscription request record for manual processing
      const organization = await prisma.organization.findUnique({
        where: { id: req.user.organizationId },
        include: { subscription: true }
      });

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Calculate plan pricing
      const planPrices = {
        'ANALYST_PRO_MONTHLY': 49,
        'ANALYST_PRO_ANNUAL': 499,
        'FOUNDATION_MONTHLY': 249,
        'FOUNDATION_ANNUAL': 2499,
        'FOUNDATION_PRO_MONTHLY': 449,
        'FOUNDATION_PRO_ANNUAL': 4499
      };

      const amount = planPrices[priceKey];

      if (!amount) {
        return res.status(400).json({ error: 'Invalid plan pricing' });
      }

      // Store subscription request for manual processing
      const subscriptionRequest = await prisma.payment.create({
        data: {
          organizationId: req.user.organizationId,
          amount: amount,
          currency: 'usd',
          status: 'pending_invoice',
          description: `Subscription request: ${planType} ${billingCycle} - Contact: ${organization.contactEmail}`
        }
      });

      // Send notification email to billing team
      try {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id }
        });

        await emailService.sendEmail({
          to: 'hello@endowcast.com',
          subject: `New Invoice Request - ${planType} Subscription`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">New Subscription Invoice Request</h2>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #374151; margin-top: 0;">Customer Details</h3>
                <p><strong>Organization:</strong> ${organization.name}</p>
                <p><strong>Contact Email:</strong> ${organization.contactEmail}</p>
                <p><strong>Contact Name:</strong> ${user.firstName} ${user.lastName}</p>
                <p><strong>Industry:</strong> ${organization.industry || 'Not specified'}</p>
              </div>
              
              <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin-top: 0;">Subscription Request</h3>
                <p><strong>Plan:</strong> ${planType.replace('_', ' ')}</p>
                <p><strong>Billing Cycle:</strong> ${billingCycle}</p>
                <p><strong>Amount:</strong> $${amount}/month</p>
                <p><strong>Request ID:</strong> ${subscriptionRequest.id}</p>
              </div>
              
              <div style="margin: 30px 0;">
                <p style="color: #6b7280;">This customer has requested invoice billing for their subscription. Please process this request and send them a professional invoice with NET 30 payment terms.</p>
              </div>
              
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  <strong>Next Steps:</strong><br>
                  1. Review customer details<br>
                  2. Generate subscription invoice<br>
                  3. Email invoice to customer<br>
                  4. Update subscription status upon payment
                </p>
              </div>
            </div>
          `
        });

        console.log('Billing team notification sent for invoice request');
      } catch (emailError) {
        console.error('Failed to send billing team notification:', emailError);
        // Don't fail the request if email fails
      }

      return res.json({ 
        success: true,
        type: 'invoice_request',
        message: 'Invoice request submitted successfully. Our billing team will contact you within 1 business day.',
        requestId: subscriptionRequest.id
      });
    }

    // Default card payment flow
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pricing`,
      client_reference_id: req.user.organizationId,
      metadata: { 
        userId: req.user.id,
        planType: planType,
        billingCycle: billingCycle
      }
    });

    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Confirm a checkout session server-side (useful for demo / immediate confirmation)
router.post('/confirm-session', authenticateForPayments, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) return res.status(404).json({ error: 'Checkout session not found' });

    const organizationId = session.client_reference_id || session.client_reference_id;
    const subscriptionId = session.subscription;

    console.log('Confirming session:', sessionId, 'org:', organizationId, 'subscription:', subscriptionId);

    if (!organizationId) {
      console.warn('confirm-session: no client_reference_id on session', sessionId, session.metadata || {});
      return res.status(400).json({ error: 'Session missing organization client_reference_id' });
    }

    if (!subscriptionId) {
      console.warn('confirm-session: session has no subscription yet (maybe payment not finalized)', sessionId);
      // Still create a payment record if possible
    }

    // If we have a subscription id, fetch subscription details
    let planType = null;
    let priceId = null;
    let stripeSubscription = null;
    if (subscriptionId) {
      // Expand price and latest_invoice so we can reliably find priceId and period timestamps
      stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price', 'latest_invoice']
      });
      priceId = stripeSubscription.items?.data?.[0]?.price?.id;
      // Map priceId to planType
      try {
        const priceMap = JSON.parse(process.env.STRIPE_PRICE_IDS || '{}');
        for (const [k, v] of Object.entries(priceMap)) {
          if (v === priceId) {
            // Normalize plan key like 'FOUNDATION_ANNUAL' -> 'FOUNDATION'
            planType = k.split('_')[0];
            console.log('confirm-session: mapped priceId to planType =>', planType, 'priceKey:', k, 'priceId:', priceId);
            break;
          }
        }
      } catch (e) {
        console.error('confirm-session: failed to parse STRIPE_PRICE_IDS', e.message || e);
      }
    } else {
      // try to read priceId from session's line_items or metadata
      priceId = session.display_items?.[0]?.price?.id || session.metadata?.priceId || null;

      // Prefer explicit metadata.planType (we set this when creating the session) so
      // confirm-session can upsert subscriptions even if Stripe hasn't attached a
      // subscription id yet. This fixes local/browser flows where webhooks may lag.
      if (session.metadata && session.metadata.planType) {
        // metadata.planType is expected to be the base plan like 'ANALYST_PRO'
        planType = session.metadata.planType;
        console.log('confirm-session: using session.metadata.planType =>', planType);
      } else {
        // Map priceId to plan key (older envs may store keys like 'ANALYST_PRO_MONTHLY').
        try {
          const priceMap = JSON.parse(process.env.STRIPE_PRICE_IDS || '{}');
          for (const [k, v] of Object.entries(priceMap)) {
            if (v === priceId) {
              // Normalize: if key includes billing cycle (e.g. 'ANALYST_PRO_MONTHLY'),
              // extract the base plan name before the first underscore.
              planType = k.split('_')[0];
              console.log('confirm-session: mapped priceId to planType =>', planType, 'priceKey:', k, 'priceId:', priceId);
              break;
            }
          }
        } catch (e) {
          console.error('confirm-session: failed to parse STRIPE_PRICE_IDS', e.message || e);
        }
      }
    }

    // Upsert subscription record
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    if (planType || subscriptionId) {
      const upsertData = {
        where: { organizationId },
        update: {},
        create: {
          organizationId,
          planType: planType || 'FREE',
          status: stripeSubscription?.status || 'active',
          stripeCustomerId: session.customer || null,
          stripeSubscriptionId: subscriptionId || null,
          stripePriceId: priceId || null,
          simulationsUsed: 0,
        }
      };

      if (stripeSubscription) {
        // Protect against missing or non-numeric period timestamps returned by Stripe
        // subscription may not include period timestamps immediately; attempt fallbacks
        let cpsRaw = stripeSubscription.current_period_start;
        let cpeRaw = stripeSubscription.current_period_end;

        // Fallback: use latest invoice period if available
        if ((!cpsRaw || !cpeRaw) && stripeSubscription.latest_invoice) {
          const inv = stripeSubscription.latest_invoice;
          // invoice may have period_start/period_end or lines with period
          cpsRaw = cpsRaw || inv.period_start || inv.lines?.data?.[0]?.period?.start;
          cpeRaw = cpeRaw || inv.period_end || inv.lines?.data?.[0]?.period?.end;
          if (cpsRaw || cpeRaw) {
            console.log('confirm-session: derived period timestamps from latest_invoice', { cpsRaw, cpeRaw });
          }
        }
        let cpsDate = null;
        let cpeDate = null;

        if (cpsRaw !== undefined && cpsRaw !== null) {
          const cpsNum = Number(cpsRaw);
          if (Number.isFinite(cpsNum) && !Number.isNaN(cpsNum)) cpsDate = new Date(cpsNum * 1000);
        }

        if (cpeRaw !== undefined && cpeRaw !== null) {
          const cpeNum = Number(cpeRaw);
          if (Number.isFinite(cpeNum) && !Number.isNaN(cpeNum)) cpeDate = new Date(cpeNum * 1000);
        }

        if (!cpsDate || !cpeDate) {
          console.warn('confirm-session: stripe subscription missing/invalid period timestamps', { current_period_start: cpsRaw, current_period_end: cpeRaw });
        }

        upsertData.update = {
          planType: planType || undefined,
          status: stripeSubscription.status,
          stripeCustomerId: session.customer || null,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId || null,
          ...(cpsDate ? { currentPeriodStart: cpsDate } : {}),
          ...(cpeDate ? { currentPeriodEnd: cpeDate } : {}),
        };

        if (cpsDate) upsertData.create.currentPeriodStart = cpsDate;
        if (cpeDate) upsertData.create.currentPeriodEnd = cpeDate;
      }

      try {
        const result = await prisma.subscription.upsert(upsertData);
        console.log('confirm-session: upserted subscription', { id: result.id, org: result.organizationId, planType: result.planType });
      } catch (e) {
        console.error('confirm-session: failed upsert subscription', e.message || e);
      }
    }

    // Create payment record if session has amount info
    try {
      if (session.amount_total) {
        const payment = await prisma.payment.create({
          data: {
            organizationId,
            amount: session.amount_total / 100,
            currency: session.currency || 'usd',
            status: 'succeeded',
            stripePaymentIntentId: session.payment_intent || null,
            description: `Checkout session confirmation ${sessionId}`
          }
        });
        console.log('confirm-session: created payment', payment.id);
      }
    } catch (e) {
      console.error('confirm-session: failed to create payment record', e.message || e);
    }

    res.json({ success: true, message: 'Session confirmed (server-side)', sessionId });
  } catch (error) {
    console.error('confirm-session error:', error.message || error);
    res.status(500).json({ error: 'Failed to confirm session' });
  }
});

// Request invoice for subscription
router.post('/request-invoice', authenticateForPayments, async (req, res) => {
  const { planType, billingCycle = 'MONTHLY', dueDate } = req.body;

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      include: { subscription: true }
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Calculate plan pricing
    const planPrices = {
      'ANALYST_PRO_MONTHLY': 49,
      'ANALYST_PRO_ANNUAL': 499,
      'FOUNDATION_MONTHLY': 249,
      'FOUNDATION_ANNUAL': 2499,
      'FOUNDATION_PRO_MONTHLY': 449,
      'FOUNDATION_PRO_ANNUAL': 4499
    };

    const priceKey = `${planType}_${billingCycle.toUpperCase()}`;
    const amount = planPrices[priceKey];

    if (!amount) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Create line items for the subscription
    const lineItems = [{
      description: `${planType.replace('_', ' ')} Subscription - ${billingCycle}`,
      amount: amount,
      quantity: 1,
      currency: 'usd'
    }];

    // Create invoice using our existing invoice system
    const invoiceData = {
      description: `EndowCast ${planType.replace('_', ' ')} Subscription`,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      lineItems: lineItems,
      sendEmail: true,
      metadata: {
        planType,
        billingCycle,
        subscriptionInvoice: true
      }
    };

    // Use our existing invoice creation logic
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Get or create Stripe customer
    let customer;
    if (organization.subscription?.stripeCustomerId) {
      try {
        customer = await stripe.customers.retrieve(organization.subscription.stripeCustomerId);
      } catch (retrieveError) {
        customer = null;
      }
    }
    
    if (!customer) {
      customer = await stripe.customers.create({
        name: organization.name,
        email: organization.contactEmail,
        metadata: {
          organizationId: req.user.organizationId.toString()
        }
      });

      // Update subscription with Stripe customer ID
      if (organization.subscription) {
        await prisma.subscription.update({
          where: { id: organization.subscription.id },
          data: { stripeCustomerId: customer.id }
        });
      } else {
        await prisma.subscription.create({
          data: {
            organizationId: req.user.organizationId,
            stripeCustomerId: customer.id,
            planType: 'FREE'
          }
        });
      }
    }

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      description: invoiceData.description,
      collection_method: 'send_invoice',
      auto_advance: false,
      due_date: Math.floor(new Date(invoiceData.dueDate).getTime() / 1000),
      metadata: {
        organizationId: req.user.organizationId,
        createdBy: req.user.id,
        subscriptionInvoice: 'true',
        planType,
        billingCycle
      }
    });

    // Add line items
    for (const item of lineItems) {
      await stripe.invoiceItems.create({
        customer: customer.id,
        invoice: invoice.id,
        amount: Math.round(item.amount * 100 * (item.quantity || 1)),
        currency: item.currency || 'usd',
        description: item.description
      });
    }

    // Finalize and send the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(finalizedInvoice.id);

    // Store invoice record in database
    const invoiceRecord = await prisma.invoice.create({
      data: {
        organizationId: req.user.organizationId,
        stripeInvoiceId: invoice.id,
        amount: lineItems.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0),
        currency: lineItems[0]?.currency || 'usd',
        description: invoiceData.description,
        status: finalizedInvoice.status,
        dueDate: new Date(invoiceData.dueDate),
        createdBy: req.user.id
      }
    });

    // Send notification to billing team about the new invoice
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      await emailService.sendEmail({
        to: 'hello@endowcast.com',
        subject: `New Subscription Invoice Created - ${planType}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937;">Subscription Invoice Created & Sent</h2>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Customer Details</h3>
              <p><strong>Organization:</strong> ${organization.name}</p>
              <p><strong>Contact Email:</strong> ${organization.contactEmail}</p>
              <p><strong>Contact Name:</strong> ${user.firstName} ${user.lastName}</p>
              <p><strong>Industry:</strong> ${organization.industry || 'Not specified'}</p>
            </div>
            
            <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #166534; margin-top: 0;">Invoice Details</h3>
              <p><strong>Plan:</strong> ${planType.replace('_', ' ')}</p>
              <p><strong>Billing Cycle:</strong> ${billingCycle}</p>
              <p><strong>Amount:</strong> $${invoiceRecord.amount}</p>
              <p><strong>Invoice ID:</strong> ${invoiceRecord.stripeInvoiceId}</p>
              <p><strong>Due Date:</strong> ${invoiceRecord.dueDate.toLocaleDateString()}</p>
              <p><strong>Status:</strong> ✅ Sent to customer</p>
            </div>
            
            <div style="margin: 30px 0;">
              <p><strong>Invoice URLs:</strong></p>
              <p><a href="${finalizedInvoice.hosted_invoice_url}" style="color: #2563eb;">View Invoice</a></p>
              <p><a href="${finalizedInvoice.invoice_pdf}" style="color: #2563eb;">Download PDF</a></p>
            </div>
            
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <strong>Status:</strong> Invoice has been automatically created and emailed to the customer. 
                Monitor payment status and update subscription upon receipt.
              </p>
            </div>
          </div>
        `
      });

      console.log('Billing team notification sent for created invoice');
    } catch (emailError) {
      console.error('Failed to send billing team notification:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Subscription invoice created and sent successfully!',
      invoice: {
        id: invoiceRecord.id,
        stripeInvoiceId: invoice.id,
        hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
        invoicePdf: finalizedInvoice.invoice_pdf,
        status: finalizedInvoice.status,
        amount: invoiceRecord.amount,
        dueDate: invoiceRecord.dueDate
      }
    });

  } catch (error) {
    console.error('Invoice request error:', error);
    res.status(500).json({ 
      error: 'Failed to create subscription invoice',
      details: error.message 
    });
  }
});

module.exports = router;
