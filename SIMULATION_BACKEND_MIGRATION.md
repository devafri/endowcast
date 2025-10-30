# Simulation & Analytics Backend Migration Plan

## Executive Summary
Move Monte Carlo simulations and all analytics computations from browser to backend Node.js service. Frontend receives only pre-computed metrics (no raw simulation arrays). Benefits:
- **Eliminates memory issues** - no more 5000×11 arrays in browser
- **Better performance** - parallel processing on server, instant rendering on client
- **Scalability** - backend can handle larger simulations (10k+ paths)
- **Security** - proprietary algorithm on server, not exposed in browser
- **Consistency** - all users get identical calculations

---

## Current Architecture

### Frontend (Browser)
```
User Input (Allocation, Spending) 
  ↓
Vue Store (Pinia) 
  ↓
Web Worker (simWorker.ts)
  ├─ Monte Carlo Engine (5000 simulations)
  ├─ Portfolio Returns Calculation
  └─ Returns full arrays: simulations[][], portfolioReturns[][]
  ↓
Analytics Calculations (lib/analytics.ts)
  ├─ Percentiles
  ├─ Sharpe Ratio
  ├─ Max Drawdown
  ├─ CVaR
  └─ Returns metrics object
  ↓
Results Store + Component Rendering
  ├─ Charts (EndowmentValueChart, SpendingPolicyAmount)
  ├─ Tables (SimulationDataByPercentile)
  └─ Metrics Display (KeyMetrics, TailRisk)
```

### Current Data Flow
1. Frontend collects user inputs (allocation, spending rate, years)
2. Sends to web worker
3. Web worker runs 5000 simulations
4. Returns full arrays (simulations: 5000×11, portfolioReturns: 5000×252)
5. Frontend computes all metrics from arrays
6. UI renders from arrays + metrics

**Problem:** Arrays stored in memory → memory pressure → crashes on mobile

---

## Target Architecture

### Backend (Node.js/Express)
```
User Input
  ↓
API Endpoint: POST /api/simulations/run
  ├─ Receives: allocation, spending, years, userId, organizationId
  ├─ Validates input + subscription limits
  ├─ Runs simulation engine (Node.js process, not browser)
  ├─ Computes all metrics
  ├─ Stores metrics in database
  └─ Returns: { id, metrics, yearLabels, summary }

Database (PostgreSQL)
  ├─ simulations (metadata + metrics summary)
  ├─ simulation_percentiles (cached percentile data for charts)
  ├─ simulation_metrics (risk metrics, ratios)
  └─ simulation_results (representative paths only, not full arrays)
```

### Frontend Data Flow
```
User Input
  ↓
Call backend: POST /api/simulations/run
  ↓
Backend returns:
  {
    id: "sim_123",
    summary: { medianFinal, sharpe, sortino, cvar95, ... },
    percentiles: { 5: [], 10: [], ..., 95: [] },  // For charts
    yearLabels: ["2025", "2026", ...],
    representative: { medoidPath, nearestMedianPath, pointwiseMedian }
  }
  ↓
Store in Pinia (no raw arrays)
  ↓
Charts render from percentiles
  ├─ EndowmentValueChart: p5, p10, p25, p50, p75, p90, p95
  ├─ SpendingPolicyAmount: percentiles of spending
  └─ TailRisk: pre-computed metrics
```

---

## Phase 1: Database Schema Expansion

### Current Schema Issues
- `Simulation.results` stores full arrays as JSON (bloated)
- No structured storage for metrics
- Percentile data recalculated every time user views results

### New Tables

```sql
-- Extend simulations table
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'running'; -- running, completed, failed
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS computedAt TIMESTAMP;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS metricsVersion INT DEFAULT 1;

-- New: Metrics Summary (one per simulation)
CREATE TABLE IF NOT EXISTS simulation_metrics (
  id SERIAL PRIMARY KEY,
  simulationId UUID UNIQUE NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  
  -- Core Summary
  medianFinalValue DECIMAL(20, 2),
  probabilityOfLoss DECIMAL(5, 4),
  medianAnnualizedReturn DECIMAL(8, 4),
  annualizedVolatility DECIMAL(8, 4),
  
  -- Risk Metrics
  medianMaxDrawdown DECIMAL(8, 4),
  sharpeRatio DECIMAL(8, 4),
  sortinoRatio DECIMAL(8, 4),
  cvar95 DECIMAL(20, 2),
  
  -- Tail Risk
  worst1Pct DECIMAL(20, 2),
  worst5Pct DECIMAL(20, 2),
  worst10Pct DECIMAL(20, 2),
  
  -- Preservation
  inflationAdjustedPreservation DECIMAL(8, 4),
  
  -- Loss Thresholds (JSON array)
  lossThresholds JSON,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- New: Percentile Data (cached for chart rendering)
CREATE TABLE IF NOT EXISTS simulation_percentiles (
  id SERIAL PRIMARY KEY,
  simulationId UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  
  percentile INT, -- 5, 10, 25, 50, 75, 90, 95
  yearIndex INT,
  value DECIMAL(20, 2),
  
  UNIQUE(simulationId, percentile, yearIndex)
);

-- New: Representative Paths (small samples for best/median case visualization)
CREATE TABLE IF NOT EXISTS simulation_representative_paths (
  id SERIAL PRIMARY KEY,
  simulationId UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  
  pathType VARCHAR(50), -- 'medoid', 'nearestMedian', 'pointwiseMedian'
  pathData JSON, -- Array of values for each year
  
  UNIQUE(simulationId, pathType)
);
```

---

## Phase 2: Backend Service Implementation

### New API Endpoints

#### `POST /api/simulations/run`
**Purpose:** Execute simulation and return metrics

**Request:**
```json
{
  "inputs": {
    "initialEndowment": 50000000,
    "spendingPolicyRate": 5,
    "investmentExpenseRate": 1,
    "riskFreeRate": 2,
    "portfolioWeights": { "equity": 60, "bonds": 30, "alts": 10 },
    "initialOperatingExpense": 100000,
    "initialGrant": 1000000,
    "grantTargets": [1000000, 1050000, 1102500, ...]
  },
  "options": {
    "years": 10,
    "startYear": 2025,
    "stress": {
      "equityShocks": [-0.20, -0.10],
      "cpiShifts": [0.02, -0.02]
    }
  }
}
```

**Response (202 Accepted for async):**
```json
{
  "id": "sim_abc123",
  "status": "queued",
  "estimatedTime": 5000,  // ms
  "pollUrl": "/api/simulations/sim_abc123/status"
}
```

**Response (200 OK for immediate):**
```json
{
  "id": "sim_abc123",
  "status": "completed",
  "summary": {
    "medianFinalValue": 62453000,
    "probabilityOfLoss": 0.0245,
    "medianAnnualizedReturn": 0.0721,
    "annualizedVolatility": 0.1203,
    "sharpeRatio": 0.45,
    "sortinoRatio": 0.62,
    "cvar95": 41234000,
    "inflationAdjustedPreservation": 1.02,
    "worst1Pct": 38500000,
    "worst5Pct": 42000000,
    "worst10Pct": 44500000
  },
  "yearLabels": ["2025", "2026", ..., "2035"],
  "percentiles": {
    "5": [50000000, 51234000, ..., 58900000],
    "10": [50000000, 51900000, ..., 60100000],
    "25": [50000000, 52500000, ..., 61200000],
    "50": [50000000, 53200000, ..., 62453000],
    "75": [50000000, 54100000, ..., 63500000],
    "90": [50000000, 55300000, ..., 65200000],
    "95": [50000000, 56100000, ..., 66300000]
  },
  "representative": {
    "medoidPath": [50000000, 52345000, ..., 62100000],
    "nearestMedianPath": [50000000, 53100000, ..., 62400000],
    "pointwiseMedian": [50000000, 53200000, ..., 62453000]
  },
  "lossThresholds": [
    { "label": "5%+ Loss", "probability": 0.0123, "count": 62 },
    { "label": "10%+ Loss", "probability": 0.0098, "count": 49 },
    ...
  ]
}
```

#### `GET /api/simulations/:id`
**Purpose:** Retrieve stored simulation results

**Response:**
```json
{
  "id": "sim_abc123",
  "createdAt": "2025-10-29T14:30:00Z",
  "inputs": { /* original inputs */ },
  "options": { /* original options */ },
  "summary": { /* metrics summary */ },
  "percentiles": { /* cached percentiles */ },
  "representative": { /* representative paths */ },
  "yearLabels": [...]
}
```

#### `GET /api/simulations/:id/percentiles`
**Purpose:** Get high-resolution percentile data (optional, for export)

**Query params:** `?percentiles=5,25,50,75,95&resolution=monthly`

---

## Phase 3: Frontend API Integration

### New API Service Layer
```typescript
// apps/client/src/features/simulation/services/simulationApiService.ts

class SimulationApiService {
  async runSimulation(inputs, options, organizationId) {
    // POST /api/simulations/run
    // Poll if async, return results
    // Store in database via backend
  }

  async getSimulation(simulationId) {
    // GET /api/simulations/:id
  }

  async listSimulations(organizationId, filters?) {
    // GET /api/simulations?org=:id&limit=50
  }

  async deleteSimulation(simulationId) {
    // DELETE /api/simulations/:id
  }
}
```

### Pinia Store Update
```typescript
// Remove simulations, portfolioReturns arrays
// Keep only:
interface SimulationResult {
  id: string;
  summary: MetricsSummary;
  yearLabels: string[];
  percentiles: Record<number, number[]>;  // 5, 10, 25, 50, 75, 90, 95
  representative: RepresentativePaths;
  lossThresholds: LossThreshold[];
  createdAt: Date;
}
```

---

## Phase 4: Frontend UI Refactor

### Components to Update

#### EndowmentValueChart
**Before:**
```typescript
// Reads from props.results.simulations (5000×11 array)
const percentiles = computePercentiles(sims);
```

**After:**
```typescript
// Reads from props.results.percentiles
const percentiles = {
  5: props.results.percentiles[5],
  10: props.results.percentiles[10],
  ...
};
```

#### SimulationDataByPercentile
**Before:**
```typescript
// Reads operating expenses, grants, spending policy arrays
// Computes percentiles locally
const opExSer = percentileSeries(matrix, active.value);
```

**After:**
```typescript
// Reads pre-computed percentiles from backend
// Backend handles all aggregation and filtering
const opExSer = props.results.percentiles.operatingExpenses?.[active.value] ?? [];
```

#### KeyMetrics, TailRisk
**Before:**
```typescript
// Compute metrics from simulations and returns arrays
const sharpe = calculateSharpe(portfolioReturns);
```

**After:**
```typescript
// Read from pre-computed metrics
const sharpe = props.results.summary.sharpeRatio;
```

---

## Phase 5: Implementation Steps

### Step 1: Create Backend Simulation Service
1. Copy Monte Carlo engine from `simWorker.ts` to Node.js
2. Create `apps/server/src/services/simulationService.ts`
3. Implement all analytics calculations (percentiles, Sharpe, etc.)
4. Add data validation and error handling

**Estimated:** 3-4 days

### Step 2: Create API Endpoints
1. Implement `POST /api/simulations/run`
2. Implement `GET /api/simulations/:id`
3. Add queuing for long-running simulations (Bull/Redis)
4. Add metrics caching

**Estimated:** 2-3 days

### Step 3: Update Database Schema
1. Run migrations for new tables
2. Create indexes on frequently queried columns
3. Add data retention policy (delete old simulations)

**Estimated:** 1 day

### Step 4: Update Frontend
1. Create API service layer
2. Update Pinia store
3. Refactor all chart/table components
4. Remove web worker and analytics library
5. Add loading states and error handling

**Estimated:** 4-5 days

### Step 5: Testing & Validation
1. Unit tests for backend simulation engine
2. E2E tests comparing old vs new metrics
3. Performance testing (throughput, latency)
4. Load testing with multiple concurrent simulations

**Estimated:** 2-3 days

### Step 6: Deployment
1. Deploy backend changes first
2. Run migrations
3. Deploy frontend changes
4. Monitor production metrics
5. Rollback plan if issues

**Estimated:** 1 day

---

## Benefits & Impact

### Memory Improvements
- **Before:** 5000 simulations × 11 years × 8 bytes = 440 KB per simulation array
  - Plus 5000 × 252 returns × 8 bytes = 10 MB per simulation
  - Total ~10.5 MB per user session
- **After:** Only ~50 KB metrics + 7 KB percentiles = 57 KB per simulation
- **Reduction:** 99.5% memory savings

### Performance
- **Simulation speed:** Slightly slower (network roundtrip ~100ms)
- **Rendering speed:** Much faster (no 5000-item arrays to process)
- **Chart rendering:** Instant (percentiles pre-computed)

### Scalability
- Can support 10,000+ simulations per backend instance
- Horizontal scaling with load balancer
- Database caching reduces recomputation

---

## Migration Timeline

| Phase | Task | Timeline | Owner |
|-------|------|----------|-------|
| 1 | Database Schema | Week 1 (1 day) | Backend |
| 2 | Backend Simulation Service | Week 1-2 (3-4 days) | Backend |
| 3 | API Endpoints | Week 2 (2-3 days) | Backend |
| 4 | Frontend API Layer | Week 2-3 (3-4 days) | Frontend |
| 5 | UI Refactor | Week 3 (3-4 days) | Frontend |
| 6 | Testing | Week 3-4 (2-3 days) | QA |
| 7 | Deployment & Monitoring | Week 4 (1 day) | DevOps |

**Total Estimate:** 3-4 weeks

---

## Rollback Plan

If issues found in production:
1. Keep old web worker code in frontend (commented out)
2. Add feature flag to enable backend/frontend mode
3. Route 10% of traffic to backend initially
4. Monitor for discrepancies in metrics
5. Full rollback if major issues found

---

## Success Criteria

✅ All metrics match between old and new calculation (within 0.01% tolerance)
✅ No "out of memory" errors on mobile devices
✅ Chart rendering faster than before (<100ms)
✅ Backend handles 100 concurrent simulations
✅ Zero data loss during migration
✅ Zero breaking changes to API

