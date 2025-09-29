# Proposed File Structure Refactoring

## Root Level - Project Organization
```
endowment-commercial/
├── README.md
├── docker-compose.yml
├── .gitignore
├── .env.example
├── 
├── apps/                          # Monorepo-style app organization
│   ├── client/                    # Frontend application
│   └── server/                    # Backend API
├── 
├── packages/                      # Shared packages (future)
│   ├── shared-types/              # TypeScript definitions
│   ├── shared-utils/              # Common utilities
│   └── shared-config/             # Shared configurations
├── 
├── docs/                          # All documentation
│   ├── api/                       # API documentation
│   ├── deployment/                # Deployment guides
│   ├── architecture/              # Architecture decisions
│   └── setup/                     # Setup instructions
├── 
├── infrastructure/                # Infrastructure as Code
│   ├── aws/                       # AWS CloudFormation/CDK
│   ├── terraform/                 # Terraform configs
│   └── scripts/                   # Deployment scripts
├── 
└── tools/                         # Development tools
    ├── test-scripts/              # Testing utilities
    └── database/                  # Database utilities
```

## Client Application Structure (apps/client/)
```
client/
├── public/                        # Static assets
├── src/
│   ├── app/                       # App-level configuration
│   │   ├── App.vue
│   │   ├── main.ts
│   │   └── router/
│   │       └── index.ts
│   │
│   ├── shared/                    # Shared/common code
│   │   ├── components/            # Reusable UI components
│   │   │   ├── ui/                # Basic UI components
│   │   │   ├── layout/            # Layout components
│   │   │   └── forms/             # Form components
│   │   ├── services/              # External services
│   │   ├── stores/                # Global state management
│   │   ├── utils/                 # Utility functions
│   │   ├── types/                 # TypeScript definitions
│   │   └── assets/                # Shared assets
│   │
│   ├── features/                  # Feature-based modules
│   │   ├── auth/                  # Authentication feature
│   │   │   ├── components/
│   │   │   ├── views/
│   │   │   ├── stores/
│   │   │   └── services/
│   │   ├── simulation/            # Simulation feature
│   │   │   ├── components/
│   │   │   │   ├── inputs/
│   │   │   │   └── results/
│   │   │   ├── views/
│   │   │   ├── stores/
│   │   │   ├── services/
│   │   │   └── lib/               # Business logic
│   │   ├── organization/          # Organization management
│   │   ├── billing/               # Billing & subscriptions
│   │   └── portfolio/             # Portfolio management
│   │
│   └── pages/                     # Route-level pages
│       ├── auth/
│       ├── dashboard/
│       ├── simulation/
│       └── settings/
└── [config files]
```

## Server Application Structure (apps/server/)
```
server/
├── prisma/                        # Database schema & migrations
├── src/
│   ├── app/                       # Application setup
│   │   ├── server.js
│   │   └── config/
│   │
│   ├── shared/                    # Shared infrastructure
│   │   ├── middleware/            # Express middleware
│   │   ├── utils/                 # Utility functions
│   │   ├── types/                 # TypeScript definitions
│   │   └── constants/             # Application constants
│   │
│   ├── features/                  # Feature domains
│   │   ├── auth/                  # Authentication domain
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── validators/
│   │   ├── organizations/         # Multi-tenant domain
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   └── models/
│   │   ├── simulations/           # Simulation domain
│   │   ├── billing/               # Stripe integration
│   │   ├── users/                 # User management
│   │   └── notifications/         # Email/notifications
│   │
│   ├── infrastructure/            # External integrations
│   │   ├── database/              # Database utilities
│   │   ├── email/                 # Email service
│   │   ├── storage/               # File storage
│   │   └── payments/              # Payment processing
│   │
│   └── lambda/                    # Serverless functions
└── [config files]
```

## Migration Steps

### Phase 1: Directory Structure Setup ✅
- [x] Create new directory structure (apps/, docs/, infrastructure/, tools/)
- [x] Git commit current working version (rollback point: 31b7dca)

### Phase 2: Move Applications to Apps Folder ✅
- [x] Move existing applications (mv client apps/ && mv server apps/)
- [x] Update deployment scripts that reference old paths
- [x] Update package.json main field reference
- [x] Test both applications work from new locations

### Phase 3: Reorganize Documentation ✅
- [x] Move documentation files to docs/ with proper categorization
- [x] Architecture docs → docs/architecture/
- [x] Deployment guides → docs/deployment/
- [x] Setup instructions → docs/setup/
- [x] General docs → docs/

### Phase 4: Clean Up Root Level ✅
- [x] Move infrastructure files to infrastructure/aws/
- [x] Move deployment scripts to infrastructure/scripts/
- [x] Move utility scripts to tools/
- [x] Remove unnecessary backup files (*_old, *_backup, *_new, *_fixed)
- [x] Remove build artifacts and sensitive files
- [x] Create comprehensive root README.md

### Phase 5: Client Feature Refactoring (Next)
- [ ] Reorganize components by feature domain
- [ ] Move views to feature-specific folders  
- [ ] Update import paths
- [ ] Test functionality

### Phase 6: Server Domain Refactoring (Next)
- [ ] Reorganize routes by domain
- [ ] Create feature-specific service layers
- [ ] Update middleware organization
- [ ] Test API endpoints

### Rollback Instructions
If anything breaks during refactoring:
```bash
git reset --hard 31b7dca
```

This will restore the exact working state before refactoring began.
