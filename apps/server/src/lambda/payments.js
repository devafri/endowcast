const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require('../services/emailService');
const { authenticateToken } = require('../middleware/auth');

// Initialize Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Common CORS headers
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

/**
 * Create Payment Intent
 */
exports.createPaymentIntent = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Authenticate user
    const authResult = authenticateToken(event);
    if (!authResult.success) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const { planType, billingCycle } = JSON.parse(event.body);

    // Get user with organization and subscription details
    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      include: {
        organization: {
          include: {
            subscription: true
          }
        }
      }
    });

    if (!user || !user.organization) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'User or organization not found' })
      };
    }

    // Only organization admins can upgrade subscription
    if (user.role !== 'ADMIN') {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Only organization administrators can manage subscriptions' })
      };
    }

    // Define pricing for different plans and billing cycles
    const PRICING = {
      ANALYST_PRO: {
        monthly: 4900, // $49.00 in cents
        annual: 49900  // $499.00 in cents (15% savings)
      },
      FOUNDATION: {
        monthly: 24900, // $249.00 in cents
        annual: 249900  // $2,499.00 in cents (17% savings)
      },
      FOUNDATION_PRO: {
        monthly: 44900, // $449.00 in cents
        annual: 449900  // $4,499.00 in cents (17% savings)
      }
    };

    if (!PRICING[planType] || !PRICING[planType][billingCycle]) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid plan type or billing cycle' })
      };
    }

    const amount = PRICING[planType][billingCycle];
    const currency = 'usd';

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        organizationId: user.organization.id,
        subscriptionId: user.organization.subscription.id,
        planType,
        billingCycle,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        organizationName: user.organization.name
      },
      description: `EndowCast ${planType} Plan (${billingCycle}) - ${user.organization.name}`
    });

    // Calculate billing period
    const periodStart = new Date();
    const periodEnd = new Date();
    if (billingCycle === 'MONTHLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Store payment record
    await prisma.payment.create({
      data: {
        subscriptionId: user.organization.subscription.id,
        paymentIntentId: paymentIntent.id,
        planType,
        billingCycle,
        amount,
        currency,
        status: 'PENDING',
        periodStart,
        periodEnd
      }
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      })
    };

  } catch (error) {
    console.error('Create payment intent error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to create payment intent',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

/**
 * Confirm Payment and Update User Plan
 */
exports.confirmPayment = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Authenticate user
    const authResult = authenticateToken(event);
    if (!authResult.success) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const { paymentIntentId } = JSON.parse(event.body);

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Payment not completed',
          status: paymentIntent.status 
        })
      };
    }

    const userId = paymentIntent.metadata.userId;
    const organizationId = paymentIntent.metadata.organizationId;
    const subscriptionId = paymentIntent.metadata.subscriptionId;
    const planType = paymentIntent.metadata.planType;
    const billingCycle = paymentIntent.metadata.billingCycle;

    // Update payment record
    await prisma.payment.update({
      where: { paymentIntentId: paymentIntentId },
      data: {
        status: 'SUCCEEDED',
        processedAt: new Date()
      }
    });

    // Calculate subscription period
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    if (billingCycle === 'MONTHLY') {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    }

    // Define user limits and simulation quotas based on plan
    const planLimits = {
      ANALYST_PRO: { userLimit: 5, simulationsPerMonth: 50 },
      FOUNDATION: { userLimit: 25, simulationsPerMonth: 250 },
      FOUNDATION_PRO: { userLimit: 125, simulationsPerMonth: 500 }
    };

    const limits = planLimits[planType] || { userLimit: 1, simulationsPerMonth: 10 };

    // Update organization subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planType,
        billingCycle,
        currentPeriodStart,
        currentPeriodEnd,
        userLimit: limits.userLimit,
        simulationsPerMonth: limits.simulationsPerMonth,
        status: 'ACTIVE'
      }
    });

    // Get updated user with organization data
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: {
            subscription: true
          }
        }
      }
    });

    // Send confirmation email
    try {
      await emailService.sendPaymentConfirmationEmail({
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        organizationName: updatedUser.organization.name,
        planType,
        billingCycle,
        amount: paymentIntent.amount,
        paymentIntentId,
        currentPeriodEnd
      });
    } catch (emailError) {
      console.error('Failed to send payment confirmation email:', emailError);
      // Don't fail the payment confirmation if email fails
    }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Payment confirmed successfully',
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            role: updatedUser.role,
            organizationId: updatedUser.organizationId,
            organization: {
              id: updatedUser.organization.id,
              name: updatedUser.organization.name,
              subscription: {
                planType: updatedUser.organization.subscription.planType,
                status: updatedUser.organization.subscription.status,
                currentPeriodEnd: updatedUser.organization.subscription.currentPeriodEnd,
                userLimit: updatedUser.organization.subscription.userLimit,
                simulationsPerMonth: updatedUser.organization.subscription.simulationsPerMonth
              }
            }
          }
        })
      };  } catch (error) {
    console.error('Confirm payment error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to confirm payment',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

/**
 * Get User Payment History
 */
exports.getPaymentHistory = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Authenticate user
    const authResult = authenticateToken(event);
    if (!authResult.success) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    // Get user's organization subscription
    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      include: {
        organization: {
          include: {
            subscription: true
          }
        }
      }
    });

    if (!user?.organization?.subscription) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Organization subscription not found' })
      };
    }

    const payments = await prisma.payment.findMany({
      where: { 
        subscriptionId: user.organization.subscription.id,
        status: 'SUCCEEDED'
      },
      orderBy: { processedAt: 'desc' },
      take: 20 // Last 20 payments
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ payments })
    };

  } catch (error) {
    console.error('Get payment history error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to retrieve payment history'
      })
    };
  }
};

/**
 * Cancel Subscription (future recurring payments)
 */
exports.cancelSubscription = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Authenticate user
    const authResult = authenticateToken(event);
    if (!authResult.success) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      include: {
        organization: {
          include: {
            subscription: true
          }
        }
      }
    });

    if (!user?.organization?.subscription) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'User or organization subscription not found' })
      };
    }

    // Only organization admins can cancel subscription
    if (user.role !== 'ADMIN') {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Only organization administrators can cancel subscriptions' })
      };
    }

    // Update subscription to cancelled status
    const updatedSubscription = await prisma.subscription.update({
      where: { id: user.organization.subscription.id },
      data: {
        status: 'CANCELLED'
        // Keep current plan until expiry, then revert to FREE
        // This allows them to use paid features until their billing period ends
      }
    });

    // Send cancellation confirmation email
    try {
      await emailService.sendCancellationEmail({
        email: user.email,
        firstName: user.firstName,
        organizationName: user.organization.name,
        planType: updatedSubscription.planType,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd
      });
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Organization subscription cancelled successfully. You will retain access until your current billing period ends.',
        currentPeriodEnd: updatedSubscription.currentPeriodEnd
      })
    };

  } catch (error) {
    console.error('Cancel subscription error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to cancel subscription'
      })
    };
  }
};
