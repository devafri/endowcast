# Browser Debug Instructions

## What was done
1. ✅ Enhanced error handling in `main.ts` with global error handlers
2. ✅ Improved auth store error logging to show issues clearly
3. ✅ Fixed router guard error handling
4. ✅ Added visual "✓ App mounted" indicator to App.vue (top-left corner)
5. ✅ Moved footer inside app div (structural fix)

## To troubleshoot the browser loading issue:

### Step 1: Open the app in your browser
- Navigate to: `http://localhost:5173/`
- Make sure the dev server is running (terminal should show "ready in Xms")

### Step 2: Open Developer Tools (Mac)
- Press: **Cmd + Option + J** (opens Console tab)
- OR: **Cmd + Option + I** (opens full DevTools, then click Console tab)

### Step 3: Look for these indicators

**✅ SUCCESS (if you see these):**
- A green box in the top-left that says "✓ App mounted"
- Console shows: "✓ App mounted successfully"
- Console shows: "Initializing auth..."
- Console shows: "✓ Auth initialized, isAuthenticated: false" (or true)
- You see either the Login page or main interface

**❌ FAILURE (if you see these):**
- Console shows red errors like:
  - "Cannot find module..." 
  - "fetch failed" or network errors
  - "TypeError: ..." or other JS errors
  - "CORS" errors
  - "401 Unauthorized"

### Step 4: Copy & paste the error

If you see any errors in the console:
1. Select all console output (Cmd+A)
2. Copy (Cmd+C)
3. Paste it in your next message

### Step 5: Check Network tab
If no errors appear but page is blank:
1. Click "Network" tab in DevTools
2. Reload the page (Cmd+R)
3. Look for any requests that failed (red text)
4. Check especially:
   - `/@vite/client` - should be 200
   - `/src/main.ts` - should be 200
   - Any API requests to localhost:3001 - check their responses

### Step 6: Refresh the page
After making sure the changes are loaded:
- Hard refresh: **Cmd + Shift + R** (bypasses cache)
- Or disable cache in DevTools settings

## What the fix addresses

The issue is likely one of these:
1. **Auth API calls timing out** - We added better error handling
2. **Silent JavaScript errors** - We added global error handlers that log to console
3. **Unhandled promise rejections** - Added unhandledrejection listener
4. **Structural HTML issues** - Moved footer inside app div
5. **Missing error context** - Added detailed logging at each stage

## Next steps after confirming app loads:

1. If app loads → try logging in with test credentials
2. If app doesn't load → share the console errors
3. Once login works → walk through simulation run flow
4. Then verify results navigation works correctly

---

**Files modified:**
- `apps/client/src/main.ts` - Added error handlers and logging
- `apps/client/src/router/index.ts` - Added error try-catch in guard
- `apps/client/src/features/auth/stores/auth.ts` - Better error logging
- `apps/client/src/App.vue` - Added debug indicator and fixed structure

**Status:** ✅ All changes type-checked and passed
