#!/bin/bash

# EndowCast S3 Deployment Script with CloudFront Invalidation
# Usage: ./deploy.sh YOUR-BUCKET-NAME [API_URL] [CLOUDFRONT_DISTRIBUTION_ID]

BUCKET_NAME=$1
API_URL=$2
CLOUDFRONT_ID=$3

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Error: Please provide bucket name"
    echo "Usage: ./deploy.sh YOUR-BUCKET-NAME [API_URL] [CLOUDFRONT_DISTRIBUTION_ID]"
    echo "Example: ./deploy.sh my-endowcast-app https://api.endowcast.com E1A2B3C4D5F6G"
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

# Configure cache headers and content types
echo "⚙️  Setting Cache-Control and content-type headers"

# 1) Long cache for static, hashed assets (immutable)
if [ -d "dist/assets" ]; then
    echo "   - Applying long cache to assets/"
    aws s3 cp dist/assets s3://$BUCKET_NAME/assets --recursive \
        --cache-control "public, max-age=31536000, immutable"
fi

# 2) Long cache for fonts
if [ -d "dist/fonts" ]; then
    echo "   - Applying long cache to fonts/"
    aws s3 cp dist/fonts s3://$BUCKET_NAME/fonts --recursive \
        --cache-control "public, max-age=31536000, immutable"
fi

# 3) Short cache for HTML/root files so new deploys propagate quickly
if [ -f "dist/index.html" ]; then
    echo "   - Setting short cache on index.html"
    aws s3 cp dist/index.html s3://$BUCKET_NAME/index.html \
        --cache-control "public, max-age=300" --content-type "text/html"
fi

if [ -f "dist/manifest.webmanifest" ]; then
    aws s3 cp dist/manifest.webmanifest s3://$BUCKET_NAME/manifest.webmanifest \
        --cache-control "public, max-age=300" --content-type "application/manifest+json"
fi

# Ensure other top-level web manifests and PWA files get short cache
for f in site.webmanifest favicon.ico icon.svg; do
    if [ -f "dist/$f" ]; then
        aws s3 cp "dist/$f" s3://$BUCKET_NAME/"$f" --cache-control "public, max-age=300"
    fi
done

echo "🔧 Configuring S3 bucket for static website hosting..."
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html

# Invalidate CloudFront if distribution ID is provided
# Default: targeted invalidation for index/root only (fast, cheaper)
# Pass a fourth parameter "full" to run a wildcard invalidation (/*)
INVALIDATION_SCOPE=${4:-targeted}
if [ -n "$CLOUDFRONT_ID" ]; then
    echo "🔄 Creating CloudFront invalidation for distribution: $CLOUDFRONT_ID (scope: $INVALIDATION_SCOPE)"
    if [ "$INVALIDATION_SCOPE" = "full" ]; then
      INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*" --query 'Invalidation.Id' --output text)
    else
      # Target index and root — this is sufficient when assets are immutable and only index.html changes
      INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/index.html" "/" --query 'Invalidation.Id' --output text)
    fi

    if [ $? -eq 0 ]; then
        echo "✅ CloudFront invalidation created: $INVALIDATION_ID"
        echo "⏳ Invalidation may take several minutes to complete"
    else
        echo "❌ CloudFront invalidation failed!"
        exit 1
    fi
else
    echo "⚠️  No CloudFront distribution ID provided - skipping invalidation"
    echo "   To invalidate CloudFront cache, run:"
    echo "   aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths '/index.html' '/'"
fi

echo "✅ Deployment completed!"
echo "🌐 Your app should be available at:"
echo "   Static Website: http://$BUCKET_NAME.s3-website-REGION.amazonaws.com"
echo "   (Replace REGION with your bucket's region, e.g., us-east-1)"
echo ""
echo "📝 Next steps:"
echo "   1. Set up CloudFront distribution for HTTPS and custom domain (if not already done)"
echo "   2. Configure your backend API with the frontend URL"
echo "   3. Set up Route 53 for custom domain (optional)"
