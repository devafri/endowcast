# EndowCast Multi-Tenant Pricing & Architecture Plan

## 🎯 New Pricing Structure

| Tier | Price | Users | Target Market |
|------|-------|-------|---------------|
| **Free** | $0 | 1 | Trial users, students |
| **Analyst Pro** | $49/month | 1 | Individual professionals |
| **Foundation** | $249/month | Up to 5 | Small institutions, consultancies |
| **Foundation Pro** | $449/month | Up to 15 | Large institutions, universities |

## 🏗️ Multi-Tenant Architecture

### **Core Concepts:**
- **Organizations**: Top-level entities that subscribe to plans
- **Users**: Belong to organizations, inherit organization features
- **Workspaces**: Optional sub-organizations for large institutions
- **Role-Based Access**: Admin, User, Viewer roles

### **Data Model:**
```
Organization (tenant) → Subscription → Users → Simulations
```

## 📊 Feature Matrix

| Feature | Free | Analyst Pro | Foundation | Foundation Pro |
|---------|------|-------------|------------|----------------|
| **Users** | 1 | 1 | 5 | 15 |
| **Simulations/Month** | 3 | Unlimited | Unlimited | Unlimited |
| **Monte Carlo Runs** | 1,000 | 10,000 | 50,000 | 100,000 |
| **Time Horizon** | 10 years | 30 years | 50 years | 50 years |
| **Asset Classes** | Basic (4) | All (7) | All (7) | All (7) |
| **PDF Export** | ❌ | ✅ | ✅ | ✅ |
| **Data Export** | ❌ | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ✅ | ✅ |
| **Shared Workspaces** | ❌ | ❌ | ✅ | ✅ |
| **Advanced Analytics** | ❌ | ❌ | ✅ | ✅ |
| **Custom Branding** | ❌ | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ | ✅ |
| **SSO Integration** | ❌ | ❌ | ❌ | ✅ |
| **Audit Logs** | ❌ | ❌ | ❌ | ✅ |

## 🗄️ Database Schema Changes

### **New Tables:**

```sql
-- Organizations (Tenants)
CREATE TABLE organizations (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  domain VARCHAR, -- for SSO
  logo_url VARCHAR,
  custom_branding BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id VARCHAR PRIMARY KEY,
  organization_id VARCHAR REFERENCES organizations(id),
  plan_type VARCHAR NOT NULL, -- FREE, ANALYST_PRO, FOUNDATION, FOUNDATION_PRO
  status VARCHAR DEFAULT 'active', -- active, cancelled, past_due
  stripe_subscription_id VARCHAR,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  user_limit INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Organization Members
CREATE TABLE organization_members (
  id VARCHAR PRIMARY KEY,
  organization_id VARCHAR REFERENCES organizations(id),
  user_id VARCHAR REFERENCES users(id),
  role VARCHAR DEFAULT 'user', -- admin, user, viewer
  invited_by VARCHAR REFERENCES users(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP,
  status VARCHAR DEFAULT 'active', -- active, invited, inactive
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Usage Tracking
CREATE TABLE usage_tracking (
  id VARCHAR PRIMARY KEY,
  organization_id VARCHAR REFERENCES organizations(id),
  user_id VARCHAR REFERENCES users(id),
  resource_type VARCHAR, -- simulation, monte_carlo_run, pdf_export
  resource_count INTEGER DEFAULT 1,
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Updated User Table:**
```sql
ALTER TABLE users ADD COLUMN primary_organization_id VARCHAR REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN current_organization_id VARCHAR REFERENCES organizations(id);
```

### **Updated Simulation Table:**
```sql
ALTER TABLE simulations ADD COLUMN organization_id VARCHAR REFERENCES organizations(id);
ALTER TABLE simulations ADD COLUMN shared_with_org BOOLEAN DEFAULT true;
```

## 💳 Payment Processing Updates

### **Stripe Integration:**
- **Customer**: Maps to Organization (not individual users)
- **Subscriptions**: Per organization with user limits
- **Billing**: Organization admin manages billing
- **Proration**: When adding/removing users within limits

### **Pricing IDs:**
```javascript
const STRIPE_PRICES = {
  ANALYST_PRO_MONTHLY: 'price_analyst_pro_monthly',
  FOUNDATION_MONTHLY: 'price_foundation_monthly', 
  FOUNDATION_PRO_MONTHLY: 'price_foundation_pro_monthly',
  ANALYST_PRO_YEARLY: 'price_analyst_pro_yearly',
  FOUNDATION_YEARLY: 'price_foundation_yearly',
  FOUNDATION_PRO_YEARLY: 'price_foundation_pro_yearly'
};
```

## 🔐 Access Control & Permissions

### **Role Definitions:**

#### **Organization Admin:**
- Manage billing and subscription
- Invite/remove users
- Access all organization simulations
- Manage organization settings
- View usage analytics

#### **User:**
- Create/edit own simulations
- View shared simulations
- Export PDFs (if plan allows)
- Access API (if plan allows)

#### **Viewer:**
- View shared simulations
- No creation/editing rights
- Read-only access

### **Feature Gates:**
```javascript
const hasFeatureAccess = (organization, feature) => {
  const { planType, userCount } = organization.subscription;
  
  switch (feature) {
    case 'pdf_export':
      return ['ANALYST_PRO', 'FOUNDATION', 'FOUNDATION_PRO'].includes(planType);
    case 'api_access':
      return ['FOUNDATION', 'FOUNDATION_PRO'].includes(planType);
    case 'custom_branding':
      return planType === 'FOUNDATION_PRO';
    case 'sso':
      return planType === 'FOUNDATION_PRO';
    default:
      return true;
  }
};
```

## 🎨 UI/UX Changes

### **New Pages/Components:**

1. **Organization Dashboard**
   - Usage overview
   - Team member management
   - Billing information
   - Plan upgrades

2. **Team Management**
   - Invite users
   - Manage roles
   - User activity

3. **Billing Management**
   - Current plan details
   - Usage meters
   - Upgrade/downgrade
   - Payment history

4. **Settings Overhaul**
   - Organization settings
   - User preferences
   - Notification settings

### **Navigation Updates:**
- Organization switcher (for users in multiple orgs)
- Team simulations section
- Usage indicators
- Plan upgrade prompts

## 🚀 Implementation Phases

### **Phase 1: Database & Backend (Week 1-2)**
- Update Prisma schema
- Migration scripts
- Organization CRUD APIs
- Updated authentication middleware

### **Phase 2: Payment System (Week 2-3)**
- Stripe integration updates
- Organization-based billing
- Usage tracking system
- Subscription management APIs

### **Phase 3: Frontend Core (Week 3-4)**
- Organization dashboard
- Team management
- Updated pricing page
- Signup flow changes

### **Phase 4: Feature Gates (Week 4-5)**
- Permission system
- Feature restrictions
- Usage monitoring
- Plan upgrade flows

### **Phase 5: Migration & Launch (Week 5-6)**
- Existing user migration
- Testing and QA
- Documentation updates
- Soft launch with beta users

## 📈 Revenue Impact Analysis

### **Current vs New Pricing:**

**Current (Individual):**
- Professional: $49/month = $588/year
- Institution: $199/month = $2,388/year

**New (Organization-Based):**
- Analyst Pro: $49/month = $588/year (1 user)
- Foundation: $249/month = $2,988/year (5 users = $598/user/year)
- Foundation Pro: $449/month = $5,388/year (15 users = $359/user/year)

### **Benefits:**
✅ **Higher ARPU**: Foundation tier alone is 25% higher than old Institution  
✅ **Better Value Proposition**: Lower per-user cost for teams  
✅ **Expansion Revenue**: Organizations can grow within tiers  
✅ **Stickier Customers**: Team-based usage creates switching costs  
✅ **Enterprise Appeal**: Foundation Pro targets larger institutions  

## 🎯 Go-to-Market Strategy

### **Target Customers:**

**Analyst Pro ($49/month):**
- Independent consultants
- Individual portfolio managers
- Graduate students/researchers

**Foundation ($249/month):**
- Small endowments ($10M-$100M)
- Boutique investment firms
- Regional foundations
- Small university departments

**Foundation Pro ($449/month):**
- Large endowments ($100M+)
- Major universities
- Large foundations
- Investment consulting firms

### **Sales Messaging:**
- **Cost Savings**: "Same powerful tools, better team pricing"
- **Collaboration**: "Built for teams, not just individuals"
- **Scalability**: "Grow your team without changing platforms"

## 🔄 Migration Strategy

### **Existing Users:**
1. **Grandfather Period**: 60 days notice before changes
2. **Auto-Migration**: 
   - Current Professional → Analyst Pro
   - Current Institution → Foundation (with ability to add users)
3. **Upgrade Incentives**: 30% off first 3 months of higher tiers

### **Communication Plan:**
- Email campaign explaining benefits
- In-app notifications
- Webinar showcasing new features
- Personal outreach to high-value customers

## 📊 Success Metrics

### **Key Performance Indicators:**
- **ARPU Growth**: Target 40% increase in 6 months
- **User Growth**: 3x more users per paying customer
- **Churn Reduction**: Team-based subscriptions should reduce churn by 50%
- **Expansion Revenue**: 60% of Foundation customers upgrade to Foundation Pro within 12 months

### **Leading Indicators:**
- Trial-to-paid conversion rates per tier
- User invitation acceptance rates
- Feature adoption rates
- Support ticket reduction (better onboarding)

---

## 🚀 Ready to Implement?

This pricing structure positions EndowCast much better for:
1. **Higher revenue** per customer
2. **Better market positioning** vs competitors
3. **Stickier subscriptions** due to team collaboration
4. **Clear upgrade path** for growing organizations

The $249/$449 price points are perfect for the institutional market - high enough to be taken seriously but accessible for smaller endowments.

**Next Steps:**
1. Approve this architecture plan
2. Start with Phase 1 (database changes)
3. Set up Stripe pricing tiers
4. Begin UI mockups for new flows

Would you like me to start implementing Phase 1 with the database schema updates?
