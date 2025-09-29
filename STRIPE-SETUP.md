# Stripe Integration Setup

## Required Environment Variables

Add these to your `server/.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe test secret key
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook signing secret from Stripe CLI or Dashboard
STRIPE_PRICE_IDS='{"ANALYST_PRO":"price_1abc...", "FOUNDATION":"price_1def...", "FOUNDATION_PRO":"price_1ghi..."}'

# Frontend URL for checkout redirects
FRONTEND_URL=http://localhost:5174

# Optional: Contact email for support
CONTACT_EMAIL=support@endowcast.com
```

## Setting up Stripe Webhooks

### Option 1: Stripe CLI (Recommended for Development)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```
4. Copy the webhook signing secret (whsec_...) to your .env file

### Option 2: Stripe Dashboard

1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the signing secret to your .env file

## Creating Price IDs

1. Go to Stripe Dashboard > Products
2. Create products for each plan:
   - Analyst Pro: $49/month
   - Foundation: $249/month  
   - Foundation Pro: $449/month
3. Copy the price IDs (price_...) and add them to STRIPE_PRICE_IDS

## Testing the Integration

1. Start the backend server:
   ```bash
   cd server
   node src/server.js
   ```

2. Start the frontend:
   ```bash
   cd client
   npm run dev
   ```

3. Navigate to `/pricing` page
4. Click on a paid plan button (when logged in as admin)
5. Should redirect to Stripe Checkout
6. Use test card: 4242 4242 4242 4242
7. Complete checkout
8. Webhook should update subscription in database

## API Endpoints

- `POST /api/payments/create-checkout-session` - Create Stripe checkout session
- `POST /api/webhooks/stripe` - Handle Stripe webhook events

## Database Changes

The webhook handler will:
- Update `Subscription` records with Stripe IDs
- Create `Payment` records for successful payments
- Reset usage counters on billing cycle renewal
- Handle subscription status changes (active, past_due, canceled)
