# Server Architecture Guide

## Overview

The EndowCast server has been refactored from a flat file structure into a **domain-driven architecture** that mirrors the client feature organization. This improves maintainability, scalability, and developer experience.

## Directory Structure

```
apps/server/src/
├── app/
│   └── server.js                 # Main application entry point
├── features/                     # Domain-driven feature modules
│   ├── auth/                     # Authentication & authorization
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT authentication middleware
│   │   ├── routes/
│   │   │   └── auth.js          # Login, register, token verification
│   │   └── services/
│   │       └── securityService.js # Security utilities
│   ├── billing/                  # Payment processing
│   │   └── routes/
│   │       ├── payments.js       # Stripe payment handling
│   │       └── webhooks.js       # Stripe webhook processing
│   ├── notifications/            # Communication features
│   │   └── routes/
│   │       └── contact.js        # Contact form handling
│   ├── organizations/            # Multi-tenant organization management
│   │   └── routes/
│   │       └── organization.js   # Organization CRUD operations
│   ├── simulations/             # Monte Carlo simulation engine
│   │   └── routes/
│   │       └── simulations.js    # Simulation creation & execution
│   └── users/                   # User profile management
│       └── routes/
│           └── users.js          # User profile operations
├── infrastructure/              # External service integrations
│   └── email/
│       └── emailService.js      # Nodemailer email integration
└── shared/                      # Cross-cutting concerns
    └── middleware/
        └── usage.js             # Usage tracking middleware
```

## Design Principles

### 1. Domain-Driven Design (DDD)
- Each feature represents a distinct business domain
- Clear boundaries between features
- Self-contained modules with minimal cross-dependencies

### 2. Separation of Concerns
- **Routes**: HTTP endpoint definitions and request/response handling
- **Middleware**: Cross-cutting concerns (auth, validation, logging)
- **Services**: Business logic and external service integration
- **Infrastructure**: Database and third-party service connections

### 3. Consistency with Client Architecture
- Server features mirror client feature structure
- Aligned naming conventions across frontend and backend
- Shared understanding of business domains

## Feature Breakdown

### Authentication (`features/auth/`)
**Purpose**: User authentication, authorization, and security

**Key Components**:
- `routes/auth.js`: Login, registration, token verification endpoints
- `middleware/auth.js`: JWT token validation middleware
- `services/securityService.js`: Password hashing and security utilities

**API Endpoints**:
- `POST /api/auth/register` - User and organization registration
- `POST /api/auth/login` - User authentication
- `POST /api/auth/verify-token` - Token validation
- `POST /api/auth/forgot-password` - Password reset (placeholder)

### Billing (`features/billing/`)
**Purpose**: Stripe integration for payment processing

**Key Components**:
- `routes/payments.js`: Payment intent creation and management
- `routes/webhooks.js`: Stripe webhook event handling

**API Endpoints**:
- `POST /api/payments/create-payment-intent` - Payment processing
- `POST /api/webhooks/stripe` - Stripe event webhooks

### Simulations (`features/simulations/`)
**Purpose**: Monte Carlo simulation engine and data management

**Key Components**:
- `routes/simulations.js`: Simulation CRUD operations and execution

**API Endpoints**:
- `GET /api/simulations` - List user simulations
- `POST /api/simulations` - Create new simulation
- `GET /api/simulations/:id` - Get simulation details
- `PUT /api/simulations/:id` - Update simulation
- `DELETE /api/simulations/:id` - Delete simulation

### Organizations (`features/organizations/`)
**Purpose**: Multi-tenant organization management

**Key Components**:
- `routes/organization.js`: Organization profile and settings management

**API Endpoints**:
- `GET /api/organization` - Get organization details
- `PUT /api/organization` - Update organization settings

### Users (`features/users/`)
**Purpose**: User profile and account management

**Key Components**:
- `routes/users.js`: User profile operations and account management

**API Endpoints**:
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/account` - Delete user account

### Notifications (`features/notifications/`)
**Purpose**: Email and communication features

**Key Components**:
- `routes/contact.js`: Contact form handling and email sending

**API Endpoints**:
- `POST /api/contact` - Handle contact form submissions

## Infrastructure Layer

### Database (`infrastructure/database/`)
- Prisma ORM integration
- Database connection management
- Migration and seeding utilities

### Email (`infrastructure/email/`)
- Nodemailer service integration
- Email template management
- SMTP configuration

### Payments (`infrastructure/payments/`)
- Stripe SDK integration
- Payment processing utilities
- Webhook signature verification

## Shared Components

### Middleware (`shared/middleware/`)
- `auth.js`: JWT authentication verification
- `usage.js`: API usage tracking and rate limiting
- Error handling and validation middleware

### Utilities (`shared/utils/`)
- Common helper functions
- Data transformation utilities
- Validation schemas

### Constants (`shared/constants/`)
- Application-wide constants
- Configuration values
- Enum definitions

## Benefits of This Architecture

### 1. **Maintainability**
- Clear separation of business domains
- Easy to locate and modify feature-specific code
- Reduced cognitive load when working on specific features

### 2. **Scalability**
- Features can be developed independently
- Easy to add new features without affecting existing ones
- Potential for future microservice extraction

### 3. **Team Collaboration**
- Multiple developers can work on different features simultaneously
- Clear ownership boundaries for each domain
- Consistent patterns across all features

### 4. **Testing**
- Unit testing at the feature level
- Isolated testing of business logic
- Easier mock and stub creation for dependencies

## Migration Notes

### Import Path Updates
All import paths have been updated to reflect the new structure:

**Before**:
```javascript
const authMiddleware = require('./middleware/auth');
const userRoutes = require('./routes/users');
```

**After**:
```javascript
const authMiddleware = require('../features/auth/middleware/auth');
const userRoutes = require('../features/users/routes/users');
```

### File Movements
- All route files moved to `features/{domain}/routes/`
- Middleware organized by domain or moved to `shared/middleware/`
- Services relocated to appropriate feature directories
- Infrastructure services moved to `infrastructure/`

## Future Considerations

### 1. **Microservices Evolution**
The current domain structure provides a clear path for future microservice extraction if needed.

### 2. **Feature Module Templates**
Consider creating templates for new features to maintain consistency.

### 3. **Dependency Injection**
Future implementation could benefit from a dependency injection container for better testability.

### 4. **API Versioning**
The current structure supports future API versioning strategies.

## Development Guidelines

### Adding New Features
1. Create new directory under `features/`
2. Follow the established structure (routes/, middleware/, services/)
3. Update `server.js` to register new routes
4. Add appropriate tests
5. Update this documentation

### Modifying Existing Features
1. Locate the relevant feature directory
2. Make changes within the feature boundary
3. Update imports if moving files between features
4. Test thoroughly to ensure no regressions

### Cross-Feature Dependencies
- Minimize direct dependencies between features
- Use shared services or emit events for cross-feature communication
- Consider moving shared logic to `shared/` or `infrastructure/`

## Conclusion

This domain-driven architecture provides a solid foundation for the EndowCast server that scales with the business and development team. The clear separation of concerns and consistent patterns make the codebase more maintainable and developer-friendly.
