#!/bin/bash

# EndowCast S3 Deployment Script
# Usage: ./deploy.sh YOUR-BUCKET-NAME [API_URL]

BUCKET_NAME=$1
API_URL=$2

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Error: Please provide bucket name and API URL"
    echo "Usage: ./deploy.sh YOUR-BUCKET-NAME [API_URL]"
    echo "Example: ./deploy.sh my-endowcast-app https://api.endowcast.com"
    exit 1
fi

# Set API URL for production build
if [ -n "$API_URL" ]; then
    echo "🔧 Setting API URL to: $API_URL"
    export VITE_API_URL="$API_URL"
fi

echo "🏗️  Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "📦 Uploading to S3 bucket: $BUCKET_NAME"
aws s3 sync dist/ s3://$BUCKET_NAME --delete

if [ $? -ne 0 ]; then
    echo "❌ Upload failed!"
    exit 1
fi

# Set content types for proper caching
echo "⚙️  Setting content types..."
aws s3 cp s3://$BUCKET_NAME s3://$BUCKET_NAME --recursive --exclude "*" --include "*.js" --content-type="application/javascript"
aws s3 cp s3://$BUCKET_NAME s3://$BUCKET_NAME --recursive --exclude "*" --include "*.css" --content-type="text/css"
aws s3 cp s3://$BUCKET_NAME s3://$BUCKET_NAME --recursive --exclude "*" --include "*.html" --content-type="text/html"

echo "🔧 Configuring S3 bucket for static website hosting..."
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

echo "✅ Deployment completed!"
echo "🌐 Your app should be available at:"
echo "   Static Website: http://$BUCKET_NAME.s3-website-REGION.amazonaws.com"
echo "   (Replace REGION with your bucket's region, e.g., us-east-1)"
echo ""
echo "📝 Next steps:"
echo "   1. Set up CloudFront distribution for HTTPS and custom domain"
echo "   2. Configure your backend API with the frontend URL"
echo "   3. Set up Route 53 for custom domain (optional)"
