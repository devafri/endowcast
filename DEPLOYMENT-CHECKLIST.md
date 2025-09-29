# EndowCast Custom Domain Deployment Checklist

## Pre-Deployment Setup

### ✅ AWS Setup
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Verify AWS account access (`aws sts get-caller-identity`)
- [ ] Ensure you're in the `us-east-1` region for certificates

### ✅ Domain Setup
- [x] Domain `endowcast.com` registered with GoDaddy
- [ ] Access to GoDaddy DNS management panel

## Step 1: Quick Deployment (S3 Only)

Run the automated deployment script:

```bash
# From your project root directory
./deploy-production.sh
```

This script will:
- Build your Vue.js application
- Create S3 bucket `endowcast.com` if it doesn't exist
- Upload your application files
- Configure static website hosting
- Look for existing CloudFront distribution

**Result**: Your app will be accessible at:
`http://endowcast.com.s3-website-us-east-1.amazonaws.com`

## Step 2: CloudFront + SSL Setup (Recommended)

### 2.1 Request SSL Certificate

```bash
aws acm request-certificate \
  --domain-name endowcast.com \
  --subject-alternative-names www.endowcast.com \
  --validation-method DNS \
  --region us-east-1
```

### 2.2 Get Certificate ARN

```bash
aws acm list-certificates --region us-east-1
```

Copy the certificate ARN for the next step.

### 2.3 Create CloudFront Distribution

Edit the `cloudfront-config.json` from the detailed guide and update:
- Replace `YOUR_CERT_ID` with your actual certificate ARN
- Run: `aws cloudfront create-distribution --distribution-config file://cloudfront-config.json`

### 2.4 Get CloudFront Domain Name

```bash
aws cloudfront list-distributions --query 'DistributionList.Items[].{Id:Id,DomainName:DomainName,Aliases:Aliases.Items}'
```

You'll get something like: `d1234567890.cloudfront.net`

## Step 3: GoDaddy DNS Configuration

Log into GoDaddy → My Account → Domain Portfolio → endowcast.com → DNS

### Add these DNS records:

| Type  | Name | Value                      | TTL |
|-------|------|----------------------------|-----|
| CNAME | @    | d1234567890.cloudfront.net | 600 |
| CNAME | www  | d1234567890.cloudfront.net | 600 |

**Note**: Replace `d1234567890.cloudfront.net` with your actual CloudFront domain.

### For Certificate Validation:

Add the CNAME record provided by ACM:

| Type  | Name                                    | Value                           | TTL |
|-------|-----------------------------------------|---------------------------------|-----|
| CNAME | _xxxxxxxxxxxxx.endowcast.com           | _yyyyyyyyyy.validation.acm.aws | 600 |

## Step 4: Update Application Configuration

Update your production environment variables:

```bash
# client/.env.production
VITE_API_URL=https://api.endowcast.com/api
# or if using serverless
VITE_API_URL=https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod/api
```

## Step 5: Test Everything

### 5.1 Wait for DNS Propagation (15 minutes - 2 hours)

```bash
# Test DNS resolution
nslookup endowcast.com
nslookup www.endowcast.com
```

### 5.2 Test Certificate Validation

```bash
aws acm describe-certificate --certificate-arn YOUR_CERT_ARN --region us-east-1 --query 'Certificate.Status'
```

Should return: `"ISSUED"`

### 5.3 Test Website

```bash
# Test HTTPS
curl -I https://endowcast.com
curl -I https://www.endowcast.com

# Should return HTTP/2 200
```

### 5.4 Test Application

1. Visit https://endowcast.com
2. Create a test simulation
3. Verify API calls work
4. Test all major features

## Step 6: Ongoing Deployment

After initial setup, simply run:

```bash
./deploy-production.sh
```

This will:
- Build and upload new changes
- Automatically invalidate CloudFront cache
- Show deployment status

## Troubleshooting

### Certificate Issues
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn YOUR_ARN --region us-east-1

# List all certificates
aws acm list-certificates --region us-east-1
```

### DNS Issues
```bash
# Check DNS from different servers
dig @8.8.8.8 endowcast.com
dig @1.1.1.1 endowcast.com

# Check from website
# Visit: https://dnschecker.org/#CNAME/endowcast.com
```

### CloudFront Issues
```bash
# List distributions
aws cloudfront list-distributions

# Check invalidation status
aws cloudfront list-invalidations --distribution-id YOUR_DIST_ID
```

## Quick Commands Reference

```bash
# Build and deploy
./deploy-production.sh

# Manual S3 sync
aws s3 sync client/dist/ s3://endowcast.com --delete

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"

# Check website status
curl -I https://endowcast.com
```

## Expected Timeline

- **S3 deployment**: ~2-5 minutes
- **DNS propagation**: 15 minutes - 2 hours  
- **Certificate validation**: 5-30 minutes
- **CloudFront deployment**: 15-20 minutes
- **Total setup time**: 1-3 hours (mostly waiting)

## Cost Estimate

- **S3 hosting**: ~$1-3/month
- **CloudFront**: ~$1-5/month
- **Route 53** (if used): $0.50/month
- **SSL Certificate**: FREE with ACM
- **Total**: ~$2-8/month

---

## Next Steps After Deployment

1. **Set up backend API** (if not already done)
2. **Configure CORS** to allow endowcast.com
3. **Set up monitoring** with CloudWatch
4. **Configure automated backups**
5. **Set up CI/CD pipeline** (optional)

Once this is working, you'll have:
✅ Professional domain: https://endowcast.com  
✅ Fast global delivery via CloudFront  
✅ Free SSL certificate  
✅ Automated deployment process  
✅ Scalable static hosting
