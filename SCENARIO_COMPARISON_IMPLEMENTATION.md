# Scenario Comparison Dashboard - Implementation Plan

## Overview
Add a new feature allowing users to compare 2-4 simulation scenarios side-by-side with visual diffs and unified exports.

---

## 1. Wireframes & User Flow

### Main Comparison View Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  EndowCast                                    [User Menu]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Scenario Comparison                                            │
│  Compare multiple scenarios to evaluate trade-offs              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Select Scenarios to Compare (2-4)                        │  │
│  │                                                           │  │
│  │ [Scenario 1: Current Policy ▼]  [+ Add Scenario]        │  │
│  │ [Scenario 2: Aggressive Growth ▼]                        │  │
│  │ [Scenario 3: Conservative ▼]                             │  │
│  │                                                           │  │
│  │ [Run Comparison]  [Clear All]                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Key Metrics Comparison                                    │  │
│  ├─────────────┬──────────────┬──────────────┬─────────────┤  │
│  │ Metric      │ Scenario 1   │ Scenario 2   │ Scenario 3  │  │
│  ├─────────────┼──────────────┼──────────────┼─────────────┤  │
│  │ Return (Ann)│ 6.74% 🟢     │ 8.12% 🟢     │ 5.21% 🔴    │  │
│  │ Volatility  │ 8.99%        │ 12.45% 🔴    │ 6.12% 🟢    │  │
│  │ Sharpe      │ 0.53         │ 0.61 🟢      │ 0.48 🔴     │  │
│  │ Sustain %   │ 89.9% 🟢     │ 91.2% 🟢     │ 94.6% 🟢    │  │
│  │ Tail Risk   │ $31.8M       │ $27.0M 🟢    │ $35.8M 🔴   │  │
│  └─────────────┴──────────────┴──────────────┴─────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Endowment Value Projections (Percentiles)                │  │
│  │                                                           │  │
│  │  [Chart showing overlaid percentile fans for each        │  │
│  │   scenario with different colors/line styles]            │  │
│  │                                                           │  │
│  │  Legend: ━━ Scenario 1  ━ ━ Scenario 2  ┄┄ Scenario 3   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────┬──────────────────────────────────────┐  │
│  │ Portfolio Mix     │ Risk Breakdown                        │  │
│  │                   │                                       │  │
│  │ [3 pie charts     │ [3 horizontal bar charts showing     │  │
│  │  side-by-side]    │  risk contributions per scenario]    │  │
│  │                   │                                       │  │
│  └───────────────────┴──────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Scenario Details                                          │  │
│  │                                                           │  │
│  │ ▼ Scenario 1: Current Policy                             │  │
│  │   Spending Rate: 4.5% | Initial Value: $50M              │  │
│  │   Equity: 60% | Fixed Income: 30% | Alternatives: 10%    │  │
│  │                                                           │  │
│  │ ▼ Scenario 2: Aggressive Growth                          │  │
│  │   Spending Rate: 4.0% | Initial Value: $50M              │  │
│  │   Equity: 75% | Fixed Income: 15% | Alternatives: 10%    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Export Comparison (PDF)] [Export Comparison (PNG)] [Save]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Scenario Selection Modal
```
┌────────────────────────────────────────────┐
│  Select Scenario                      [×]  │
├────────────────────────────────────────────┤
│                                            │
│  ○ Load from History                      │
│    ┌────────────────────────────────────┐ │
│    │ [Search scenarios...]              │ │
│    ├────────────────────────────────────┤ │
│    │ Current Policy (Nov 15, 2025)      │ │
│    │ Aggressive Growth (Nov 10, 2025)   │ │
│    │ Conservative (Nov 8, 2025)         │ │
│    └────────────────────────────────────┘ │
│                                            │
│  ○ Create New Scenario                    │
│    [Opens allocation/settings form]       │
│                                            │
│  ○ Use Current Settings                   │
│    (From current allocation page state)   │
│                                            │
│           [Cancel]  [Select Scenario]     │
└────────────────────────────────────────────┘
```

### Mobile View (Responsive)
```
┌──────────────────────┐
│ Scenario Comparison  │
├──────────────────────┤
│                      │
│ [Scenario 1 ▼]      │
│ [Scenario 2 ▼]      │
│ [+ Add]             │
│                      │
│ [Run Comparison]    │
│                      │
│ ┌──────────────────┐│
│ │ Key Metrics      ││
│ │ (Swipeable Cards)││
│ │                  ││
│ │  Scenario 1      ││
│ │  Return: 6.74%   ││
│ │  Vol: 8.99%      ││
│ │  ← → (swipe)     ││
│ └──────────────────┘│
│                      │
│ [Endowment Chart]   │
│ (Stacked view)      │
│                      │
│ [Export ▼]          │
└──────────────────────┘
```

---

## 2. User Flow

### Typical Usage Path
1. **Entry Points**:
   - New nav item: "Compare" between "Results" and "History"
   - Button on Results page: "Add to Comparison"
   - Button on History page: "Compare Selected"

2. **Selection Flow**:
   - User clicks "Compare" → lands on empty comparison view
   - Clicks "+ Add Scenario" → modal with 3 options:
     - Load from history (pre-run scenarios)
     - Create new (opens allocation form in modal)
     - Use current (from allocation page state)
   - Selects 2-4 scenarios
   - Clicks "Run Comparison"

3. **Execution & Display**:
   - Progress bar shows simulation progress for each scenario
   - Results populate incrementally as simulations complete
   - Visual diffs auto-calculate (baseline = first scenario)
   - User can toggle scenarios on/off for clearer comparison

4. **Export & Save**:
   - "Export Comparison" generates multi-scenario PDF/PNG
   - "Save Comparison" stores scenario set for future viewing
   - Share link generates URL with scenario IDs

---

## 3. Technical Architecture

### Component Structure
```
apps/client/src/features/simulation/
├── views/
│   └── ComparisonView.vue          (NEW - Main comparison page)
├── components/
│   └── comparison/                  (NEW - Comparison-specific components)
│       ├── ScenarioSelector.vue     (Dropdown/modal for picking scenarios)
│       ├── MetricsComparisonTable.vue (Side-by-side metrics with diffs)
│       ├── OverlaidChartsGrid.vue   (Multi-scenario chart overlays)
│       ├── ScenarioCard.vue         (Individual scenario summary)
│       └── ComparisonExportButton.vue (Extended export for multi-scenario)
├── composables/
│   └── useComparison.ts             (NEW - Comparison state & logic)
└── stores/
    └── comparison.ts                (NEW - Pinia store for comparison state)
```

### Data Flow
```
┌─────────────────┐
│ ComparisonView  │
└────────┬────────┘
         │
         │ uses
         ▼
┌─────────────────────┐      ┌──────────────────┐
│ useComparison()     │◄────►│ comparison store │
│ (composable)        │      │ (Pinia)          │
└─────────┬───────────┘      └──────────────────┘
          │
          │ calls
          ▼
┌─────────────────────┐      ┌──────────────────┐
│ simulation store    │◄────►│ API /execute     │
│ (existing)          │      │ (existing)       │
└─────────────────────┘      └──────────────────┘
          │
          │ provides
          ▼
┌─────────────────────┐
│ Chart components    │
│ (existing, reused)  │
└─────────────────────┘
```

### Key Integrations
- **Simulation Store**: Reuse existing `useSimulationStore()` for running simulations
- **Scenario History**: Leverage existing history API/store for loading saved scenarios
- **Export Composable**: Extend `useExport()` to capture multiple result containers
- **Router**: Add new route `/comparison` with optional query params for scenario IDs

---

## 4. Implementation Checklist

### Phase 1: Core Setup (Week 1)
- [ ] Create comparison Pinia store (`apps/client/src/features/simulation/stores/comparison.ts`)
- [ ] Create comparison composable (`apps/client/src/features/simulation/composables/useComparison.ts`)
- [ ] Add `/comparison` route to router (`apps/client/src/router/index.ts`)
- [ ] Create basic `ComparisonView.vue` with layout structure
- [ ] Add "Compare" nav link in main navigation

### Phase 2: Scenario Selection (Week 1-2)
- [ ] Build `ScenarioSelector.vue` component with dropdown
- [ ] Implement modal for adding scenarios (history, new, current)
- [ ] Connect to existing scenario history store/API
- [ ] Add validation (min 2, max 4 scenarios)
- [ ] Implement "Run Comparison" button with batch simulation execution

### Phase 3: Metrics Comparison (Week 2)
- [ ] Create `MetricsComparisonTable.vue`
- [ ] Implement diff calculations (absolute, relative, color-coding)
- [ ] Add sorting and filtering for metrics
- [ ] Ensure accessibility (screen readers, keyboard nav)
- [ ] Add responsive design for mobile

### Phase 4: Visual Comparisons (Week 2-3)
- [ ] Create `OverlaidChartsGrid.vue` for multi-scenario charts
- [ ] Extend existing chart components to accept multiple datasets
- [ ] Implement color/line-style differentiation per scenario
- [ ] Add legend and toggle controls
- [ ] Create `ScenarioCard.vue` for expandable scenario details

### Phase 5: Export & Sharing (Week 3)
- [ ] Extend `useExport()` to handle multi-scenario layouts
- [ ] Create `ComparisonExportButton.vue`
- [ ] Implement "Save Comparison" functionality
- [ ] Add share link generation (URL with scenario IDs)
- [ ] Test PDF/PNG exports with multiple scenarios

### Phase 6: Polish & Testing (Week 4)
- [ ] Add loading states and error handling
- [ ] Implement animations for diffs and transitions
- [ ] Write unit tests for comparison store and composable
- [ ] Test with various scenario combinations
- [ ] Optimize performance (caching, lazy loading)
- [ ] Update documentation and add tooltips

---

## 5. File Structure (New Files to Create)

```
apps/client/src/features/simulation/
├── views/
│   └── ComparisonView.vue                      (~300 lines)
├── components/
│   └── comparison/
│       ├── ScenarioSelector.vue                (~150 lines)
│       ├── MetricsComparisonTable.vue          (~200 lines)
│       ├── OverlaidChartsGrid.vue              (~250 lines)
│       ├── ScenarioCard.vue                    (~100 lines)
│       └── ComparisonExportButton.vue          (~100 lines)
├── composables/
│   └── useComparison.ts                        (~200 lines)
└── stores/
    └── comparison.ts                            (~150 lines)
```

### Files to Modify
```
apps/client/src/
├── router/index.ts                              (+10 lines - add route)
└── shared/components/layout/
    └── NavBar.vue                               (+5 lines - add nav link)
```

---

## 6. API Considerations

### Existing APIs (No changes needed)
- `POST /api/simulations/execute` - Run individual simulations
- `GET /api/simulations/:id` - Fetch saved scenario
- `GET /api/simulations/history` - List user's scenarios

### Optional Enhancements
- `POST /api/simulations/compare` - Batch execute multiple scenarios with single request
  - Reduces network overhead
  - Returns array of results with consistent timestamps
  - Implementation: Queue scenarios on backend, run in parallel

---

## 7. Key Design Decisions

### State Management
- **Comparison Store (Pinia)**: Holds selected scenarios, comparison results, and UI state
- **Simulation Store**: Reuse existing store for individual simulation runs
- **Composable Layer**: `useComparison()` encapsulates business logic (diffs, validations)

### Performance Optimizations
- **Lazy Loading**: Only load chart libraries when comparison view is opened
- **Result Caching**: Store comparison results in localStorage for quick re-access
- **Incremental Rendering**: Show metrics as each simulation completes (don't wait for all)
- **Web Workers**: Offload diff calculations to avoid blocking UI

### Accessibility
- **Keyboard Navigation**: All controls accessible via keyboard
- **Screen Readers**: ARIA labels for metrics, color-blind friendly indicators
- **Color Coding**: Use icons + text (not just color) for diffs (🟢/🔴 + "Better"/"Worse")

### Mobile Responsiveness
- **Swipeable Cards**: Scenario metrics as horizontal swipe cards on mobile
- **Vertical Stacking**: Stack charts vertically instead of grid on small screens
- **Simplified Export**: Single-column PDF layout for mobile exports

---

## 8. Next Steps

1. **Review wireframes** - Confirm layout aligns with your vision
2. **Prioritize features** - Which aspects are MVP vs. nice-to-have?
3. **Generate starter code** - I can scaffold the core components and store
4. **Integration strategy** - Should this be feature-flagged initially?

---

## Estimated Timeline
- **MVP (Core functionality)**: 3 weeks
- **Full feature (with polish)**: 4 weeks
- **Effort**: ~80-100 hours (1 developer)

## Dependencies
- No new external libraries required
- Builds on existing Vue 3, Pinia, Chart.js, Tailwind CSS stack

---

Would you like me to proceed with generating the starter code for any of these components?
