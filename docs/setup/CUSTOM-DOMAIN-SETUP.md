# EndowCast Custom Domain Setup Guide
## endowcast.com with AWS S3 + CloudFront + GoDaddy

This guide covers setting up your custom domain `endowcast.com` with AWS S3 static website hosting and GoDaddy DNS.

## Architecture Overview

```
endowcast.com (GoDaddy DNS) → CloudFront → S3 Bucket → Static Website
```

## Part 1: AWS S3 Bucket Setup for Custom Domain

### 1. Create Root Domain Bucket

The bucket name **must exactly match** your domain name:

```bash
# Create the main bucket
aws s3 mb s3://endowcast.com --region us-east-1

# Create www redirect bucket (optional but recommended)
aws s3 mb s3://www.endowcast.com --region us-east-1
```

### 2. Configure Root Domain Bucket for Static Website Hosting

```bash
# Enable static website hosting
aws s3 website s3://endowcast.com \
  --index-document index.html \
  --error-document index.html
```

### 3. Create Bucket Policy for Public Access

Create `endowcast-bucket-policy.json`:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::endowcast.com/*"
        }
    ]
}
```

Apply the policy:

```bash
aws s3api put-bucket-policy --bucket endowcast.com --policy file://endowcast-bucket-policy.json
```

### 4. Configure WWW Redirect Bucket

```bash
# Configure www bucket to redirect to root domain
aws s3 website s3://www.endowcast.com \
  --redirect-all-requests-to HostName=endowcast.com,Protocol=https
```

### 5. Upload Your Built Application

```bash
# Build your Vue.js application
cd client
npm run build

# Upload to S3
aws s3 sync dist/ s3://endowcast.com --delete

# Verify upload
aws s3 ls s3://endowcast.com --recursive
```

## Part 2: CloudFront Distribution Setup (Recommended)

CloudFront provides HTTPS, better performance, and caching.

### 1. Request SSL Certificate

**Important**: Certificate must be in `us-east-1` region for CloudFront.

```bash
# Request certificate for both root and www domains
aws acm request-certificate \
  --domain-name endowcast.com \
  --subject-alternative-names www.endowcast.com \
  --validation-method DNS \
  --region us-east-1
```

### 2. Create CloudFront Distribution

Create `cloudfront-config.json`:

```json
{
    "CallerReference": "endowcast-$(date +%s)",
    "Comment": "EndowCast Production Distribution",
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-endowcast.com",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 7,
            "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
        },
        "CachedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"]
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            },
            "Headers": {
                "Quantity": 0
            }
        },
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "Compress": true
    },
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-endowcast.com",
                "DomainName": "endowcast.com.s3-website-us-east-1.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "Aliases": {
        "Quantity": 2,
        "Items": ["endowcast.com", "www.endowcast.com"]
    },
    "DefaultRootObject": "index.html",
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 300
            }
        ]
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100",
    "ViewerCertificate": {
        "ACMCertificateArn": "arn:aws:acm:us-east-1:YOUR_ACCOUNT:certificate/YOUR_CERT_ID",
        "SSLSupportMethod": "sni-only",
        "MinimumProtocolVersion": "TLSv1.2_2021"
    }
}
```

Create the distribution:

```bash
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

## Part 3: GoDaddy DNS Configuration

### 1. Get CloudFront Distribution Domain

After creating CloudFront distribution, get the domain name:

```bash
# List your distributions
aws cloudfront list-distributions --query 'DistributionList.Items[].{Id:Id,DomainName:DomainName,Aliases:Aliases.Items}'
```

You'll get something like: `d1234567890.cloudfront.net`

### 2. Configure DNS Records in GoDaddy

Log into your GoDaddy account and navigate to DNS Management:

#### A. Root Domain (endowcast.com)

**Option 1: Using ALIAS/ANAME Record (Recommended if available)**
```
Type: ALIAS or ANAME
Name: @
Value: d1234567890.cloudfront.net
TTL: 600
```

**Option 2: Using CNAME (Alternative)**
If GoDaddy doesn't support ALIAS for root domain, you'll need to:
1. Set up a redirect from root to www
2. Use CNAME for www subdomain

#### B. WWW Subdomain (www.endowcast.com)

```
Type: CNAME
Name: www
Value: d1234567890.cloudfront.net
TTL: 600
```

#### C. Complete DNS Setup

Your GoDaddy DNS records should look like this:

```
Type    Name    Value                           TTL
A       @       [CloudFront IP if using A]     600
CNAME   www     d1234567890.cloudfront.net     600
```

### 3. Alternative: Direct S3 Website Endpoint

If you don't want to use CloudFront, you can point directly to S3:

```
Type: CNAME
Name: @
Value: endowcast.com.s3-website-us-east-1.amazonaws.com
TTL: 600
```

**Note**: This won't provide HTTPS or custom domain SSL.

## Part 4: SSL Certificate Validation

### 1. Validate Certificate via DNS

After requesting the certificate, you'll need to add validation records:

```bash
# Get certificate validation records
aws acm describe-certificate --certificate-arn YOUR_CERT_ARN --region us-east-1
```

Add the CNAME records shown in the validation to your GoDaddy DNS:

```
Type: CNAME
Name: _validation.endowcast.com
Value: [ACM provided validation string]
TTL: 600
```

### 2. Wait for Certificate Validation

```bash
# Check certificate status
aws acm describe-certificate --certificate-arn YOUR_CERT_ARN --region us-east-1 --query 'Certificate.Status'
```

## Part 5: Testing and Verification

### 1. Test DNS Propagation

```bash
# Check DNS resolution
nslookup endowcast.com
nslookup www.endowcast.com

# Check from different locations
dig @8.8.8.8 endowcast.com
dig @1.1.1.1 endowcast.com
```

### 2. Test Website Access

```bash
# Test HTTP (should redirect to HTTPS if using CloudFront)
curl -I http://endowcast.com

# Test HTTPS
curl -I https://endowcast.com

# Test WWW redirect
curl -I https://www.endowcast.com
```

### 3. Test Application

1. Visit https://endowcast.com
2. Verify all pages load correctly
3. Test API calls to your backend
4. Check browser console for any errors

## Part 6: Deployment Automation

### 1. Create Deployment Script

Create `deploy-production.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying EndowCast to Production..."

# Build application
echo "📦 Building application..."
cd client
npm run build

# Upload to S3
echo "☁️  Uploading to S3..."
aws s3 sync dist/ s3://endowcast.com --delete

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[0]=='endowcast.com'].Id" --output text)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "✅ Deployment complete!"
echo "🌐 Visit: https://endowcast.com"
```

Make it executable:

```bash
chmod +x deploy-production.sh
```

### 2. Environment Variables

Update your production environment variables:

```bash
# client/.env.production
VITE_API_URL=https://api.endowcast.com/api
VITE_APP_TITLE=EndowCast
VITE_APP_DESCRIPTION=Professional Endowment Modeling
```

## Part 7: Monitoring and Maintenance

### 1. CloudWatch Monitoring

Set up monitoring for:
- S3 bucket metrics
- CloudFront metrics  
- Certificate expiration alerts

### 2. Automated Backups

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
aws s3 sync s3://endowcast.com s3://endowcast-backups/$DATE/
```

### 3. Cost Optimization

- Enable S3 lifecycle policies for old versions
- Use CloudFront caching effectively
- Monitor AWS costs regularly

## Troubleshooting

### Common Issues

1. **Certificate validation fails**
   - Ensure CNAME records are added to GoDaddy
   - Wait for DNS propagation (up to 48 hours)

2. **Website not loading**
   - Check S3 bucket policy allows public read
   - Verify CloudFront distribution is deployed
   - Check DNS records in GoDaddy

3. **HTTPS not working**
   - Ensure certificate is validated and attached
   - Check CloudFront viewer protocol policy

4. **API calls failing**
   - Update CORS configuration in backend
   - Check API endpoint in environment variables

### Useful Commands

```bash
# Check certificate status
aws acm list-certificates --region us-east-1

# Check CloudFront distributions
aws cloudfront list-distributions --query 'DistributionList.Items[].[Id,DomainName,Status]'

# Check S3 bucket website configuration
aws s3api get-bucket-website --bucket endowcast.com

# Test SSL certificate
echo | openssl s_client -connect endowcast.com:443 -servername endowcast.com
```

## Summary

After completing this setup:

✅ **endowcast.com** → CloudFront → S3 (your main app)  
✅ **www.endowcast.com** → Redirects to endowcast.com  
✅ **HTTPS enabled** with AWS Certificate Manager  
✅ **Fast loading** with CloudFront CDN  
✅ **Easy deployment** with automated scripts  

Your EndowCast application will be accessible at https://endowcast.com with professional SSL and fast global delivery!
