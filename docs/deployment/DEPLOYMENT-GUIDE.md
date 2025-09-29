# EndowCast Deployment Guide

## Quick Deployment Commands

### Frontend to S3
```bash
cd client
./deploy.sh your-bucket-name https://your-api-domain.com
```

### Backend Options

**Option 1: Railway (Recommended - Free tier available)**
```bash
cd server
npm install -g @railway/cli
./deploy.sh railway
```

**Option 2: Render (Free tier available)**
```bash
cd server
./deploy.sh render
# Follow the printed manual steps
```

**Option 3: AWS Lambda (Serverless)**
```bash
cd server
npm install -g serverless
./deploy.sh aws-lambda
```

## Detailed Setup Instructions

### 1. Frontend Deployment (S3 + CloudFront)

#### Prerequisites
- AWS CLI installed and configured
- S3 bucket created with public read access

#### Steps
1. **Build and deploy:**
   ```bash
   cd client
   chmod +x deploy.sh
   ./deploy.sh your-endowcast-bucket https://api.yourdomain.com
   ```

2. **Set S3 bucket policy for public access:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-endowcast-bucket/*"
       }
     ]
   }
   ```

3. **Optional: Set up CloudFront for HTTPS and custom domain**

### 2. Backend Deployment

#### Option A: Railway (Recommended)

**Why Railway?**
- Easy database setup (PostgreSQL included)
- Automatic deployments from Git
- Free tier: 500 hours/month
- Built-in environment variable management

**Steps:**
1. Install Railway CLI: `npm install -g @railway/cli`
2. Create account at [railway.app](https://railway.app)
3. Run deployment: `./deploy.sh railway`
4. Set environment variables in Railway dashboard
5. Add PostgreSQL database service in Railway

#### Option B: Render

**Why Render?**
- Free tier available
- Auto-deploys from Git
- Built-in PostgreSQL (paid)

**Steps:**
1. Push code to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Connect your GitHub repository
4. Configure:
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `npm start`
5. Add environment variables in Render dashboard
6. Add PostgreSQL database (paid service)

#### Option C: AWS Lambda (Serverless)

**Why Lambda?**
- Pay per request
- Scales automatically
- Integrates well with other AWS services

**Steps:**
1. Install Serverless Framework: `npm install -g serverless`
2. Configure AWS credentials: `aws configure`
3. Run deployment: `./deploy.sh aws-lambda`
4. Set up RDS PostgreSQL database separately
5. Configure environment variables in AWS Lambda console

### 3. Database Setup

#### For Railway/Render
- PostgreSQL is available as a service
- Connection string is provided automatically

#### For AWS Lambda
1. Create RDS PostgreSQL instance
2. Set up VPC and security groups
3. Run migrations: `npx prisma migrate deploy`

#### Database Migrations
```bash
# Run this after deployment to set up tables
npx prisma migrate deploy
```

### 4. Environment Variables Checklist

#### Required for Production
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Strong random string (32+ characters)
- `STRIPE_SECRET_KEY` - Live Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Production webhook signing secret
- `STRIPE_PRICE_IDS` - JSON map of plan types to live price IDs
- `FRONTEND_URL` - Your deployed frontend URL

#### Optional
- `CONTACT_EMAIL` - Support email address
- SMTP settings for email notifications

### 5. Stripe Production Setup

1. **Switch to Live mode** in Stripe Dashboard
2. **Create Products and Prices:**
   - Analyst Pro: $49/month
   - Foundation: $249/month
   - Foundation Pro: $449/month
3. **Set up Production Webhook:**
   - URL: `https://your-api-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. **Update environment variables** with live keys

### 6. Custom Domain Setup (Optional)

#### Frontend (CloudFront + Route 53)
1. Create CloudFront distribution pointing to S3 bucket
2. Add SSL certificate via AWS Certificate Manager
3. Configure Route 53 A record

#### Backend
- Railway/Render: Custom domain available in paid plans
- AWS Lambda: Use API Gateway custom domain

### 7. Monitoring and Logs

#### Railway
- Built-in logs and metrics dashboard
- Real-time log streaming

#### Render
- Log access in dashboard
- Uptime monitoring

#### AWS Lambda
- CloudWatch logs and metrics
- X-Ray tracing available

## Deployment Checklist

- [ ] Frontend built and deployed to S3
- [ ] Backend deployed to chosen platform
- [ ] Database created and migrated
- [ ] Environment variables configured
- [ ] Stripe webhooks configured for production
- [ ] DNS records configured (if using custom domain)
- [ ] SSL certificates configured
- [ ] CORS settings updated for production domain
- [ ] Rate limiting configured appropriately
- [ ] Monitoring and alerting set up

## Cost Estimates (Monthly)

### Free Tier Setup
- **Frontend**: S3 + CloudFront ~$1-5/month
- **Backend**: Railway (500hrs free) or Render (free)
- **Database**: Railway PostgreSQL (free tier) or Render ($7/month)
- **Total**: $1-12/month

### Production Setup
- **Frontend**: S3 + CloudFront ~$5-20/month
- **Backend**: Railway ($5-20/month) or AWS Lambda ($5-50/month)
- **Database**: Railway/Render PostgreSQL ($7-25/month)
- **Total**: $17-95/month
