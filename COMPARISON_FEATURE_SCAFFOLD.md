# Scenario Comparison Feature - Scaffold Complete

## Overview
This document summarizes the starter code created for the Scenario Comparison Dashboard feature. The scaffolding provides the foundational architecture needed to begin implementing the full feature.

## Files Created

### 1. Store: `apps/client/src/features/simulation/stores/comparison.ts` (~130 lines)
**Purpose:** Centralized state management for comparison feature using Pinia

**Key Components:**
- `ComparisonScenario` interface defining scenario structure
- Reactive state for managing 2-4 scenarios
- Baseline scenario tracking
- Loading and error states per scenario

**State Properties:**
- `scenarios`: Array of ComparisonScenario objects
- `baselineScenarioId`: ID of scenario used as comparison baseline
- `isComparing`: Global loading flag
- `comparisonError`: Global error message

**Computed Properties:**
- `selectedScenarios`: Returns all scenarios
- `hasMinimumScenarios`: Validates ≥2 scenarios
- `hasMaximumScenarios`: Validates ≥4 scenarios
- `allScenariosLoaded`: Checks if all scenarios have results
- `baselineScenario`: Returns the baseline scenario object

**Actions:**
- `addScenario()`: Adds new scenario with validation
- `removeScenario()`: Removes scenario and updates baseline if needed
- `updateScenarioResult()`: Updates a scenario's result data
- `updateScenarioLoading()`: Sets loading state per scenario
- `updateScenarioError()`: Sets error message per scenario
- `setBaseline()`: Changes which scenario is the baseline
- `clearComparison()`: Resets all state
- `reorderScenarios()`: Allows custom ordering

### 2. Composable: `apps/client/src/features/simulation/composables/useComparison.ts` (~220 lines)
**Purpose:** Business logic layer for comparison operations

**Key Features:**
- Metric diff calculation relative to baseline
- Batch scenario execution
- Integration with existing simulation store
- Utility functions for formatting and validation

**Exported Interface (`MetricDiff`):**
```typescript
{
  value: number;
  baselineValue: number;
  absoluteDiff: number;
  relativeDiff: number; // percentage
  isBetter: boolean | null;
  label: string;
}
```

**Main Functions:**
- `calculateDiff()`: Calculates difference between value and baseline
- `runComparison()`: Executes all scenarios in parallel
- `addScenarioFromHistory()`: Adds saved simulation by ID
- `addCurrentScenario()`: Adds current simulation state
- `formatMetric()`: Formats values as percent/currency/ratio

**Computed Values:**
- `metricDiffs`: Record of all metric diffs per scenario
- `scenarios`: All selected scenarios
- `baselineScenario`: Current baseline
- Validation flags (hasMinimum, hasMaximum, allLoaded)

### 3. View: `apps/client/src/features/simulation/views/ComparisonView.vue` (~360 lines)
**Purpose:** Main comparison interface component

**UI Sections:**
- **Header**: Title and description
- **Empty State**: Prompts user to add scenarios
- **Controls Bar**: Add scenario, run comparison, clear all buttons
- **Scenarios Grid**: Responsive grid (1-4 columns)
- **Scenario Cards**: Individual scenario results with metrics

**Features:**
- Responsive grid layout (1 col mobile → 4 col desktop)
- Scenario management (add/remove)
- Baseline selection
- Loading states per scenario
- Error handling per scenario
- Metric display with diff indicators
- Placeholder for chart visualizations

**State Management:**
- Uses `useComparison()` composable
- Tracks modal visibility for scenario selector
- Integrates with simulation store for current results

### 4. Router Integration: `apps/client/src/router/index.ts`
**Changes:**
- Updated route from `/simulation/compare` to `/comparison`
- Changed component import from `ScenarioComparison.vue` to `ComparisonView.vue`
- Maintained `/simulation/compare` as alias for backward compatibility
- Protected with `requiresAuth` meta flag

**Route Definition:**
```typescript
{ 
  path: '/comparison', 
  name: 'Comparison', 
  component: () => import('../features/simulation/views/ComparisonView.vue'),
  meta: { requiresAuth: true },
  alias: ['/simulation/compare']
}
```

### 5. Component Enhancement: `apps/client/src/components/ui/MetricItem.vue`
**Changes:**
- Added `diff` prop for displaying metric differences
- Added `isBaseline` prop for baseline indicator
- Added `MetricDiff` interface definition
- Visual diff indicator with color coding:
  - Green: Better than baseline
  - Red: Worse than baseline
  - Gray: Neutral difference
- Shows "Baseline" label for baseline scenario

## Architecture Decisions

### Type Definitions
- Used `any` type for simulation results temporarily
- Added TODO comments for future proper typing
- Reason: No centralized `SimulationResult` type exists yet

### API Integration
- Composable currently only supports loading scenarios from history
- Running new scenarios requires additional implementation
- Placeholder throws error with message "Running new scenarios not yet implemented"

### Component Patterns
- Follows existing Vue 3 + Composition API patterns
- Uses Pinia for state management (matches simulation store)
- Integrates with existing MetricItem component
- Reuses Tailwind CSS utility classes

## Still TODO

### Immediate Next Steps (Week 1 - Core Setup)
1. **ScenarioSelectorModal Component** (~150 lines)
   - Modal UI for selecting scenarios from history
   - Search/filter functionality
   - List of saved simulations
   - Integration with history API

2. **Complete API Integration**
   - Implement "run new scenario" functionality
   - Requires storing input parameters with scenarios
   - May need backend endpoint updates

3. **Navigation Integration**
   - Add link to comparison page in main navigation
   - Add "Compare" action to history table
   - Add "Add to Comparison" button on results page

### Week 2 - Selection & Metrics
4. **MetricsComparisonTable Component** (~200 lines)
   - Table view of all metrics side-by-side
   - Sortable columns
   - Export to CSV functionality

5. **ScenarioCard Enhancements**
   - Better visual design
   - Drag-to-reorder functionality
   - More detailed metadata display

### Week 3 - Visualizations
6. **OverlaidChartsGrid Component** (~250 lines)
   - Multiple chart overlays
   - Chart.js integration
   - Toggle individual scenarios on/off
   - Legend management

7. **Chart Integration**
   - Replace chart placeholder in ComparisonView
   - Reuse existing chart components where possible
   - Add comparison-specific chart types

### Week 4 - Export & Polish
8. **ComparisonExportButton Component** (~100 lines)
   - Extend existing useExport() composable
   - Multi-scenario layout for PNG/PDF
   - All scenarios on one page
   - Custom export options

9. **Mobile Responsive Enhancements**
   - Test and optimize mobile layout
   - Consider tab-based view for mobile
   - Swipe gestures for scenario navigation

10. **Testing & Refinement**
    - User testing
    - Performance optimization
    - Accessibility audit
    - Documentation

## How to Test Current Implementation

### Build Check
```bash
cd apps/client
npm run build
```

### Development Server
```bash
npm run dev
```

### Manual Testing Steps
1. Login to application
2. Navigate to `/comparison` route
3. Verify empty state displays
4. Click "Add from History" (will show placeholder modal)
5. Click "Add Current Simulation" (requires active simulation)
6. Verify scenario cards appear in grid
7. Test baseline selection
8. Test scenario removal
9. Test responsive layout at different breakpoints

### Expected Behavior
- Empty state shows when no scenarios selected
- Add buttons create new scenario cards
- Grid layout adjusts based on number of scenarios (1-4)
- Baseline selection updates badge display
- MetricItem shows diff percentages with color coding
- Loading spinners appear during async operations

## Integration Points

### Existing Features Used
- `useSimulationStore()`: For current simulation state
- `MetricItem.vue`: Enhanced for diff display
- Tailwind CSS: For consistent styling
- Router guard: For authentication protection

### New Dependencies
- None! Uses only existing stack (Vue 3, Pinia, TypeScript)

### Backend Requirements
- Existing `/api/simulations/:id` endpoint for loading scenarios
- (Future) Endpoint for batch simulation execution

## Notes for Developers

### TypeScript Considerations
- `any` types used temporarily for simulation results
- Should create centralized type definitions in future
- All functions properly typed otherwise

### CSS Approach
- Uses Tailwind `@apply` in scoped styles
- Lint warnings for `@apply` are expected (not errors)
- All styles compile correctly

### State Management
- Store is reactive and follows Pinia patterns
- Actions validate state before mutations
- Error states tracked per-scenario for granular error handling

### Performance
- Scenarios run in parallel via `Promise.all()`
- Chart rendering deferred (placeholder for now)
- Lazy route loading via dynamic imports

## Estimated Completion
- **Current Progress**: ~30% complete (architecture + scaffolding)
- **Remaining Work**: 3-4 weeks, 60-80 hours
- **Complexity**: Medium (reuses existing patterns)
- **Risk**: Low (no new dependencies or major refactoring needed)

## Related Documentation
- Full implementation plan: `SCENARIO_COMPARISON_IMPLEMENTATION.md`
- Export font fix: commit `27bf375` (useExport.ts)
- Original feature request: User conversation (feature suggestions)
