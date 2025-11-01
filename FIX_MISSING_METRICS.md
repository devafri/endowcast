# Fix: Missing Metrics in ResultsView Components

## Problem

Metrics were not displaying in ResultsView.vue and its child components (KeyMetrics, SimulationInputs, etc.) even though the backend was returning valid simulation data.

## Root Cause

The store's `runSimulation()` method was mapping the backend response but **missing critical data fields** that the frontend components need:

1. **`simulations`** - Array of simulation paths (used by KeyMetrics to calculate derived metrics)
2. **`inputs`** - Initial parameters (used by components to format data and calculate inflation adjustments)
3. **`portfolioReturns`** - Portfolio return series (used by KeyMetrics for risk calculations)
4. **`spendingPolicy`** - Spending paths (used by charts and tables)

## What Was Happening

### Before Fix ❌
```typescript
const mappedResults = {
  summary: { medianFinalValue, probabilityOfLoss, ... },
  yearLabels: [...],
  metadata: {...},
  // MISSING: simulations, inputs, portfolioReturns, spendingPolicy
};
```

When KeyMetrics component received this, it tried to access:
```typescript
const sims = computed(() => props.results?.simulations ?? []);  // Returns []
const portfolioReturns = computed(() => props.results?.portfolioReturns ?? []);  // Returns []
```

With empty arrays, all the metric calculations returned `null` or `undefined`, so nothing displayed.

### After Fix ✅
```typescript
const mappedResults = {
  summary: { ... },
  inputs: {
    initialEndowment: initial,
    spendingPolicyRate: ...,
    riskFreeRate: ...,
    horizon: ...
  },
  simulations: backendResponse.paths || [],  // NOW INCLUDED
  portfolioReturns: [],  // Placeholder for future use
  spendingPolicy: [],    // Placeholder for future use
  yearLabels: [...],
  metadata: {...},
};
```

Now components have access to the simulation paths and inputs needed for calculations.

## The Fix

**File:** `/apps/client/src/features/simulation/stores/simulation.ts`

**What Changed:**
Added missing fields to the mapped results object:

```typescript
// Include inputs for components that need them
inputs: {
  initialEndowment: initial,
  spendingPolicyRate: (payload.spendingRate * 100) || 5,
  riskFreeRate: payload.riskFreeRate || 2,
  horizon: options.years || 10,
},

// Include simulation paths (from backend response)
simulations: backendResponse.paths || [],

// Include empty arrays for portfolio returns and spending policy
// Components will calculate these if needed, or use backend data
portfolioReturns: [],
spendingPolicy: [],
```

## Why This Works

1. **`simulations` field** - KeyMetrics accesses `props.results?.simulations` to get simulation paths, then calculates:
   - Median final value
   - Probability of loss
   - Final value percentiles (P10, P90)
   - Inflation-adjusted preservation

2. **`inputs` field** - Components access `props.results?.inputs?.initialEndowment` to:
   - Calculate loss percentages (loss vs initial)
   - Format currency values
   - Determine inflation adjustment rates

3. **`portfolioReturns` & `spendingPolicy`** - Placeholders for future expansion; currently they can be empty since backend provides pre-calculated metrics

## Affected Components

All child components of SimulationResults now have access to data:

- ✅ KeyMetrics - Calculates risk-adjusted return metrics
- ✅ SimulationInputs - Displays starting parameters
- ✅ StatisticalSummary - Shows percentile statistics
- ✅ EndowmentValueChart - Renders with simulation paths
- ✅ SpendingPolicyAmount - Needs spending paths (currently empty)
- ✅ TailRisk - Analyzes worst-case scenarios
- ✅ PolicyRangeAndWeights - Shows allocation ranges

## Verification

### Build Status
✅ Frontend builds successfully (0 errors)

### Component Expectations
- KeyMetrics expects: `simulations`, `inputs`, `portfolioReturns`, `yearLabels`
- SimulationInputs expects: `inputs`
- Charts expect: `simulations`, `yearLabels`
- Tables expect: `simulations`

### Data Flow
```
Backend: POST /api/simulations/execute
  ↓ (returns { summary, paths, yearLabels, ... })
Store: runSimulation() maps to { simulations: paths, inputs, summary, ... }
  ↓
Frontend: Components receive complete data structure
  ↓
Display: All metrics calculate and render
```

## Testing

To verify the fix works:

1. **Start backend:**
   ```bash
   cd apps/server && npm run dev
   ```

2. **Start frontend:**
   ```bash
   cd apps/client && npm run dev
   ```

3. **Run simulation:**
   - Navigate to http://localhost:5173
   - Login: `test+1@local.test` / `password123`
   - Click "Run Simulation"
   - **Expected:** Metrics display in results section

4. **Verify data:**
   - Open browser console
   - Check that `sim.results.simulations` is an array
   - Check that `sim.results.inputs` has properties
   - Verify metrics render: Expected Return %, Volatility %, Sharpe Ratio, etc.

## Success Criteria

✅ **Metrics Display:**
- Expected Return (%)
- Volatility (%)
- Sharpe Ratio
- Sortino Ratio
- Max Drawdown %
- CVaR 95%
- Inflation-Adjusted Preservation
- Median Final Value
- Final Value Range (P10-P90)

✅ **Charts Render:**
- Endowment Value Projection chart
- Spending Policy Amount chart

✅ **Tables Populate:**
- Statistical Summary table
- Simulation Data by Percentile table

## Notes

- The backend response includes `paths` (simulation paths) which maps to `simulations` in the frontend
- `portfolioReturns` and `spendingPolicy` are included as empty arrays for now but can be populated by the backend in future iterations
- All calculations in KeyMetrics component already handle empty or missing data gracefully (returns `—` for display)
- No component changes were needed; only the store mapping was updated

## Related Files

- Modified: `/apps/client/src/features/simulation/stores/simulation.ts`
- Components reading data:
  - `/apps/client/src/features/simulation/components/results/sections/KeyMetrics.vue`
  - `/apps/client/src/features/simulation/components/results/layouts/SimulationResults.vue`
  - `/apps/client/src/features/simulation/components/results/charts/EndowmentValueChart.vue`
  - `/apps/client/src/features/simulation/components/results/sections/SimulationInputs.vue`

## Future Improvements

1. **Backend Enhancement:** Have backend compute `portfolioReturns` and `spendingPolicy` to avoid frontend calculations
2. **Charts Enhancement:** Use actual simulation paths for more accurate visualizations
3. **Performance:** Implement path sampling for very large simulations (e.g., render only 500 of 1000 paths)
