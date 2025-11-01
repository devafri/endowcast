# Vue Component Update Guide - Backend Simulation Migration

## Overview

This guide helps you update Vue components to work with the backend simulation API. The good news: **most components need NO changes** because the store handles the API call and response mapping.

---

## 📊 Component Categories

### Category A: Display Components (0 Changes Needed ✅)
These components only display results from the store. They work automatically once the store is updated.

**Examples:**
- `SimulationResults.vue`
- `EndowmentValueChart.vue`
- `StatisticalSummary.vue`
- `TailRisk.vue`
- `KeyMetrics.vue`
- All other results/charts/sections components

**Action:** ✅ No changes needed - they already work!

---

### Category B: Input Components (0 Changes Needed ✅)
These components capture user inputs but don't execute simulations. They feed data to the store.

**Examples:**
- `PortfolioWeights.vue`
- `InputCard.vue`
- `GrantTargets.vue`
- `CorrelationMatrix.vue`
- `AllocationView.vue`

**Action:** ✅ No changes needed - inputs flow to store as-is!

---

### Category C: Execution Components (Status ✅ Already Updated)
Components that trigger simulation execution. The store is already updated to call the backend.

**Main Component:**
- `ResultsView.vue` - Has the "Execute Simulation" button

**Action:** ✅ Already working! Calls `sim.runSimulation()` which now uses backend API

---

### Category D: Utility Imports (Optional Cleanup)
Some components import from local Monte Carlo for asset class definitions.

**Components:**
- `CorrelationMatrix.vue` - Imports `assetClasses` from `monteCarlo`
- `PolicyRangeAndWeights.vue` - Imports `assetClasses` from `monteCarlo`

**Action:** ⚠️ Optional - Can keep imports for reference, or create separate constants file

---

## 🎯 What You Need to Do

### Step 1: Verify Store is Working ✅
The store has been updated. Verify it compiles:

```bash
cd apps/client
npm run build
# Should complete without errors
```

### Step 2: Verify Components Display Results
Test that simulation results display correctly:

1. Start backend: `cd apps/server && npm run dev`
2. Start frontend: `cd apps/client && npm run dev`
3. Navigate to simulation page
4. Click "Execute Simulation"
5. **Expected:** Results display in all components
6. **If fails:** Check console for errors

### Step 3: Clean Up Optional Imports (Optional)
If you want to remove dependencies on local Monte Carlo files:

**Option A: Keep As-Is (Recommended for now)**
- No changes needed
- Components still work

**Option B: Create Constants File**
Create `/apps/client/src/features/simulation/constants/assets.ts`:

```typescript
export const assetClasses = [
  { id: 'publicEquity', label: 'Public Equity', default: 50 },
  { id: 'privateEquity', label: 'Private Equity', default: 15 },
  { id: 'publicFixedIncome', label: 'Public Fixed Income', default: 18 },
  { id: 'privateCredit', label: 'Private Credit', default: 4 },
  { id: 'realAssets', label: 'Real Assets', default: 6 },
  { id: 'diversifying', label: 'Diversifying Strategies', default: 7 },
  { id: 'cashShortTerm', label: 'Cash/Short-Term', default: 0 },
];
```

Then update imports in:
- `CorrelationMatrix.vue`
- `PolicyRangeAndWeights.vue`

---

## 🔍 Component-by-Component Breakdown

### ✅ NO CHANGES NEEDED (48 components)

#### Views (4 files)
- `AllocationView.vue` ✅ Input component only
- `HistoryView.vue` ✅ Display only
- `ResultsView.vue` ✅ Already calls `sim.runSimulation()` (now uses backend)
- `ScenarioComparison.vue` ✅ Display only

#### Input Components (4 files)
- `PortfolioWeights.vue` ✅ Input only
- `GrantTargets.vue` ✅ Input only
- `InputCard.vue` ✅ Input only
- `CorrelationMatrix.vue` ⚠️ Can clean up import if desired

#### Results Layouts (1 file)
- `SimulationResults.vue` ✅ Display orchestrator

#### Charts (2 files)
- `SpendingPolicyAmount.vue` ✅ Display only
- `EndowmentValueChart.vue` ✅ Display only

#### Result Sections (15+ files)
- `MissionSustainability.vue` ✅
- `StatisticalSummary.vue` ✅
- `InsightsRecommendations.vue` ✅
- `EndowmentValueProjection.vue` ✅
- `SimulationInputs.vue` ✅
- `RiskPolicyCompliance.vue` ✅
- `TailRisk.vue` ✅
- `KeyMetrics.vue` ✅
- `MethodologyNotes.vue` ✅
- And all others... ✅

#### Tables (5+ files)
- `SimulationDataByPercentile.vue` ✅
- `ExecutiveSummary.vue` ✅
- And all others... ✅

**Total: 48 components need NO changes** ✅

---

## 🧪 How to Test Components

### Quick Component Test (5 minutes)

```bash
# 1. Start backend
cd apps/server && npm run dev

# 2. In another terminal, start frontend
cd apps/client && npm run dev

# 3. In browser, navigate to simulation
# 4. Click "Execute Simulation" button
# 5. Watch results appear in:
#    - Charts section ✓
#    - Summary statistics ✓
#    - Tables ✓
#    - All displayed metrics ✓
```

### Detailed Component Testing

#### Test Input Components
1. Navigate to AllocationView
2. Change portfolio weights
3. Verify values update in store
4. **Expected:** No console errors

#### Test Results Components
1. Execute a simulation (creates results)
2. Inspect each result component:
   - Summary cards render
   - Charts display
   - Tables show data
   - Year labels show correctly
3. **Expected:** All display correctly

#### Test Error Handling
1. Stop backend server
2. Try to execute simulation
3. **Expected:** Error message displays

---

## 📝 What Results Should Display

After backend simulation completes, components should show:

### Summary Statistics
```javascript
results.summary = {
  medianFinalValue: 78900000,
  probabilityOfLoss: 0.077,
  finalValues: {
    median, percentile10, percentile25, percentile75, percentile90
  },
  successMetrics: {
    probability: "92.30%",
    count: 923,
    total: 1000,
    byYear: ["100.00%", "99.50%", ...]
  }
}
```

### Metadata
```javascript
results.metadata = {
  simulationCount: 1000,
  yearsProjected: 30,
  initialPortfolioValue: 50000000,
  equityAllocationPercent: "60.0",
  bondAllocationPercent: "40.0",
  annualSpendingRate: "5.00"
}
```

### Year Labels
```javascript
results.yearLabels = ["2024", "2025", "2026", ..., "2054"]
```

---

## 🚨 If Components Don't Display Results

### Troubleshooting Flowchart

**Step 1: Check Backend**
```bash
# Is backend running?
curl http://localhost:3001/api/simulations/execute
# Should get 401 (auth required) not 404 (endpoint not found)
```

**Step 2: Check Network**
```
DevTools → Network tab → Execute Simulation
→ Look for POST /api/simulations/execute
→ Check Status (should be 200)
→ Check Response (should have summary data)
```

**Step 3: Check Console**
```javascript
// In browser console:
import { useSimulationStore } from '@/features/simulation/stores/simulation'
const store = useSimulationStore()
console.log('Results:', store.results)
console.log('Error:', store.errorMsg)
console.log('Loading:', store.isLoading)
```

**Step 4: Check Store**
- If `errorMsg` is set → Display error message
- If `isLoading` is true → Wait for completion
- If `results` is null → No execution yet

---

## ✅ Verification Checklist

- [ ] Backend server running
- [ ] Frontend server running
- [ ] Can execute simulation (button clickable)
- [ ] Results appear in 2-5 seconds
- [ ] No console errors
- [ ] Summary statistics display
- [ ] Charts render
- [ ] All components show data
- [ ] Response time acceptable

---

## 📋 Component Status Summary

| Category | Status | Action |
|----------|--------|--------|
| Display Components (40+) | ✅ Ready | No changes needed |
| Input Components (4) | ✅ Ready | No changes needed |
| Execution (ResultsView) | ✅ Ready | Already updated |
| Optional Imports (2) | ⚠️ Optional | Can clean up if desired |

---

## 🎯 Next Steps

### Now
1. ✅ Verify store compiles
2. ✅ Start backend and frontend
3. ✅ Execute a simulation
4. ✅ Verify results display

### If All Working
1. Run full test suite from `IMPLEMENTATION_CHECKLIST.md`
2. Deploy to production

### If Issues
1. Check troubleshooting section
2. Review backend logs
3. Check DevTools Network tab
4. Inspect store state in console

---

## 📚 Related Documentation

- **Store Details:** `/apps/client/src/features/simulation/stores/simulation.ts`
- **API Service:** `/apps/client/src/shared/services/api.ts`
- **Backend API:** `/apps/server/src/features/simulations/README.md`
- **Migration Guide:** `FRONTEND_BACKEND_MIGRATION.md`
- **Testing Checklist:** `IMPLEMENTATION_CHECKLIST.md`

---

## 💡 Key Takeaway

**Good news:** 48 Vue components need NO changes! ✅

The store handles all the heavy lifting:
- API call to backend
- Response mapping
- State management
- Error handling

Components just:
- Display `store.results`
- Show `store.isLoading` spinner
- Display `store.errorMsg`

**That's it!** 🚀

