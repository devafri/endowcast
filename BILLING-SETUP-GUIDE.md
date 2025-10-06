# Billing & Invitation System Setup Guide

This guide walks you through setting up the billing and user invitation systems for EndowCast.

## 🔧 Prerequisites

1. **Stripe Account**: You need a Stripe account with products and prices configured
2. **AWS Account**: Required for SES email service
3. **Database**: PostgreSQL database with Prisma schema deployed

## 📋 Configuration Steps

### 1. Stripe Configuration

#### A. Get Your Stripe Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_` for test mode)

#### B. Create Products and Prices
1. Go to **Products** → **Add product**
2. Create products for each plan:
   - **EndowCast Professional** 
   - **EndowCast Institution**
3. For each product, create monthly and annual prices
4. Copy the price IDs (start with `price_`)

#### C. Set Up Webhooks
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select these events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_`)

### 2. AWS SES Configuration

#### A. Set Up SES
1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Verify your sending domain or email address
3. Request production access (if needed)
4. Note your AWS region (e.g., `us-east-1`)

#### B. Create IAM User
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Create a new user for SES
3. Attach policy: `AmazonSESFullAccess`
4. Create access keys and save them securely

### 3. Environment Configuration

#### A. Server Environment
Copy `.env.example` to `.env` and update:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your_actual_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_actual_webhook_secret"
STRIPE_PRICE_IDS='{"PROFESSIONAL_MONTHLY":"price_1234567890","PROFESSIONAL_ANNUAL":"price_0987654321","INSTITUTION_MONTHLY":"price_abcdefghij","INSTITUTION_ANNUAL":"price_jihgfedcba"}'

# AWS SES Configuration
SES_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your_actual_access_key"
AWS_SECRET_ACCESS_KEY="your_actual_secret_key"
EMAIL_FROM="noreply@yourdomain.com"

# URLs
FRONTEND_URL="https://your-frontend-domain.com"
CLIENT_URL="https://your-frontend-domain.com"
```

#### B. Update STRIPE_PRICE_IDS
Replace the example price IDs with your actual Stripe price IDs:

```json
{
  "PROFESSIONAL_MONTHLY": "price_your_pro_monthly_price_id",
  "PROFESSIONAL_ANNUAL": "price_your_pro_annual_price_id", 
  "INSTITUTION_MONTHLY": "price_your_inst_monthly_price_id",
  "INSTITUTION_ANNUAL": "price_your_inst_annual_price_id"
}
```

## ✅ Testing Your Setup

### 1. Test Stripe Webhook Locally
```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

### 2. Test Email Service
Create a test script to verify SES is working:

```javascript
const emailService = require('./src/infrastructure/email/emailService');

async function testEmail() {
  try {
    await emailService.sendWelcomeEmail('test@example.com', 'Test User');
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Email failed:', error);
  }
}

testEmail();
```

### 3. Test Payment Flow
1. Go to your pricing page
2. Select a plan and proceed to checkout
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete the payment
5. Check that:
   - Webhook is received
   - Subscription is created in database
   - Payment confirmation email is sent

## 🚀 Deployment Considerations

### Production Environment
- Use live Stripe keys (start with `sk_live_`)
- Use production webhook endpoint
- Ensure SES is in production mode
- Set `NODE_ENV=production`

### Security
- Never commit actual keys to version control
- Use environment variables or secrets management
- Restrict IAM user permissions to minimum required
- Enable webhook signature verification

### Monitoring
- Monitor Stripe webhook delivery in dashboard
- Set up CloudWatch logging for SES
- Monitor payment failure rates
- Track email delivery rates

## 🔗 Next Steps

1. Complete the invitation system implementation
2. Add subscription management (upgrade/downgrade)
3. Implement billing portal integration
4. Add usage tracking and limits
5. Set up automated testing for payment flows

## 📞 Support

If you encounter issues:
1. Check Stripe webhook logs in dashboard
2. Review server logs for email errors
3. Verify environment variables are loaded correctly
4. Test with Stripe CLI for webhook debugging
