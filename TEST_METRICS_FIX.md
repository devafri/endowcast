# Test Guide: Metrics Display Fix

## Quick Verification (5 minutes)

### 1. Backend Running?
```bash
curl http://localhost:3001/api/health 2>&1 | head -5
```

### 2. Frontend Running?
```bash
# In another terminal
cd apps/client && npm run dev
```

### 3. Browser Test
```
URL: http://localhost:5173
Login: test+1@local.test / password123
```

### 4. Run Simulation
1. Click "Run Monte Carlo Analysis" button
2. Wait 5-10 seconds for simulation to complete
3. **Expected result:** Metrics appear below the button

## What Should Display

### KeyMetrics Section (Large blue cards)
- ✅ Expected Return (μ): Should show percentage (e.g., "6.50%")
- ✅ Volatility (σ): Should show percentage (e.g., "16.25%")
- ✅ Sharpe Ratio: Should show number (e.g., "0.42")

### Additional Metrics (Smaller cards)
- ✅ Sortino Ratio
- ✅ Median Max Drawdown %
- ✅ CVaR 95%
- ✅ Inflation-Adjusted Preservation %
- ✅ Median Final Endowment (Year XXXX)
- ✅ Final Value 10-90% band

### Charts
- ✅ Endowment Value Projection (line chart)
- ✅ Spending Policy Amount (line chart or stacked area)

### Tables
- ✅ Statistical Summary (showing percentiles, median, etc.)
- ✅ Simulation Data by Percentile

## Troubleshooting

### Metrics Still Show "—"?

**Check 1: Browser Console**
```javascript
// Open DevTools (F12) and paste this:
import { useSimulationStore } from '@/features/simulation/stores/simulation'
const store = useSimulationStore()
console.log('Results:', store.results)
console.log('Simulations:', store.results?.simulations?.length)
console.log('Inputs:', store.results?.inputs)
```

**Expected Output:**
```
Results: { simulations: [...], inputs: {...}, summary: {...}, ... }
Simulations: 1000  (or your numSimulations count)
Inputs: { initialEndowment: 50000000, spendingPolicyRate: 5, ... }
```

**If `simulations` is empty:**
1. Rebuild frontend: `npm run build`
2. Clear cache: `Cmd+Shift+Delete`
3. Hard refresh: `Cmd+Shift+R`
4. Try simulation again

### Backend Not Responding?

**Check 1: Backend running?**
```bash
ps aux | grep "node.*server"
# Should show: node /path/to/server.js or npm run dev
```

**Check 2: Try login**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test+1@local.test","password":"password123"}'
```

**Should return:** User data with JWT token

**Check 3: Simulate manually**
```bash
TOKEN="your-jwt-token-from-login"

curl -X POST http://localhost:3001/api/simulations/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "years":10,
    "startYear":2025,
    "initialValue":50000000,
    "spendingRate":0.05,
    "spendingGrowth":0,
    "equityReturn":0.07,
    "equityVolatility":0.16,
    "bondReturn":0.04,
    "bondVolatility":0.05,
    "correlation":0.1,
    "equityAllocation":0.6,
    "bondAllocation":0.4,
    "numSimulations":100
  }'
```

**Should return:** `{ id, summary: {...}, paths: [...], ... }`

### Network Errors?

**Check 1: Open Network Tab**
1. Open DevTools (F12)
2. Click "Network" tab
3. Run simulation
4. Look for:
   - ✅ `POST /api/simulations/execute` → **200 OK**
   - ❌ `POST /api/simulations/execute` → **500 Error** (backend problem)
   - ❌ `POST /api/simulations/execute` → **404 Error** (wrong endpoint)

**Check 2: View Response**
Click the request → "Response" tab → Should see JSON with `{ paths: [...], summary: {...} }`

## Complete Test Checklist

### Setup Phase
- [ ] Backend started: `npm run dev` in `/apps/server`
- [ ] Frontend started: `npm run dev` in `/apps/client`
- [ ] Browser open: `http://localhost:5173`
- [ ] Logged in: `test+1@local.test` / `password123`

### Execution Phase
- [ ] Click "Run Monte Carlo Analysis"
- [ ] Wait for completion (progress spinner should disappear)
- [ ] No error message appears

### Verification Phase
- [ ] **KeyMetrics section displays:**
  - [ ] Expected Return shows a percentage
  - [ ] Volatility shows a percentage
  - [ ] Sharpe Ratio shows a number
  
- [ ] **Additional Metrics display:**
  - [ ] Sortino Ratio visible
  - [ ] Max Drawdown % visible
  - [ ] CVaR 95% visible
  - [ ] Preservation % visible
  - [ ] Median Final Value visible
  
- [ ] **Charts display:**
  - [ ] Endowment Value chart has data
  - [ ] Spending Policy chart has data
  
- [ ] **Tables display:**
  - [ ] Statistical Summary table populated
  - [ ] Percentile table populated
  
- [ ] **Console clean:**
  - [ ] Open DevTools
  - [ ] No red errors
  - [ ] No yellow warnings about missing data

### Success Criteria
✅ All checks pass → **FIX IS WORKING**
❌ Any check fails → Check troubleshooting above

## Expected Metric Ranges

For a $50M endowment with 60/40 equity/bond allocation over 10 years:

- **Expected Return:** 5-8% annually
- **Volatility:** 10-20% annually
- **Sharpe Ratio:** 0.3-0.7
- **Sortino Ratio:** 0.5-1.5
- **Max Drawdown:** -30% to -50%
- **Preservation %:** 40-80% (depends on spending rate)
- **Median Final Value:** $50M-$100M

If you see values wildly outside these ranges, the data might not be mapping correctly.

## Files Modified

Only one file was changed:
- `/apps/client/src/features/simulation/stores/simulation.ts`

Changes made:
- Added `inputs` object to mapped results
- Added `simulations` array (from backend `paths`)
- Added empty `portfolioReturns` and `spendingPolicy` arrays
- Added `riskFreeRate` to summary

## Need Help?

1. **Check browser console:** `F12` → `Console` tab
2. **Check network requests:** `F12` → `Network` tab → Run simulation → Look for `/api/simulations/execute`
3. **Check store state:** Paste code from "Troubleshooting" section above
4. **Rebuild:** `npm run build` in `/apps/client`
5. **Clear cache:** `Cmd+Shift+Delete` → Clear all

If still not working, the issue might be with data from the backend. Check the `/api/simulations/execute` response in the Network tab to see if it contains `paths` and other expected fields.
