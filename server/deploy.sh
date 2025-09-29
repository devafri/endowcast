#!/bin/bash

# EndowCast Backend Deployment Script
# Supports multiple deployment targets

DEPLOYMENT_TARGET=$1
APP_NAME=${2:-"endowcast-backend"}

if [ -z "$DEPLOYMENT_TARGET" ]; then
    echo "❌ Error: Please specify deployment target"
    echo "Usage: ./deploy.sh [railway|render|aws-lambda] [APP_NAME]"
    echo ""
    echo "Available targets:"
    echo "  railway    - Deploy to Railway (recommended)"
    echo "  render     - Deploy to Render"
    echo "  aws-lambda - Deploy to AWS Lambda (serverless)"
    exit 1
fi

echo "🏗️  Preparing backend deployment for: $DEPLOYMENT_TARGET"

case "$DEPLOYMENT_TARGET" in
    "railway")
        echo "🚂 Deploying to Railway..."
        
        # Check if Railway CLI is installed
        if ! command -v railway &> /dev/null; then
            echo "❌ Railway CLI not found. Install it first:"
            echo "npm install -g @railway/cli"
            exit 1
        fi
        
        # Build for production
        echo "📦 Building production assets..."
        npm install --production=false
        npx prisma generate
        
        # Deploy with Railway
        echo "🚀 Deploying to Railway..."
        railway login
        railway deploy
        
        echo "✅ Railway deployment initiated!"
        echo "🌐 Check your Railway dashboard for deployment status"
        ;;
        
    "render")
        echo "🎨 Deploying to Render..."
        echo "📝 Manual steps required:"
        echo "1. Push your code to GitHub"
        echo "2. Connect your GitHub repo in Render dashboard"
        echo "3. Set environment variables in Render dashboard"
        echo "4. Deploy with build command: npm install && npx prisma generate"
        echo "5. Start command: npm start"
        ;;
        
    "aws-lambda")
        echo "⚡ Preparing for AWS Lambda deployment..."
        
        # Check if Serverless Framework is installed
        if ! command -v serverless &> /dev/null; then
            echo "❌ Serverless Framework not found. Install it first:"
            echo "npm install -g serverless"
            exit 1
        fi
        
        # Create serverless configuration if it doesn't exist
        if [ ! -f "serverless.yml" ]; then
            echo "📝 Creating serverless.yml configuration..."
            cat > serverless.yml << 'EOF'
service: endowcast-backend

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NODE_ENV: production
    DATABASE_URL: ${env:DATABASE_URL}
    JWT_SECRET: ${env:JWT_SECRET}
    STRIPE_SECRET_KEY: ${env:STRIPE_SECRET_KEY}
    STRIPE_WEBHOOK_SECRET: ${env:STRIPE_WEBHOOK_SECRET}
    FRONTEND_URL: ${env:FRONTEND_URL}

functions:
  api:
    handler: src/lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
      - http:
          path: /
          method: ANY
          cors: true

plugins:
  - serverless-offline

package:
  exclude:
    - node_modules/prisma/engines/**
EOF
        fi
        
        # Create Lambda handler if it doesn't exist
        if [ ! -f "src/lambda.js" ]; then
            echo "📝 Creating Lambda handler..."
            cat > src/lambda.js << 'EOF'
const serverless = require('serverless-http');
const app = require('./server');

module.exports.handler = serverless(app);
EOF
        fi
        
        echo "🚀 Deploying to AWS Lambda..."
        npm install serverless-http serverless-offline --save
        serverless deploy
        
        echo "✅ Lambda deployment completed!"
        ;;
        
    *)
        echo "❌ Unknown deployment target: $DEPLOYMENT_TARGET"
        exit 1
        ;;
esac

echo ""
echo "📋 Production Environment Variables Checklist:"
echo "   ✓ DATABASE_URL (PostgreSQL connection string)"
echo "   ✓ JWT_SECRET (strong random string)"
echo "   ✓ STRIPE_SECRET_KEY (live key for production)"
echo "   ✓ STRIPE_WEBHOOK_SECRET (from production webhook)"
echo "   ✓ STRIPE_PRICE_IDS (production price IDs)"
echo "   ✓ FRONTEND_URL (your deployed frontend URL)"
echo "   ✓ CONTACT_EMAIL (your support email)"
