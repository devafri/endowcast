# EndowCast - Strategic Endowment Forecasting Platform

A comprehensive Monte Carlo simulation platform for endowment risk analysis and strategic planning, built with Vue 3, Node.js, and multi-tenant architecture.

## 🏗️ Project Structure

```
endowment-commercial/
├── apps/                          # Applications
│   ├── client/                    # Vue 3 + TypeScript frontend
│   └── server/                    # Node.js + Express API
├── docs/                          # Documentation
│   ├── api/                       # API documentation
│   ├── architecture/              # System architecture
│   ├── deployment/                # Deployment guides
│   └── setup/                     # Setup instructions
├── infrastructure/                # Infrastructure as Code
│   ├── aws/                       # AWS configurations
│   └── scripts/                   # Deployment scripts
└── tools/                         # Development utilities
    ├── database/                  # Database tools
    └── test-scripts/              # Testing utilities
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (local development)
- AWS CLI (for deployment)

### Local Development

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd endowment-commercial
   ```

2. **Start the backend:**
   ```bash
   cd apps/server
   npm install
   cp .env.example .env
   # Configure your .env file
   npx prisma db push
   npm start
   ```

3. **Start the frontend:**
   ```bash
   cd apps/client
   npm install
   npm run dev
   ```

### Production Deployment

**Backend (Railway):**
```bash
cd apps/server
./deploy.sh
```

**Frontend (S3 + CloudFront):**
```bash
# From project root
./infrastructure/scripts/deploy-production.sh
```

## 🏛️ Architecture

- **Frontend:** Vue 3, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL (Railway production, local development)
- **Authentication:** JWT with multi-tenant organization structure
- **Payments:** Stripe integration with webhooks
- **Hosting:** Railway (API) + S3/CloudFront (Frontend)
- **Domain:** Custom HTTPS via AWS Certificate Manager

## 📊 Core Features

- **Monte Carlo Simulation Engine** - High-performance financial modeling
- **Multi-Tenant Architecture** - Organization-based data isolation
- **Subscription Management** - Stripe-powered billing system
- **Risk Assessment** - Stress testing and scenario analysis
- **Portfolio Management** - Asset allocation and rebalancing
- **Results Export** - PDF generation and data export

## 🔐 Security

- JWT-based authentication
- Row-level security with organization isolation
- CORS protection
- Rate limiting
- Input validation and sanitization

## 📚 Documentation

- [API Documentation](./docs/api/)
- [Architecture Overview](./docs/architecture/)
- [Deployment Guide](./docs/deployment/)
- [Setup Instructions](./docs/setup/)

## 🛠️ Development

### Testing API
```bash
node tools/test-scripts/test-api.js
```

### Database Management
```bash
node tools/database/clear-test-data.js
```

### Frontend Development
```bash
cd apps/client
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview build
```

### Backend Development
```bash
cd apps/server
npm run start      # Production mode
npm run dev        # Development mode (if configured)
```

## 🌐 Live URLs

- **Production:** https://endowcast.com
- **API:** https://endowment-commerical-production.up.railway.app

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

This is a private project. For development team members, please follow the established patterns and ensure all tests pass before committing.

---

**Rollback Information:** 
If issues arise after refactoring, restore the previous working version with:
```bash
git reset --hard 31b7dca
```
