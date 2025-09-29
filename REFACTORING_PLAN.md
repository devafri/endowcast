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
