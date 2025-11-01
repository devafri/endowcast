# Backend Simulations Feature

## Overview

This module implements a Monte Carlo simulation engine for portfolio analysis. It runs on the backend (Node.js) and provides REST endpoints for executing stochastic financial projections.

## Architecture

```
/features/simulations/
├── routes/
│   └── simulations.js                # REST endpoint handlers
├── controllers/
│   └── simulationController.js       # Business logic (legacy)
├── services/
│   └── simulationService.js          # Service layer (legacy)
├── middleware/
│   ├── auth.js                       # JWT authentication
│   └── validation.js                 # Input validation (legacy)
├── utils/
│   └── monteCarlo.js                 # Core Monte Carlo engine (pure JS)
├── models/
│   └── types.js                      # TypeScript-style type definitions
└── README.md                         # This file
```

## Endpoints

### POST /api/simulations/execute

Execute a Monte Carlo simulation immediately and get results.

**Request:**
```json
{
  "name": "My Simulation",
  "years": 30,
  "startYear": 2024,
  "initialValue": 1000000,
  "spendingRate": 0.05,
  "spendingGrowth": 0.03,
  "equityReturn": 0.08,
  "equityVolatility": 0.15,
  "bondReturn": 0.04,
  "bondVolatility": 0.06,
  "correlation": 0.2,
  "equityAllocation": 0.6,
  "bondAllocation": 0.4,
  "equityShock": 0,
  "cpiShift": 0,
  "grantTargets": [50000, 50000, ...],
  "numSimulations": 1000
}
```

**Response:**
```json
{
  "id": "sim_1729...",
  "timestamp": "2025-10-29T...",
  "computeTimeMs": 245,
  "metadata": {
    "simulationCount": 1000,
    "yearsProjected": 30,
    "initialPortfolioValue": 1000000,
    "equityAllocationPercent": "60.0",
    "bondAllocationPercent": "40.0",
    "annualSpendingRate": "5.00"
  },
  "summary": {
    "finalValues": {
      "median": 850000,
      "percentile10": 450000,
      "percentile25": 650000,
      "percentile75": 1100000,
      "percentile90": 1400000,
      "average": 900000,
      "stdDev": 350000,
      "min": 50000,
      "max": 2500000
    },
    "success": {
      "probability": "92.30%",
      "count": 923,
      "total": 1000,
      "byYear": ["99.50%", "99.20%", ..., "92.30%"]
    }
  },
  "paths": [[...], [...], ...],
  "pathsAvailable": true
}
```

### GET /api/simulations

Get user's simulation history (paginated).

### GET /api/simulations/:id

Retrieve a specific simulation result.

## Algorithm

### Monte Carlo Process

1. **Generate Correlated Returns**
   - Box-Muller transform for standard normal variates
   - Cholesky decomposition for correlation between asset classes
   - Equation: `z2 = ρ·z1 + √(1-ρ²)·z2_independent`

2. **Project Portfolio Value**
   - For each year:
     - Generate random returns for equity and bonds
     - Apply weights: `portfolioReturn = eq_alloc·eq_return + bond_alloc·bond_return`
     - Update portfolio: `value = value·(1 + portfolioReturn) - spending`
     - Track success vs spending target

3. **Aggregate Statistics**
   - Collect final values from all paths
   - Calculate percentiles, mean, std deviation
   - Compute year-by-year success rates

### Key Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| `years` | 1-100 | Projection period |
| `spendingRate` | 0-1 | Initial annual spending as % of portfolio |
| `equityReturn` | -1 to 1 | Expected annual equity return |
| `equityVolatility` | 0-2 | Equity return standard deviation |
| `correlation` | -1 to 1 | Correlation between equities and bonds |
| `numSimulations` | 100-10,000 | Number of Monte Carlo paths |
| `equityShock` | -1 to 0 | One-time market shock (e.g., -0.30 = -30%) |
| `grantTargets` | Array | Annual spending minimums |

## Performance

- **1,000 paths × 30 years**: ~200-300ms
- **5,000 paths × 30 years**: ~1-1.5s
- Linear scaling with number of simulations

## Usage Example

### cURL

```bash
curl -X POST http://localhost:3001/api/simulations/execute \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "years": 30,
    "initialValue": 1000000,
    "spendingRate": 0.05,
    "equityReturn": 0.08,
    "equityVolatility": 0.15,
    "bondReturn": 0.04,
    "bondVolatility": 0.06,
    "correlation": 0.2,
    "equityAllocation": 0.6,
    "bondAllocation": 0.4,
    "numSimulations": 1000
  }'
```

### JavaScript/Fetch

```javascript
const response = await fetch('/api/simulations/execute', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    years: 30,
    startYear: 2024,
    initialValue: 1000000,
    spendingRate: 0.05,
    spendingGrowth: 0.03,
    equityReturn: 0.08,
    equityVolatility: 0.15,
    bondReturn: 0.04,
    bondVolatility: 0.06,
    correlation: 0.2,
    equityAllocation: 0.6,
    bondAllocation: 0.4,
    numSimulations: 1000
  })
});

const result = await response.json();
console.log('Success rate:', result.summary.success.probability);
console.log('Median ending value:', result.summary.finalValues.median);
```

## Database Schema (Prisma)

The simulation is already defined in your Prisma schema (`apps/server/prisma/schema.prisma`):

```prisma
model Simulation {
  id            String   @id @default(cuid())
  name          String
  userId        String
  organizationId String
  
  years         Int
  startYear     Int
  initialValue  Float
  spendingRate  Float
  spendingGrowth Float @default(0)
  
  equityReturn      Float
  equityVolatility  Float
  bondReturn        Float
  bondVolatility    Float
  correlation       Float
  
  equityShock       Float?
  cpiShift          Float?
  grantTargets      Json?
  
  results           Json?
  summary           Json?
  isCompleted       Boolean @default(false)
  runCount          Int @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  user          User          @relation(fields: [userId], references: [id])
  organization  Organization  @relation(fields: [organizationId], references: [id])
}
```

## Testing

### Simple Test

```bash
# Start server with env vars
cd apps/server
set -a; . ./.env.dev; set +a
export JWT_SECRET="dev_secret"
npm run dev

# In another terminal, get a valid JWT token (from auth/register or auth/login)
TOKEN="<your-jwt-token>"

# Run simulation
curl -X POST http://localhost:3001/api/simulations/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "years": 10,
    "initialValue": 1000000,
    "spendingRate": 0.05,
    "equityReturn": 0.08,
    "equityVolatility": 0.15,
    "bondReturn": 0.04,
    "bondVolatility": 0.06,
    "correlation": 0.2,
    "equityAllocation": 0.6,
    "bondAllocation": 0.4,
    "numSimulations": 100
  }' | jq .
```

## Next Steps

1. **Add authentication** — Ensure `JWT_SECRET` is set in `.env.dev`
2. **Test with frontend** — Have your Vue client call `/api/simulations/execute`
3. **Tune parameters** — Adjust `numSimulations` based on UX needs (more = better accuracy, slower)
4. **Add charts** — Frontend can render paths + percentiles using Chart.js or similar
5. **Database persistence** — Simulations auto-save; retrieve via GET `/api/simulations`

## Troubleshooting

**Issue:** `Unauthorized` response
- **Solution:** Ensure JWT token is in `Authorization: Bearer <token>` header

**Issue:** Simulation times out (>30s)
- **Solution:** Reduce `numSimulations` to 500-1000 or increase `years` cap if needed

**Issue:** Results not saved to DB
- **Solution:** Check Prisma connection (won't block response but logs warning)

**Issue:** NaN in results
- **Solution:** Verify all numeric parameters are valid (no negative volatility, etc.)

## References

- Box-Muller transform: https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
- Cholesky decomposition: https://en.wikipedia.org/wiki/Cholesky_decomposition
- Monte Carlo simulation: https://en.wikipedia.org/wiki/Monte_Carlo_method
