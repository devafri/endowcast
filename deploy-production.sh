#!/bin/bash
set -e

# EndowCast Production Deployment Script
# This script deploys the frontend to S3 with custom domain endowcast.com

echo "🚀 Starting EndowCast Production Deployment..."

# Configuration
BUCKET_NAME="endowcast.com"
CLOUDFRONT_DOMAIN="endowcast.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

print_status "AWS CLI is configured"

# Check if we're in the right directory
if [ ! -f "client/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Build the application
print_status "Building Vue.js application..."
cd client

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Build for production
npm run build

if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

print_status "Application built successfully"

# Check if S3 bucket exists
if aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    print_warning "S3 bucket s3://$BUCKET_NAME does not exist"
    read -p "Do you want to create it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Creating S3 bucket..."
        aws s3 mb "s3://$BUCKET_NAME" --region us-east-1
        
        # Enable static website hosting
        aws s3 website "s3://$BUCKET_NAME" \
            --index-document index.html \
            --error-document index.html
        
        # Create bucket policy
        cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF
        
        aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/bucket-policy.json
        rm /tmp/bucket-policy.json
        
        print_status "S3 bucket created and configured"
    else
        print_error "Cannot continue without S3 bucket"
        exit 1
    fi
fi

# Upload files to S3
print_status "Uploading files to S3..."
aws s3 sync dist/ "s3://$BUCKET_NAME" --delete --exact-timestamps

# Check if files were uploaded
OBJECT_COUNT=$(aws s3 ls "s3://$BUCKET_NAME" --recursive | wc -l)
print_status "Uploaded $OBJECT_COUNT files to S3"

# Try to find CloudFront distribution
print_status "Looking for CloudFront distribution..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '$CLOUDFRONT_DOMAIN')].Id" \
    --output text 2>/dev/null || echo "")

if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    print_status "Found CloudFront distribution: $DISTRIBUTION_ID"
    print_status "Creating cache invalidation..."
    
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text)
    
    print_status "Cache invalidation created: $INVALIDATION_ID"
    print_warning "Cache invalidation may take 5-15 minutes to complete"
else
    print_warning "No CloudFront distribution found for $CLOUDFRONT_DOMAIN"
    print_warning "If you have CloudFront set up, you may need to manually invalidate the cache"
fi

# Display final status
echo
echo "🎉 Deployment completed successfully!"
echo
echo "📊 Deployment Summary:"
echo "   • S3 Bucket: s3://$BUCKET_NAME"
echo "   • Files Uploaded: $OBJECT_COUNT"
echo "   • Website URL: http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    echo "   • CloudFront: https://$CLOUDFRONT_DOMAIN (cache invalidation in progress)"
else
    echo "   • Custom Domain: Configure CloudFront for https://$CLOUDFRONT_DOMAIN"
fi
echo

# Test the deployment
print_status "Testing deployment..."
if curl -s -I "http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com" | grep -q "200 OK"; then
    print_status "S3 website endpoint is responding correctly"
else
    print_warning "S3 website endpoint may not be accessible yet"
fi

if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    if curl -s -I "https://$CLOUDFRONT_DOMAIN" | grep -q "200"; then
        print_status "Custom domain is responding correctly"
    else
        print_warning "Custom domain may still be propagating or cache invalidation in progress"
    fi
fi

echo
echo "🌐 Your EndowCast application should be available at:"
echo "   • https://$CLOUDFRONT_DOMAIN (recommended)"
echo "   • http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com (S3 direct)"
echo
echo "💡 Next steps if this is your first deployment:"
echo "   1. Set up CloudFront distribution (see CUSTOM-DOMAIN-SETUP.md)"
echo "   2. Configure DNS records in GoDaddy"
echo "   3. Request and validate SSL certificate"
echo

cd ..
print_status "Deployment script completed!"
