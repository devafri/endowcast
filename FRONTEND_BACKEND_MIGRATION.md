# Frontend-Backend Simulation Migration Guide

## Overview
This document outlines the migration from client-side Monte Carlo simulation execution to backend API-based execution.

**Key Changes:**
- Frontend no longer runs simulations locally via Web Worker
- All simulations executed on backend: `POST /api/simulations/execute`
- Response format adapted to work with existing frontend components
- Automatic result persistence via backend
- Improved performance for end users (faster UI response)

---

## Architecture Changes

### Before (Client-Side Execution)
```
User Input (AllocationView)
    ↓
Store: runSimulation() 
    ↓
Create DB record (createSimulation)
    ↓
Web Worker spawns (simWorker.ts)
    ↓
Local Monte Carlo (engine.ts)
    ↓
Calculate summary metrics in store
    ↓
Save results to DB (saveSimulationResults)
    ↓
Display in components
```

### After (Backend Execution)
```
User Input (AllocationView)
    ↓
Store: runSimulation()
    ↓
POST /api/simulations/execute (with JWT auth)
    ↓
Backend: Validate input → Run Monte Carlo → Save to DB
    ↓
Return results to frontend
    ↓
Map backend response to frontend format
    ↓
Display in components
```

---

## Changes Required

### 1. API Service (`apps/client/src/shared/services/api.ts`)

**Add this new method:**
```typescript
async executeSimulation(simulationParams: any) {
  return this.request('/simulations/execute', {
    method: 'POST',
    body: JSON.stringify(simulationParams),
  });
}
```

**Status:** Need to add method (currently API service only has CRUD operations)

---

### 2. Simulation Store (`apps/client/src/features/simulation/stores/simulation.ts`)

**Changes to `runSimulation()` function:**

**REMOVE:**
- Web Worker instantiation (`new Worker(...)`)
- Local `monteCarlo.runSimulation()` call
- Manual metric calculations (Sharpe, Sortino, max drawdown, etc.)
- `simulations` array processing (already handled by backend)
- `portfolioReturns` array processing

**REPLACE WITH:**
- Single `executeSimulation()` API call
- Response mapping function to adapt backend output to frontend format
- Keep all state management and error handling

**Parameter Mapping:**

Frontend store inputs → Backend request body:

| Frontend | Backend | Type | Notes |
|----------|---------|------|-------|
| `inputs.initialEndowment` | `initialValue` | float | Portfolio starting value |
| `inputs.spendingPolicyRate / 100` | `spendingRate` | float (0-1) | Annual spending as % of portfolio |
| `inputs.riskFreeRate / 100` | *(used for metrics)* | float (0-1) | For Sharpe/Sortino ratios |
| `options.years` | `years` | int (1-100) | Projection period |
| `options.startYear` | `startYear` | int | Base year for labels |
| Portfolio weights | `equityAllocation`, `bondAllocation` | float (0-1) | Sum of individual weights |
| Asset returns/vols | `equityReturn`, `bondReturn`, etc. | float | Expected annual returns |
| `options.stress.equityShocks` | `equityShock` | JSON or float | Market stress scenarios |
| `options.stress.cpiShifts` | `cpiShift` | JSON or float | Inflation adjustments |

**Backend Response Format:**
```json
{
  "id": "sim_1234567890_abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "computeTimeMs": 245,
  "metadata": {
    "simulationCount": 1000,
    "yearsProjected": 30,
    "initialPortfolioValue": 50000000,
    "equityAllocationPercent": "60.0",
    "bondAllocationPercent": "40.0",
    "annualSpendingRate": "5.00"
  },
  "summary": {
    "finalValues": {
      "median": 78900000,
      "percentile10": 45000000,
      "percentile25": 61000000,
      "percentile75": 102000000,
      "percentile90": 135000000,
      "average": 85000000,
      "stdDev": 35000000,
      "min": 1200000,
      "max": 250000000
    },
    "success": {
      "probability": "92.30%",
      "count": 923,
      "total": 1000,
      "byYear": ["100.00%", "99.50%", "98.20%", ...]
    }
  },
  "paths": null,  // Only if numSimulations <= 500
  "pathsAvailable": false
}
```

**Response Mapping Function:**

The frontend components expect a specific format with `simulations` and `portfolioReturns` arrays. Need to create an adapter that transforms the backend response to this format:

```typescript
function mapBackendToFrontendResults(backendResponse: any, originalInputs: any) {
  // Transform backend summary to frontend format
  const medianFinal = backendResponse.summary.finalValues.median;
  const initial = originalInputs.initialEndowment;
  const lossProb = (backendResponse.summary.success.count < backendResponse.summary.success.total) 
    ? (backendResponse.summary.success.total - backendResponse.summary.success.count) / backendResponse.summary.success.total
    : 0;
  
  // Generate synthetic arrays for backward compatibility (or leave empty if not needed)
  // Charts likely use these arrays for rendering
  
  return {
    // Backend data
    ...backendResponse,
    
    // Frontend-expected fields
    summary: {
      medianFinalValue: medianFinal,
      probabilityOfLoss: lossProb,
      // ... additional fields from backendResponse.summary
    }
  };
}
```

**Files to Remove/Deprecate:**
- `/apps/client/src/features/simulation/lib/simWorker.ts` - No longer needed
- `/apps/client/src/features/simulation/lib/monteCarlo.ts` - Frontend doesn't run this anymore
- `/apps/client/src/features/simulation/lib/engine.ts` - Local execution no longer used

**Note:** These files can stay in the repo for reference but won't be imported.

---

### 3. Result Display Components

**No changes required** to display components like:
- `SimulationResults.vue`
- `ResultsView.vue`
- `StatisticalSummary.vue`
- `EndowmentValueChart.vue`
- etc.

These components consume `results` from the store and will work once the store provides the correctly-formatted response.

---

## Migration Steps

### Step 1: Add Method to API Service
1. Open `/apps/client/src/shared/services/api.ts`
2. Add `executeSimulation()` method (see above)

### Step 2: Update Simulation Store
1. Open `/apps/client/src/features/simulation/stores/simulation.ts`
2. Create response mapping function
3. Replace Web Worker call with API call
4. Update `runSimulation()` to use backend

### Step 3: Test
1. Run frontend: `npm run dev`
2. Run backend: `npm run dev` (in server folder)
3. Execute a simulation
4. Verify results display correctly

### Step 4: Deploy
- Update server with new simulation endpoint (already done)
- Deploy frontend changes
- Monitor for any missing response fields

---

## Response Format Details

### Backward Compatibility Notes

**Fields frontend expects:**
- `results.simulations` - Array of simulation paths (optional for display)
- `results.portfolioReturns` - Array of return series (optional for charts)
- `results.spendingPolicy` - Array of spending amounts (optional)
- `results.summary` - Object with metric calculations

**Backend provides:**
- `summary.finalValues` - Percentiles and statistics (✓ available)
- `summary.success.byYear` - Year-by-year success rates (✓ available)
- `paths` - Actual simulation paths (✓ available if ≤500 simulations)

**What's missing:**
- `portfolioReturns` - Individual simulation returns (need to generate or calculate frontend-side)
- `spendingPolicy` - Per-year spending for each path (need to generate or calculate frontend-side)

**Solution:**
If display components need these arrays, either:
1. Backend generates them (adds bandwidth/compute)
2. Frontend generates synthetic/approximations from percentiles
3. Frontend leaves arrays empty and components show percentile-based views instead

---

## Environment Variables Required

Frontend needs:
- `VITE_API_URL` - Backend API endpoint (default: `http://localhost:3001/api`)
- JWT token from login/register (handled by auth store)

Backend needs:
- `DATABASE_POSTGRES_PRISMA_URL` - PostgreSQL connection
- `JWT_SECRET` - For token validation
- `NODE_ENV=development`
- `PORT=3001`

---

## Performance Expectations

**Local Execution (Before):**
- Execution time: Instant (same machine)
- UI blocking: ~500ms for 1000 simulations
- Memory: Uses browser memory (limited)
- Result availability: Immediate

**Backend Execution (After):**
- Execution time: 200-500ms (network + server compute)
- UI blocking: None (async API call)
- Memory: Server resources
- Result availability: After network round-trip

**User Experience Improvement:**
- UI stays responsive (no blocking)
- Loading spinner visible during execution
- Results available after ~300-500ms
- Can run more simulations (no browser limits)

---

## Troubleshooting

### Simulation fails with 401 error
- JWT token not being sent with request
- Check `apiService.setToken()` was called during login
- Verify `Authorization: Bearer <token>` in request headers

### "Validation failed" error from backend
- Request body parameter names don't match backend schema
- Review parameter mapping table above
- Check console for validation details

### Results don't display
- Response format doesn't match frontend component expectations
- Verify response mapping function is correct
- Check `results` value in store after API response

### Network error during simulation
- Backend server not running on expected port
- Check `VITE_API_URL` environment variable
- Verify CORS headers if on different domain

---

## Rollback Plan

If backend execution fails:
1. Revert store to use Web Worker
2. Keep local Monte Carlo files
3. Can toggle between backends via environment variable:

```typescript
const useBackendSimulation = import.meta.env.VITE_USE_BACKEND_SIM !== 'false';

if (useBackendSimulation) {
  // Call backend
} else {
  // Use local Web Worker
}
```

---

## Files Modified

- ✅ `/apps/server/src/features/simulations/routes/simulations.js` - Backend endpoint ready
- ✅ `/apps/server/src/features/simulations/utils/monteCarlo.js` - Engine ready
- 🔄 `/apps/client/src/shared/services/api.ts` - Need to add executeSimulation()
- 🔄 `/apps/client/src/features/simulation/stores/simulation.ts` - Need to update runSimulation()
- ⏳ `/apps/client/src/features/simulation/lib/simWorker.ts` - Deprecate (remove imports)
- ⏳ `/apps/client/src/features/simulation/lib/monteCarlo.ts` - Deprecate (remove imports)

---

## Next Steps

1. ✅ Backend endpoint implemented and tested
2. ⏳ **Frontend API service method** - Add executeSimulation()
3. ⏳ **Store refactoring** - Update runSimulation() to use backend
4. ⏳ **End-to-end testing** - Run full flow
5. ⏳ **Deployment** - Roll out to production

---

## Contact / Questions

If you encounter issues during migration:
- Check backend logs: `npm run dev` in `/apps/server`
- Check frontend console: Browser DevTools
- Verify environment variables are loaded
- Ensure database is accessible and Prisma schema is pushed
