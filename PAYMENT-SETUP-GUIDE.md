# EndowCast Payment Processing Setup Guide

## Overview
This guide covers setting up Stripe payment processing with automatic email confirmations for EndowCast subscriptions.

## Stripe Configuration

### 1. Stripe Account Setup
1. Create a Stripe account at https://stripe.com
2. Complete business verification
3. Navigate to the Dashboard

### 2. Get Stripe API Keys
1. Go to **Developers > API Keys**
2. Copy your **Publishable key** (starts with `pk_`)
3. Copy your **Secret key** (starts with `sk_`)
4. Create a **Webhook endpoint** for payment confirmations:
   - Endpoint URL: `https://your-api-domain/payments/webhook`
   - Events to listen for: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the **Webhook signing secret** (starts with `whsec_`)

## AWS Parameter Store Configuration

Add these parameters to AWS Systems Manager Parameter Store:

### Development Environment (dev)
```bash
# Stripe Configuration
aws ssm put-parameter --name "/endowcast/dev/stripe-secret-key" --value "sk_test_..." --type "SecureString"
aws ssm put-parameter --name "/endowcast/dev/stripe-publishable-key" --value "pk_test_..." --type "String"
aws ssm put-parameter --name "/endowcast/dev/stripe-webhook-secret" --value "whsec_..." --type "SecureString"

# Client URL for email links
aws ssm put-parameter --name "/endowcast/dev/client-url" --value "http://localhost:5173" --type "String"
```

### Production Environment (prod)
```bash
# Stripe Configuration
aws ssm put-parameter --name "/endowcast/prod/stripe-secret-key" --value "sk_live_..." --type "SecureString"
aws ssm put-parameter --name "/endowcast/prod/stripe-publishable-key" --value "pk_live_..." --type "String"
aws ssm put-parameter --name "/endowcast/prod/stripe-webhook-secret" --value "whsec_..." --type "SecureString"

# Client URL for email links
aws ssm put-parameter --name "/endowcast/prod/client-url" --value "https://app.endowcast.com" --type "String"
```

## Pricing Configuration

The payment system includes these subscription plans:

### Analyst Pro Plan (Single User)
- **Monthly**: $49/month
- **Annual**: $499/year (15% savings)
- Features: Unlimited simulations, PDF reports, all asset classes

### Foundation Plan (Up to 5 Users)
- **Monthly**: $249/month
- **Annual**: $2,499/year (17% savings)
- Features: Team collaboration, shared workspaces, API access, priority support

### Foundation Pro Plan (Up to 15 Users)
- **Monthly**: $449/month
- **Annual**: $4,499/year (17% savings)
- Features: All Foundation features + custom branding, SSO, audit logs, enterprise support

## Database Migration

Update your Prisma schema and run migrations:

```bash
# In the server directory
cd server

# Generate Prisma client with new Payment model
npm run generate

# Create and run migration (for development)
npx prisma migrate dev --name add-payment-model

# For production, run migration
npx prisma migrate deploy
```

## Payment Flow Overview

### 1. Payment Intent Creation
- User selects plan and billing cycle on frontend
- Frontend calls `/payments/create-intent` with plan details
- Backend creates Stripe PaymentIntent with calculated amount
- Returns client secret for frontend payment form

### 2. Payment Confirmation
- User completes payment on frontend using Stripe Elements
- Frontend calls `/payments/confirm` with payment intent ID
- Backend verifies payment with Stripe
- Updates user plan and expiry date
- Sends payment confirmation email
- Records payment in database

### 3. Payment History
- Users can view payment history via `/payments/history`
- Includes all payments, refunds, and subscription details

### 4. Subscription Management
- Users can cancel subscriptions via `/payments/cancel`
- Access continues until current period expires
- Sends cancellation confirmation email

## Email Templates

### Payment Confirmation Email Features:
- Professional HTML design with payment details
- Plan features and benefits listed
- Direct link to start first simulation
- Payment receipt information (amount, ID, dates)

### Cancellation Email Features:
- Confirmation of cancellation request
- Access continuation details
- Feedback request link
- Resubscription options

## Frontend Integration

### Environment Variables
Add to your client `.env` file:
```bash
# Stripe Publishable Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# API Base URL
VITE_API_BASE_URL=https://your-api-domain
```

### Required Frontend Components:
1. **Payment Form Component**
   - Stripe Elements integration
   - Plan selection (Professional/Institution)
   - Billing cycle toggle (Monthly/Annual)
   - Payment processing with loading states

2. **Payment History Component**
   - Display user's payment history
   - Show current plan status
   - Cancellation options

3. **Pricing Page Updates**
   - Updated pricing display
   - Payment integration buttons
   - Feature comparison tables

## Testing

### Test Cards
Use Stripe test cards for development:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requires 3D Secure**: 4000 0025 0000 3155

### Test Flow
1. Create test PaymentIntent
2. Complete payment with test card
3. Verify email sent
4. Check user plan updated
5. Test payment history
6. Test subscription cancellation

## Monitoring & Logs

### CloudWatch Logs
Monitor payment processing via CloudWatch:
- Payment intent creation logs
- Payment confirmation logs  
- Email sending status
- Error handling and retries

### Stripe Dashboard
Monitor payments, disputes, and webhooks in Stripe Dashboard:
- Payment volume and success rates
- Customer payment methods
- Webhook delivery status
- Revenue analytics

## Security Considerations

### API Security
- All payment endpoints require authentication
- Stripe webhooks validate signatures
- Payment amounts validated on backend
- PCI compliance through Stripe Elements

### Data Protection
- Payment data never stored directly
- Only Stripe IDs and metadata stored
- User data encrypted in database
- Email templates sanitize user input

## Deployment Commands

```bash
# Install new dependencies
cd server && npm install

# Deploy to development
npm run serverless:deploy:dev

# Deploy to production  
npm run serverless:deploy:prod
```

## Support & Troubleshooting

### Common Issues
1. **Payment Intent Creation Fails**
   - Check Stripe API keys in Parameter Store
   - Verify IAM permissions for Parameter Store access
   - Check CloudWatch logs for detailed errors

2. **Email Not Sending**
   - Verify SES configuration and domain verification
   - Check SES sending limits
   - Review email service logs

3. **Database Errors**
   - Ensure Prisma migrations are applied
   - Verify RDS Serverless connectivity
   - Check DATABASE_URL parameter

### Getting Help
- Stripe Documentation: https://stripe.com/docs
- AWS SES Documentation: https://docs.aws.amazon.com/ses/
- Prisma Documentation: https://www.prisma.io/docs/

---

**Next Steps:**
1. Set up Stripe account and get API keys
2. Configure AWS Parameter Store values
3. Run database migrations
4. Deploy backend with payment functions
5. Create frontend payment components
6. Test payment flow end-to-end
