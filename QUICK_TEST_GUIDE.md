# 🧪 Quick Test Guide - Simulation Fix

## Status: ✅ READY TO TEST

**Backend:** ✅ `/api/simulations/execute` working  
**Frontend:** ✅ Store fixed, builds successfully  
**Components:** ✅ All 48 ready (no changes needed)  

---

## Quick Test (5 minutes)

### 1. Start Backend (if not running)
```bash
cd apps/server
npm run dev
# Should see: Server running on port 3001
```

### 2. Start Frontend (if not running)
```bash
cd apps/client
npm run dev
# Should see: Local: http://localhost:5173
```

### 3. Open Browser
```
http://localhost:5173
```

### 4. Login
- Email: `test+1@local.test`
- Password: `password123`

### 5. Navigate to Simulation
- Click "Dashboard" or "Simulations"
- You should see the simulation interface

### 6. Run Simulation
1. Set any parameters (or use defaults)
2. Click "Run Simulation" button
3. **Expected:** Results appear in <5 seconds (no 500 error!)

### 7. Verify Results Display
Check that all sections show data:
- ✅ Executive Summary
- ✅ Charts (Endowment Value, Spending Policy)
- ✅ Statistical Summary
- ✅ Success Metrics
- ✅ Key Metrics
- ✅ Tail Risk Analysis
- ✅ All tables with data

---

## What Was Fixed

| Before | After |
|--------|-------|
| POST /api/simulations → 500 error | ❌ Removed unnecessary call |
| Tried to create record first | ❌ Removed |
| Then POST /api/simulations/execute | ✅ Direct single call |
| Frontend error shown | ✅ Results display instead |

---

## If You See an Error

### Still Getting 500 Error?
1. Clear browser cache (Cmd+Shift+Delete)
2. Hard refresh (Cmd+Shift+R)
3. Check backend is running: `curl http://localhost:3001/api/health`
4. Check frontend rebuilt: `npm run build`

### Simulation Takes >10 seconds?
- Normal for large simulations (1000+ paths)
- Check browser console for error details
- Reduce numSimulations parameter if slow

### Results don't display?
- Check browser console for JavaScript errors
- Check network tab for API response format
- All 48 components should show data automatically

---

## Backend Request/Response

### What Frontend Sends (POST /api/simulations/execute)
```json
{
  "years": 10,
  "startYear": 2025,
  "initialValue": 50000000,
  "spendingRate": 0.05,
  "spendingGrowth": 0,
  "equityReturn": 0.07,
  "equityVolatility": 0.16,
  "bondReturn": 0.04,
  "bondVolatility": 0.05,
  "correlation": 0.1,
  "equityAllocation": 0.6,
  "bondAllocation": 0.4,
  "numSimulations": 1000
}
```

### What Backend Returns (200 OK)
```json
{
  "id": "sim_1761797546603_...",
  "timestamp": "2025-10-30T04:12:26.603Z",
  "computeTimeMs": 1,
  "metadata": { ... },
  "summary": {
    "finalValues": {
      "median": 51258806.89,
      "percentile10": 29183578.17,
      "percentile25": 38521175.03,
      "percentile75": 66595566.41,
      "percentile90": 93143423.04,
      "average": 55668200.85,
      "stdDev": 24421322.7,
      "min": 18485617.93,
      "max": 144642800.59
    },
    "success": {
      "probability": "100.00%",
      "count": 1000,
      "total": 1000,
      "byYear": ["100.00%", ...]
    }
  },
  "paths": [ ... ]
}
```

---

## Browser Developer Tools Checks

### Network Tab
- Should see: `POST /api/simulations/execute` → 200 OK
- Should NOT see: `POST /api/simulations` → 500 Error

### Console Tab
- Should see: No errors after "Executing simulation on backend"
- Verify: Response logs show summary data

### Store State
Press F12, then in console:
```javascript
// View simulation results
import { useSimulationStore } from '@/features/simulation/stores/simulation'
const store = useSimulationStore()
console.log(store.results)
// Should show finalValues, success, paths
```

---

## Success Criteria

✅ **Simulation Executes**
- No 500 error
- Results appear in <10 seconds

✅ **Results Display**
- Charts render with data
- All metrics show values
- All tables populated

✅ **No Console Errors**
- Network tab clean
- JavaScript console clean
- No 404 or 500 errors

✅ **All Components Show Data**
- Summary section displays
- Charts display
- Tables display
- All 48 components compatible

---

## Files Changed

- ✅ `/apps/client/src/features/simulation/stores/simulation.ts`
  - Removed: `createSimulation()` call
  - Removed: `simulationId` variable
  - Kept: `executeSimulation()` call
  - Status: No compilation errors

---

## No Other Changes Needed

- ✅ Backend unchanged (already working)
- ✅ API service unchanged (already has `executeSimulation()`)
- ✅ All 48 Vue components unchanged (work with results)
- ✅ Database unchanged (optional async save works)

---

## Troubleshooting Commands

```bash
# Check backend running
curl http://localhost:3001/api/health

# Check frontend running
curl http://localhost:5173

# Check authentication
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test+1@local.test","password":"password123"}'

# Test simulation endpoint (use token from auth response)
curl -X POST http://localhost:3001/api/simulations/execute \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{"years":10,"startYear":2025,"initialValue":50000000,"spendingRate":0.05,"spendingGrowth":0,"equityReturn":0.07,"equityVolatility":0.16,"bondReturn":0.04,"bondVolatility":0.05,"correlation":0.1,"equityAllocation":0.6,"bondAllocation":0.4,"numSimulations":100}'
```

---

## Next Steps

1. ✅ Test simulation execution (this guide)
2. ✅ Verify all components display results
3. ✅ Run full test suite (see IMPLEMENTATION_CHECKLIST.md)
4. ✅ Deploy to production (when ready)

---

**🚀 Ready to test! Open your browser and try running a simulation.**

Expected result: Charts and data display, NO 500 error. If you see this, the fix is complete! 🎉
