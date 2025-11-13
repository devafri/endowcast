import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/stores/auth';
import apiService from '@/shared/services/api';

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  initialValue: number;
  years: number;
  startYear: number;
  spendingRate: number;
  spendingGrowth: number;
  equityReturn: number;
  equityVolatility: number;
  bondReturn: number;
  bondVolatility: number;
  correlation: number;
  isCompleted: boolean;
  runCount?: number;
  // Optional granular asset-class assumptions if present from API
  publicEquityReturn?: number;
  publicEquityVolatility?: number;
  privateEquityReturn?: number;
  privateEquityVolatility?: number;
  publicFixedIncomeReturn?: number;
  publicFixedIncomeVolatility?: number;
  privateCreditReturn?: number;
  privateCreditVolatility?: number;
  realAssetsReturn?: number;
  realAssetsVolatility?: number;
  diversifyingReturn?: number;
  diversifyingVolatility?: number;
  cashShortTermReturn?: number;
  cashShortTermVolatility?: number;
  // Spending/expense extras
  initialOperatingExpense?: number;
  // Benchmarking (optional)
  benchmarkType?: string;
  benchmarkValue?: number;
  benchmarkAssetClass?: string;
  portfolio?: {
    id: string;
    name: string;
    publicEquity?: number;
    privateEquity?: number;
    publicFixedIncome?: number;
    privateCredit?: number;
    realAssets?: number;
    diversifying?: number;
    cashShortTerm?: number;
    expectedReturn?: number;
    expectedVolatility?: number;
    sharpeRatio?: number;
  };
  results?: any;
  equityShock?: string;
  cpiShift?: string;
  grantTargets?: string;
}

export function useScenarioHistory() {
  const authStore = useAuthStore();
  const router = useRouter();
  const scenarios = ref<Scenario[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const expandedScenario = ref<string | null>(null);

  // Track if composable is active to prevent operations after cleanup
  let isActive = true;

  // Search and filter functionality
  const searchQuery = ref('');
  const filterStatus = ref('all'); // 'all', 'completed', 'draft'
  const sortBy = ref('updated'); // 'updated', 'created', 'name', 'initialValue'
  const sortDirection = ref('desc'); // 'asc', 'desc'

  // Comparison mode functionality
  const comparisonMode = ref(false);
  const selectedForComparison = ref<Set<string>>(new Set());
  // Pagination
  const page = ref(1);
  const pageSize = ref(5);
  const hasMore = ref(true); // server-side flag when server pagination is enabled
  const serverPagination = ref(true);
  // Client-side pagination fallback: compute by page and pageSize

  // Computed properties for filtering and sorting
  const filteredAndSortedScenarios = computed(() => {
    let filtered = scenarios.value;

    // Apply search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim();
      filtered = filtered.filter(scenario => 
        scenario.name.toLowerCase().includes(query) ||
        scenario.id.toLowerCase().includes(query) ||
        (scenario.portfolio?.name || '').toLowerCase().includes(query) ||
        (scenario.description || '').toLowerCase().includes(query) ||
        scenario.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (filterStatus.value === 'completed') {
      filtered = filtered.filter(scenario => scenario.isCompleted);
    } else if (filterStatus.value === 'draft') {
      filtered = filtered.filter(scenario => !scenario.isCompleted);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy.value) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'initialValue':
          aValue = Number(a.initialValue) || 0;
          bValue = Number(b.initialValue) || 0;
          break;
        case 'updated':
        default:
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
      }

      if (sortDirection.value === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  });

  // When server pagination is available, we display all loaded items; otherwise, slice locally
  const visibleScenarios = computed(() => {
    if (serverPagination.value) return filteredAndSortedScenarios.value;
    const start = (page.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredAndSortedScenarios.value.slice(start, end);
  });
  const totalPages = computed(() => {
    if (serverPagination.value) return NaN as unknown as number; // unknown
    const total = filteredAndSortedScenarios.value.length;
    return Math.max(1, Math.ceil(total / pageSize.value));
  });
  const hasMoreClient = computed(() => !serverPagination.value && page.value < totalPages.value);

  const selectedScenarios = computed(() => {
    return scenarios.value.filter(scenario => selectedForComparison.value.has(scenario.id));
  });

  // Load scenarios from database
  async function loadScenarios(reset = false) {
    if (!authStore.isAuthenticated || !isActive) {
      console.log('User not authenticated or composable inactive, skipping scenario load');
      return;
    }
    
    try {
      isLoading.value = true;
      error.value = null;
      if (reset) {
        page.value = 1;
        hasMore.value = true;
        scenarios.value = [];
      }
      
      let response: any;
      try {
        // Try server-side pagination first
        response = await apiService.getSimulations({
          page: page.value,
          limit: pageSize.value,
          sortBy: sortBy.value,
          sortOrder: (sortDirection.value as 'asc' | 'desc'),
        });
        serverPagination.value = true;
      } catch (e) {
        // Fallback: server doesn't support these params -> fetch all and paginate client-side
        console.warn('Server pagination not available; falling back to client-side pagination');
        serverPagination.value = false;
        page.value = 1;
        // In fallback mode, ignore params
        response = await apiService.getSimulations();
      }
      
      // Check if composable is still active before updating state
      if (!isActive) return;
      
      // Transform the API response to match our Scenario interface
      const mapped: Scenario[] = (response.simulations || []).map((sim: any) => ({
        id: sim.id,
        name: sim.name,
        description: sim.description || '',
        tags: [], // API doesn't have tags yet, so empty array
        isPublic: true, // Default to public for now
        createdAt: sim.createdAt,
        updatedAt: sim.updatedAt,
        initialValue: Number(sim.initialValue) || 0,
        years: Number(sim.years) || 10,
        startYear: Number(sim.startYear) || new Date().getFullYear(),
        spendingRate: Number(sim.spendingRate) || 0,
        spendingGrowth: Number(sim.spendingGrowth) || 0,
        equityReturn: Number(sim.equityReturn) || 0,
        equityVolatility: Number(sim.equityVolatility) || 0,
        bondReturn: Number(sim.bondReturn) || 0,
        bondVolatility: Number(sim.bondVolatility) || 0,
        correlation: Number(sim.correlation) || 0,
        isCompleted: sim.isCompleted || false,
        runCount: sim.runCount || 0,
        publicEquityReturn: sim.publicEquityReturn != null ? Number(sim.publicEquityReturn) : undefined,
        publicEquityVolatility: sim.publicEquityVolatility != null ? Number(sim.publicEquityVolatility) : undefined,
        privateEquityReturn: sim.privateEquityReturn != null ? Number(sim.privateEquityReturn) : undefined,
        privateEquityVolatility: sim.privateEquityVolatility != null ? Number(sim.privateEquityVolatility) : undefined,
        publicFixedIncomeReturn: sim.publicFixedIncomeReturn != null ? Number(sim.publicFixedIncomeReturn) : undefined,
        publicFixedIncomeVolatility: sim.publicFixedIncomeVolatility != null ? Number(sim.publicFixedIncomeVolatility) : undefined,
        privateCreditReturn: sim.privateCreditReturn != null ? Number(sim.privateCreditReturn) : undefined,
        privateCreditVolatility: sim.privateCreditVolatility != null ? Number(sim.privateCreditVolatility) : undefined,
        realAssetsReturn: sim.realAssetsReturn != null ? Number(sim.realAssetsReturn) : undefined,
        realAssetsVolatility: sim.realAssetsVolatility != null ? Number(sim.realAssetsVolatility) : undefined,
        diversifyingReturn: sim.diversifyingReturn != null ? Number(sim.diversifyingReturn) : undefined,
        diversifyingVolatility: sim.diversifyingVolatility != null ? Number(sim.diversifyingVolatility) : undefined,
        cashShortTermReturn: sim.cashShortTermReturn != null ? Number(sim.cashShortTermReturn) : undefined,
        cashShortTermVolatility: sim.cashShortTermVolatility != null ? Number(sim.cashShortTermVolatility) : undefined,
        initialOperatingExpense: sim.initialOperatingExpense != null ? Number(sim.initialOperatingExpense) : undefined,
        benchmarkType: sim.benchmarkType,
        benchmarkValue: sim.benchmarkValue != null ? Number(sim.benchmarkValue) : undefined,
        benchmarkAssetClass: sim.benchmarkAssetClass,
        portfolio: sim.portfolio,
        results: sim.results,
        equityShock: sim.equityShock,
        cpiShift: sim.cpiShift,
        grantTargets: sim.grantTargets
      }));

      if (serverPagination.value) {
        if (reset) {
          scenarios.value = mapped;
        } else {
          // Append while avoiding duplicates
          const existing = new Set(scenarios.value.map(s => s.id));
          scenarios.value.push(...mapped.filter(m => !existing.has(m.id)));
        }
        // Update hasMore: prefer API hint, else infer by page size
        if (typeof (response.hasMore) === 'boolean') {
          hasMore.value = response.hasMore;
        } else {
          hasMore.value = (response.simulations || []).length >= pageSize.value;
        }
      } else {
        // Client-side pagination: replace entire list; paging handled by computed slice
        scenarios.value = mapped;
        page.value = 1;
        hasMore.value = false; // use hasMoreClient instead
      }
      
    } catch (err: any) {
      if (isActive) {
        console.error('Failed to load scenarios:', err);
        error.value = err?.message || 'Failed to load scenarios';
      }
    } finally {
      if (isActive) {
        isLoading.value = false;
      }
    }
  }

  async function loadMore() {
    if (isLoading.value) return;
    if (serverPagination.value) {
      if (!hasMore.value) return;
      page.value += 1;
      await loadScenarios(false);
    } else {
      // Prefer explicit pagination controls in client mode; keep nextPage behavior
      nextPage();
    }
  }

  async function goToPage(newPage: number) {
    if (newPage < 1) return;
    if (serverPagination.value) {
      if (isLoading.value) return;
      page.value = newPage;
      await loadScenarios(true);
    } else {
      page.value = Math.min(newPage, totalPages.value);
    }
  }

  async function nextPage() {
    if (serverPagination.value) {
      if (!hasMore.value) return;
      await goToPage(page.value + 1);
    } else if (page.value < totalPages.value) {
      page.value += 1;
    }
  }

  async function prevPage() {
    if (page.value <= 1) return;
    await goToPage(page.value - 1);
  }

  // Lazily load full scenario details (including full results) when needed
  async function loadScenarioDetails(scenarioId: string) {
    try {
      const res = await apiService.getSimulation(scenarioId);
      // Merge into existing scenario entry if present
      const idx = scenarios.value.findIndex(s => s.id === scenarioId);
      if (idx !== -1) {
        const current = scenarios.value[idx];
        const merged: Scenario = {
          ...current,
          ...res,
          // Normalize numeric fields that may arrive as strings
          initialValue: Number(res.initialValue ?? current.initialValue) || current.initialValue,
          years: Number(res.years ?? current.years) || current.years,
          startYear: Number(res.startYear ?? current.startYear) || current.startYear,
          spendingRate: Number(res.spendingRate ?? current.spendingRate) || current.spendingRate,
          spendingGrowth: Number(res.spendingGrowth ?? current.spendingGrowth) || current.spendingGrowth,
          equityReturn: Number(res.equityReturn ?? current.equityReturn) || current.equityReturn,
          equityVolatility: Number(res.equityVolatility ?? current.equityVolatility) || current.equityVolatility,
          bondReturn: Number(res.bondReturn ?? current.bondReturn) || current.bondReturn,
          bondVolatility: Number(res.bondVolatility ?? current.bondVolatility) || current.bondVolatility,
          correlation: Number(res.correlation ?? current.correlation) || current.correlation,
          runCount: Number(res.runCount ?? current.runCount) || current.runCount,
          // Optional extras
          publicEquityReturn: res.publicEquityReturn ?? current.publicEquityReturn,
          publicEquityVolatility: res.publicEquityVolatility ?? current.publicEquityVolatility,
          privateEquityReturn: res.privateEquityReturn ?? current.privateEquityReturn,
          privateEquityVolatility: res.privateEquityVolatility ?? current.privateEquityVolatility,
          publicFixedIncomeReturn: res.publicFixedIncomeReturn ?? current.publicFixedIncomeReturn,
          publicFixedIncomeVolatility: res.publicFixedIncomeVolatility ?? current.publicFixedIncomeVolatility,
          privateCreditReturn: res.privateCreditReturn ?? current.privateCreditReturn,
          privateCreditVolatility: res.privateCreditVolatility ?? current.privateCreditVolatility,
          realAssetsReturn: res.realAssetsReturn ?? current.realAssetsReturn,
          realAssetsVolatility: res.realAssetsVolatility ?? current.realAssetsVolatility,
          diversifyingReturn: res.diversifyingReturn ?? current.diversifyingReturn,
          diversifyingVolatility: res.diversifyingVolatility ?? current.diversifyingVolatility,
          cashShortTermReturn: res.cashShortTermReturn ?? current.cashShortTermReturn,
          cashShortTermVolatility: res.cashShortTermVolatility ?? current.cashShortTermVolatility,
          initialOperatingExpense: res.initialOperatingExpense ?? current.initialOperatingExpense,
          benchmarkType: res.benchmarkType ?? current.benchmarkType,
          benchmarkValue: res.benchmarkValue ?? current.benchmarkValue,
          benchmarkAssetClass: res.benchmarkAssetClass ?? current.benchmarkAssetClass,
          portfolio: res.portfolio ?? current.portfolio,
          results: res.results ?? current.results,
        } as Scenario;

        // Normalize results for UI parity
        try {
          const r = typeof merged.results === 'string' ? JSON.parse(merged.results) : (merged.results ?? {});

          // Ensure inputs exist with basic fields used by SimulationResults sections
          r.inputs = r.inputs || {};
          if (r.inputs.initialEndowment == null) r.inputs.initialEndowment = merged.initialValue;
          // riskFreeRate may be stored as percent; keep as percent for UI sections that expect percent
          if (r.inputs.riskFreeRate == null && typeof r?.summary?.riskFreeRate === 'number') r.inputs.riskFreeRate = r.summary.riskFreeRate;
          if (r.inputs.spendingPolicyRate == null && typeof merged.spendingRate === 'number') r.inputs.spendingPolicyRate = merged.spendingRate * 100;
          if (r.inputs.investmentExpenseRate == null && typeof (merged as any).investmentExpenseRate === 'number') r.inputs.investmentExpenseRate = (merged as any).investmentExpenseRate * 100;
          // Inflation rate in summary may be stored either as a fraction (0.02) or a percent (2).
          // Only scale up when it's clearly a fractional value (< 1). Prevents accidental 100x inflation (e.g. 2 -> 200%).
          if (r.inputs.inflationRate == null && typeof r?.summary?.inflationRate === 'number') {
            const infl = r.summary.inflationRate;
            r.inputs.inflationRate = infl < 1 ? infl * 100 : infl;
          }
          // Same protection for investment expense rate normalization: multiply only if < 1
          if (typeof r.inputs.investmentExpenseRate === 'number' && r.inputs.investmentExpenseRate < 0) {
            // Guard against negative junk values; reset to 0.5% default
            r.inputs.investmentExpenseRate = 0.5;
          }
          // Portfolio weights from stored portfolio
          if (!r.inputs.portfolioWeights && merged.portfolio) {
            r.inputs.portfolioWeights = {
              publicEquity: Number(merged.portfolio.publicEquity) || 0,
              privateEquity: Number(merged.portfolio.privateEquity) || 0,
              publicFixedIncome: Number(merged.portfolio.publicFixedIncome) || 0,
              privateCredit: Number(merged.portfolio.privateCredit) || 0,
              realAssets: Number(merged.portfolio.realAssets) || 0,
              diversifying: Number(merged.portfolio.diversifying) || 0,
              cashShortTerm: Number(merged.portfolio.cashShortTerm) || 0,
            };
          }

          // Summary/allocation policy fallback (min/max/default inferred from weights)
          r.summary = r.summary || {};
          if (!r.summary.allocationPolicy && r.inputs?.portfolioWeights) {
            const w = r.inputs.portfolioWeights;
            r.summary.allocationPolicy = Object.fromEntries(Object.keys(w).map(k => [k, { min: 0, max: 100, default: Number(w[k]) || 0 }]));
          }

          // Arrays used by charts/tables: default to empty arrays to avoid runtime errors
          if (!Array.isArray(r.benchmarks)) r.benchmarks = [];
          if (!Array.isArray(r.corpusPaths)) r.corpusPaths = [];

          // yearLabels should be Y+1 long if simulations exist; otherwise derive from scenario years
          const Y = Array.isArray(r.simulations) && r.simulations[0]?.length ? r.simulations[0].length : (Number(merged.years) || 0);
          if (!Array.isArray(r.yearLabels) || r.yearLabels.length !== (Y + 1)) {
            const start = Number(merged.startYear) || new Date().getFullYear();
            r.yearLabels = [start, ...Array.from({ length: Y }, (_, i) => start + i + 1)].map(String);
          }

          merged.results = r;
        } catch {
          // ignore parse error and keep existing results
        }

        scenarios.value[idx] = merged;
      }
    } catch (e) {
      console.warn('Failed to load scenario details', e);
    }
  }

  // Delete scenario
  async function deleteScenario(scenarioId: string) {
    if (!confirm('Are you sure you want to delete this scenario?')) return;
    
    try {
      await apiService.deleteSimulation(scenarioId);
      await loadScenarios(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to delete scenario:', err);
      error.value = 'Failed to delete scenario. Please try again.';
    }
  }

  // Duplicate scenario 
  function duplicateScenario(scenario: Scenario) {
    // Use Vue Router instead of window.location to prevent page reload
    const params = new URLSearchParams({
      initialValue: scenario.initialValue.toString(),
      years: scenario.years.toString(),
      spendingRate: scenario.spendingRate.toString(),
      name: `${scenario.name} (Copy)`,
      ...(scenario.description && { description: `Copy of: ${scenario.description}` })
    });
    
    // Navigate using Vue Router
    router.push(`/results?${params.toString()}`);
  }

  // Toggle expanded view
  function toggleExpanded(scenarioId: string) {
    expandedScenario.value = expandedScenario.value === scenarioId ? null : scenarioId;
  }

  // Comparison mode functions
  function toggleComparisonMode() {
    comparisonMode.value = !comparisonMode.value;
    if (!comparisonMode.value) {
      selectedForComparison.value.clear();
    }
  }

  function toggleScenarioSelection(scenarioId: string) {
    if (selectedForComparison.value.has(scenarioId)) {
      selectedForComparison.value.delete(scenarioId);
    } else {
      // Limit to 4 scenarios for comparison
      if (selectedForComparison.value.size < 4) {
        selectedForComparison.value.add(scenarioId);
      }
    }
  }

  // Clear filters
  function clearFilters() {
    searchQuery.value = '';
    filterStatus.value = 'all';
    sortBy.value = 'updated';
    sortDirection.value = 'desc';
  }

  // Utility functions
  function formatMoney(num: number): string {
    if (num == null || typeof num !== 'number' || !isFinite(num)) return '-';
    
    if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  }

  function formatPercent(num: number): string {
    if (num == null || typeof num !== 'number' || !isFinite(num)) return '-';
    return `${(num * 100).toFixed(1)}%`;
  }

  function getResultsSummary(scenario: Scenario) {
    if (!scenario.results) return null;
    
    try {
      const results = typeof scenario.results === 'string' 
        ? JSON.parse(scenario.results) 
        : scenario.results;
      
      // Handle annualized return - check if it needs to be divided by 100
      let annualizedReturn = results.summary?.annualizedReturn || null;
      if (annualizedReturn && annualizedReturn > 1) {
        annualizedReturn = annualizedReturn / 100; // Convert from percentage to decimal
      }
      
      return {
        medianFinalValue: results.summary?.medianFinalValue || null,
        annualizedReturn,
        maxDrawdown: results.summary?.maxDrawdown || null,
        sharpeRatio: results.summary?.sharpeRatio || null,
        probabilityOfLoss: results.summary?.probabilityOfLoss || null,
        realValuePreservation: results.summary?.realValuePreservation || null,
      };
    } catch (e) {
      return null;
    }
  }

  function parseGrantTargets(grantTargetsJson: string) {
    try {
      return JSON.parse(grantTargetsJson);
    } catch (e) {
      return [];
    }
  }

  function hasNonZeroGrantTargets(grantTargetsJson: string) {
    try {
      const targets = JSON.parse(grantTargetsJson);
      return Array.isArray(targets) && targets.some((amount: any) => Number(amount) > 0);
    } catch (e) {
      return false;
    }
  }

  // Initialize on mount
  onMounted(() => {
    isActive = true;
    loadScenarios(true);
  });

  // Cleanup on unmount
  onUnmounted(() => {
    isActive = false;
  });

  // Re-fetch from page 1 when sort changes (server-side), or reset to page 1 (client-side)
  watch([sortBy, sortDirection], () => {
    if (serverPagination.value) {
      loadScenarios(true);
    } else {
      page.value = 1;
    }
  });
  // Reset visible window on search/filter changes in client-side mode
  watch([searchQuery, filterStatus], () => {
    if (!serverPagination.value) {
      page.value = 1;
    }
  });

  return {
    // State
    scenarios,
    isLoading,
    error,
    expandedScenario,
    searchQuery,
    filterStatus,
    sortBy,
    sortDirection,
    comparisonMode,
    selectedForComparison,
    
    // Computed
  filteredAndSortedScenarios,
  visibleScenarios,
    selectedScenarios,
    
    // Methods
    loadScenarios,
    loadMore,
    deleteScenario,
  loadScenarioDetails,
    duplicateScenario,
    toggleExpanded,
    toggleComparisonMode,
    toggleScenarioSelection,
    clearFilters,
    formatMoney,
    formatPercent,
    getResultsSummary,
    parseGrantTargets,
    hasNonZeroGrantTargets,
    // pagination
    page,
    pageSize,
    hasMore,
    hasMoreClient,
    serverPagination,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
  };
}
