# 🧪 Component Testing Guide - Step-by-Step

## Quick Overview

After the store update, **all 48 Vue components work automatically**. This guide helps you verify they all display results correctly.

---

## 🎯 Testing Workflow

### Phase 1: Setup (5 minutes)
- [ ] Start backend server
- [ ] Start frontend server
- [ ] Open browser to frontend

### Phase 2: Execute Simulation (2-5 minutes)
- [ ] Navigate to simulation page
- [ ] Click "Execute Simulation"
- [ ] Wait for results

### Phase 3: Verify Components Display (10 minutes)
- [ ] Check each result component
- [ ] Verify data displays
- [ ] Check for errors in console

---

## 📝 Phase 1: Setup

### Step 1.1: Start Backend Server

```bash
# Terminal 1
cd /Users/felixisuk/Desktop/Coding_Projects/endowment-commerical/apps/server
npm run dev
```

**Expected output:**
```
⚡ Server running on http://localhost:3001
Connected to database
Listening for requests...
```

**If fails:** 
- Check if port 3001 is in use: `lsof -i :3001`
- Check DATABASE_POSTGRES_PRISMA_URL is set
- Check JWT_SECRET is set
- See "Troubleshooting" section

---

### Step 1.2: Start Frontend Server

```bash
# Terminal 2 (wait for backend to start first)
cd /Users/felixisuk/Desktop/Coding_Projects/endowment-commerical/apps/client
npm run dev
```

**Expected output:**
```
  VITE v4.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**If fails:**
- Check if port 5173 is in use
- Check npm dependencies: `npm install`
- See "Troubleshooting" section

---

### Step 1.3: Open Browser

```
Open: http://localhost:5173
```

**Expected:** Frontend loads, sees login/navigation

---

## 📝 Phase 2: Execute Simulation

### Step 2.1: Login
1. Click "Login" or navigate to login page
2. Use existing credentials or create test account:
   ```
   Email: test@example.com
   Password: password123
   ```

### Step 2.2: Navigate to Simulation
1. Click on "Simulation" or simulation link
2. You should see the AllocationView or ResultsView

### Step 2.3: Execute Simulation
1. Leave inputs as default (or customize if desired)
2. Click the big blue "Execute Simulation" button
3. **Expected:** Button becomes disabled, spinner appears

### Step 2.4: Wait for Results
- **Expected time:** 2-5 seconds
- **Don't refresh the page** - it will kill the request

**While waiting, open DevTools:**
- F12 or right-click → "Inspect"
- Go to Network tab
- Look for POST request to `/api/simulations/execute`

---

## 🧪 Phase 3: Verify Components

### Step 3.1: Check Spinner Disappears
After 2-5 seconds:
- [ ] Spinner disappears
- [ ] Button is re-enabled
- [ ] Results section appears

### Step 3.2: Check Console for Errors
1. **DevTools → Console tab**
2. Look for red errors (not warnings)
3. **Should be:** No errors
4. **You should see:** Message like "Backend simulation response: {...}"

### Step 3.3: Verify Results Display

**Scroll through the results page and check each section:**

#### Section 1: Executive Summary
- [ ] Title "Executive Summary" visible
- [ ] Key numbers display (median value, loss probability, etc.)
- [ ] No "undefined" or "NaN" values
- [ ] Formatting looks good

#### Section 2: Statistical Summary
- [ ] Table header visible (Metric, Value, etc.)
- [ ] Data rows populated
- [ ] Numbers are reasonable (not 0 or infinity)
- [ ] Table is readable

#### Section 3: Charts
- [ ] Chart titles visible ("Endowment Value Projection", etc.)
- [ ] Charts have axes (X: Year labels, Y: Values)
- [ ] Charts have data lines/curves (not blank)
- [ ] Year labels show: 2024, 2025, 2026, etc.
- [ ] Responsive: resizes with window

#### Section 4: Key Metrics Cards
- [ ] Each metric card shows label and value
- [ ] Numbers are reasonable
- [ ] Color coding (if any) displays correctly
- [ ] Layout is responsive

#### Section 5: Tail Risk
- [ ] Percentile values show
- [ ] Risk thresholds display
- [ ] Data looks reasonable

#### Section 6: Methodology Notes
- [ ] Text content displays
- [ ] Formatting is readable
- [ ] No broken layout

#### Section 7: Inputs Display
- [ ] Your input parameters show
- [ ] Values match what you entered
- [ ] All fields populated

---

## ✅ Component Checklist

### Display Components (check all display correctly)

**Layout:**
- [ ] SimulationResults.vue - Layout container shows all sections
- [ ] ResultsView.vue - Full page renders without errors

**Summary/Metrics:**
- [ ] ExecutiveSummary.vue - Shows key metrics
- [ ] StatisticalSummary.vue - Table displays data
- [ ] KeyMetrics.vue - Metric cards show values

**Charts:**
- [ ] EndowmentValueChart.vue - Shows endowment projection line
- [ ] SpendingPolicyAmount.vue - Shows spending amounts

**Sections:**
- [ ] MissionSustainability.vue - Displays mission sustainability
- [ ] EndowmentValueProjection.vue - Shows projections
- [ ] RiskPolicyCompliance.vue - Risk metrics visible
- [ ] TailRisk.vue - Tail risk data displays
- [ ] SimulationInputs.vue - Input parameters shown
- [ ] MethodologyNotes.vue - Notes display
- [ ] InsightsRecommendations.vue - Insights show

**All others:**
- [ ] All other result components render without console errors

---

## 🔍 Detailed Verification

### Network Tab Analysis

**Open DevTools → Network tab → Execute Simulation**

1. **Look for request:**
   - URL: `http://localhost:3001/api/simulations/execute`
   - Method: `POST`
   - Status: `200` (or 201)

2. **Check Request Headers:**
   - `Authorization: Bearer eyJ...` (JWT token)
   - `Content-Type: application/json`

3. **Check Request Body:**
   - Has all simulation parameters:
     ```json
     {
       "name": "Simulation...",
       "years": 30,
       "initialValue": 50000000,
       "spendingRate": 0.05,
       ...
     }
     ```

4. **Check Response:**
   - Status: 200
   - Time: < 500ms (computation) + network
   - Response includes:
     ```json
     {
       "id": "sim_...",
       "summary": {
         "finalValues": {...},
         "success": {...}
       }
     }
     ```

---

## 🧠 Store State Inspection

**Open DevTools → Console and run:**

```javascript
// Import store
import { useSimulationStore } from '@/features/simulation/stores/simulation'
const sim = useSimulationStore()

// Check results loaded
console.log('Results loaded:', !!sim.results)

// Check structure
console.log('Summary:', sim.results?.summary)
console.log('Year labels:', sim.results?.yearLabels)
console.log('Metadata:', sim.results?.metadata)

// Check no errors
console.log('Errors:', sim.errorMsg)
console.log('Loading:', sim.isLoading)

// Check specific metrics
console.log('Median final value:', sim.results?.summary?.medianFinalValue)
console.log('Probability of loss:', sim.results?.summary?.probabilityOfLoss)
console.log('Percentile 10:', sim.results?.summary?.finalValues?.percentile10)
```

**Expected output:**
```
Results loaded: true
Summary: { medianFinalValue: 78900000, probabilityOfLoss: 0.077, ... }
Year labels: ["2024", "2025", ..., "2054"]
Metadata: { simulationCount: 1000, yearsProjected: 30, ... }
Errors: null
Loading: false
Median final value: 78900000
...
```

---

## 🐛 Troubleshooting Component Issues

### Issue 1: "Cannot read property 'summary' of null"
**Cause:** Results didn't load yet or failed

**Fix:**
1. Wait 5 seconds (might still loading)
2. Check console for backend errors
3. Check Network tab for failed request
4. Try executing again

### Issue 2: Charts are blank
**Cause:** Chart data not provided in correct format

**Fix:**
1. Check `console.log(sim.results?.yearLabels)` - should have data
2. Check `sim.results?.summary?.finalValues` - should have numbers
3. Inspect chart component in DevTools
4. Try refreshing page

### Issue 3: Values show as "NaN" or "undefined"
**Cause:** Backend response mapping issue

**Fix:**
1. Check Network tab - response body has correct data
2. Verify store mapping is correct (see store code)
3. Check console.log output from store
4. Restart frontend server and try again

### Issue 4: Spinner stuck (never disappears)
**Cause:** Request hung or still processing

**Fix:**
1. Check Network tab - is request pending?
2. Is backend still running? Check terminal
3. Try refreshing page
4. Stop both servers, restart, try again

### Issue 5: 401 Unauthorized error
**Cause:** JWT token not sent or invalid

**Fix:**
1. Login again
2. Check localStorage has token: `localStorage.getItem('endowcast_token')`
3. Check Network tab - is Authorization header present?
4. Try clearing browser storage and logging in again

---

## ✨ Success Criteria

✅ **Component testing passes when:**

- [ ] Simulation executes in 2-5 seconds
- [ ] No red errors in console
- [ ] All result sections visible
- [ ] No "undefined" or "NaN" values in display
- [ ] Charts show data lines (not blank)
- [ ] Year labels correct (2024, 2025, etc.)
- [ ] Tables show data rows
- [ ] Responsive layout works
- [ ] Network request succeeds (200 status)
- [ ] Store has results with correct structure

---

## 📋 Test Execution Checklist

### Setup
- [ ] Backend running
- [ ] Frontend running
- [ ] Browser opened
- [ ] Logged in

### Execution
- [ ] Clicked "Execute Simulation"
- [ ] Waited for results
- [ ] Checked console (no errors)

### Verification
- [ ] Spinner disappeared
- [ ] Results display
- [ ] All components render
- [ ] Data looks reasonable
- [ ] Network request successful

### Optional: Deep Dive
- [ ] Checked Network tab details
- [ ] Ran console store inspection
- [ ] Verified all component sections
- [ ] Tested responsive layout
- [ ] Tested error scenarios

---

## 🎬 Next Steps

**If all tests pass:** ✅
- Move to next test case in IMPLEMENTATION_CHECKLIST.md
- Or proceed to deployment

**If any test fails:** ⚠️
- Check troubleshooting section above
- Review backend logs
- Check console errors
- Try restarting servers
- See COMPONENT_UPDATE_GUIDE.md for details

---

## 💡 Quick Commands

```bash
# Check backend is running
curl -s http://localhost:3001/api/simulations/execute 2>&1 | head

# Check frontend is running
curl -s http://localhost:5173 | grep -o '<title>.*</title>'

# View backend logs (in terminal running npm run dev)
# Should see: "Backend simulation response: {...}"

# View frontend Network requests
# DevTools → Network tab → Execute simulation
```

---

## 📞 Still Having Issues?

1. **Check COMPONENT_UPDATE_GUIDE.md** - Detailed component info
2. **Check backend logs** - Terminal running `npm run dev`
3. **Check browser console** - DevTools → Console tab
4. **Check Network requests** - DevTools → Network tab
5. **Check database** - Is PostgreSQL running?
6. **Check env vars** - Are DATABASE_POSTGRES_PRISMA_URL and JWT_SECRET set?

---

**Good luck! 🚀 You've got this!**

