# Frontend UI Integration Test Plan

## Overview
This document outlines comprehensive testing procedures for the multi-tenant EndowCast application frontend integration.

## Test User Accounts
### Primary Test Account
- **Email**: `ui-test@testorg.com`
- **Password**: `password123`
- **Organization**: `UI Test Organization`
- **Role**: `ADMIN`
- **Plan**: `FREE`

### Additional Test Account
- **Email**: `test@example.com`
- **Password**: `password123`
- **Organization**: `Test User's Organization`
- **Role**: `ADMIN`
- **Plan**: `FREE`

## Frontend & Backend Status
- **Frontend URL**: http://localhost:5174
- **Backend URL**: http://localhost:3001
- **Database**: PostgreSQL with Prisma ORM
- **All services**: ✅ Running and operational

## Test Scenarios

### 1. Authentication Flow Testing
**Objective**: Verify login, registration, and session management

#### 1.1 Registration Test
1. Navigate to http://localhost:5174
2. Click "Sign Up" or navigate to registration page
3. Fill in new user details:
   - Email: `new-user@testorg.com`
   - Password: `password123`
   - First Name: `New`
   - Last Name: `User`
   - Organization Name: `New Test Organization`
   - Industry: `Education`
4. Submit registration form
5. **Expected**: User should be registered, logged in, and redirected to dashboard
6. **Verify**: 
   - User should see organization name in header/navigation
   - Should show FREE plan in subscription details
   - Navigation should show organization-specific options

#### 1.2 Login Test
1. If logged in, log out first
2. Navigate to login page
3. Enter credentials: `ui-test@testorg.com` / `password123`
4. Click Login
5. **Expected**: Successful login and redirect to dashboard
6. **Verify**:
   - User details displayed correctly
   - Organization context loaded
   - Subscription plan shown as FREE
   - Navigation menus accessible

#### 1.3 Session Persistence
1. After successful login, refresh the page
2. **Expected**: User should remain logged in
3. Close browser and reopen
4. Navigate to http://localhost:5174
5. **Expected**: User should still be logged in (if remember me was selected)

### 2. Organization Management Testing
**Objective**: Test organization-specific features and management

#### 2.1 Organization View Access
1. Login as `ui-test@testorg.com`
2. Navigate to Organization view/settings
3. **Expected**: Should see organization details:
   - Organization Name: "UI Test Organization"
   - Industry: "Technology"
   - User count and simulation count
   - Subscription details (FREE plan)

#### 2.2 Organization Statistics
1. In Organization view, verify statistics display:
   - Current subscription plan (FREE)
   - Simulation usage (X used out of 10 per month)
   - User count in organization
   - Current period dates

### 3. Subscription Plan Testing
**Objective**: Verify the updated 4-plan pricing structure

#### 3.1 Pricing View Access
1. Navigate to Pricing view
2. **Expected**: Should see 4 subscription plans:
   - **FREE**: 10 simulations/month, Basic features
   - **ANALYST PRO**: 100 simulations/month, Advanced features
   - **FOUNDATION**: 500 simulations/month, Priority support
   - **FOUNDATION PRO**: Unlimited simulations, All features
3. **Verify**: Each plan shows:
   - Correct pricing
   - Feature lists
   - Simulation limits
   - Proper styling and layout

#### 3.2 Plan Selection (UI Only)
1. Click on different plan "Select" buttons
2. **Expected**: Should show upgrade/contact flows appropriately
3. **Note**: Payment integration not active in development

### 4. Simulation Workflow Testing
**Objective**: Test complete simulation creation and management workflow

#### 4.1 Simulation Creation
1. Navigate to Simulation view
2. Fill in simulation parameters:
   - Name: "Test UI Simulation"
   - Years: 30
   - Start Year: 2024
   - Initial Value: $1,000,000
   - Spending Rate: 4%
   - Equity Return: 8%
   - Equity Volatility: 15%
   - Bond Return: 3%
   - Bond Volatility: 5%
   - Correlation: 0.2
3. Submit simulation
4. **Expected**: 
   - Simulation should be created successfully
   - Should show in simulation history
   - Usage counter should increment

#### 4.2 Simulation List (History)
1. Navigate to History/Simulations view
2. **Expected**: Should see list of simulations for current organization
3. **Verify**:
   - Only shows simulations from current organization
   - Pagination works correctly
   - Sorting functionality works
   - Each simulation shows correct details

#### 4.3 Simulation Results
1. Run a simulation to completion
2. Navigate to Results view
3. **Expected**: 
   - Results should display correctly
   - Charts and graphs should render
   - Export functionality should work (if enabled for plan)

### 5. Multi-Tenant Data Isolation Testing
**Objective**: Verify organization data isolation

#### 5.1 Organization Switching Test
1. Login as `ui-test@testorg.com` (Organization A)
2. Create a simulation named "Org A Simulation"
3. Note simulation count and organization details
4. Logout
5. Login as `test@example.com` (Organization B) 
6. **Expected**:
   - Should NOT see "Org A Simulation" in history
   - Should see different organization name and details
   - Should have separate usage counters
   - Should have separate subscription plan

#### 5.2 Data Scope Verification
1. For each organization login:
   - Verify simulations list only shows organization-specific data
   - Verify usage statistics are organization-specific
   - Verify organization settings are isolated

### 6. Role-Based Permission Testing
**Objective**: Test USER vs ADMIN role differences

#### 6.1 ADMIN Role Testing
1. Login as ADMIN user (`ui-test@testorg.com`)
2. **Expected**: Should have access to:
   - Organization management
   - User management (if implemented)
   - All simulation features
   - Subscription management
   - Usage statistics

#### 6.2 USER Role Testing (To be implemented)
1. Create or login as USER role account
2. **Expected**: Should have restricted access:
   - Can create/view own simulations
   - Cannot access organization management
   - Cannot manage other users
   - Limited administrative features

### 7. Navigation and UI Integration Testing
**Objective**: Test overall UI consistency and navigation

#### 7.1 Navigation Flow
1. Test all main navigation links:
   - Dashboard/Home
   - Simulations
   - History
   - Organization
   - Pricing
   - Settings
2. **Expected**: All pages should load correctly with proper organization context

#### 7.2 Responsive Design
1. Test application on different screen sizes
2. **Expected**: UI should be responsive and functional on desktop, tablet, and mobile

#### 7.3 Error Handling
1. Test various error scenarios:
   - Invalid login credentials
   - Network connectivity issues
   - Form validation errors
2. **Expected**: Proper error messages and graceful degradation

### 8. Performance and Reliability Testing
**Objective**: Verify application performance and stability

#### 8.1 Simulation Limits Testing
1. Create simulations up to the plan limit (10 for FREE)
2. **Expected**: 
   - Should allow up to limit
   - Should prevent creation beyond limit
   - Should show accurate remaining count

#### 8.2 Session Management
1. Test long-running sessions
2. Test token expiration handling
3. **Expected**: Graceful handling of expired sessions

## Expected Outcomes

### ✅ Successfully Completed Features
- Multi-tenant architecture with organization isolation
- 4-tier subscription plan structure (FREE, ANALYST_PRO, FOUNDATION, FOUNDATION_PRO)
- Organization-scoped simulation management
- Role-based authentication (ADMIN/USER)
- Updated PricingView with correct plan information
- Fixed simulation list API endpoint

### 🔄 Areas Requiring Testing
- Frontend UI integration with multi-tenant backend
- Organization management interface functionality
- Role-based permission enforcement in UI
- Simulation workflow end-to-end testing
- Data isolation verification between organizations

## Test Results Documentation

### Issues Found:
(Document any issues discovered during testing)

### Features Verified:
(Document successfully tested features)

### Recommendations:
(Document any improvements or fixes needed)

## Next Steps After Testing
1. Create USER role test accounts for permission testing
2. Implement any bug fixes discovered during testing  
3. Optimize performance issues if found
4. Document final system capabilities and limitations
