import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/stores/auth';
import { apiService } from '@/shared/services/api';

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

  const selectedScenarios = computed(() => {
    return scenarios.value.filter(scenario => selectedForComparison.value.has(scenario.id));
  });

  // Load scenarios from database
  async function loadScenarios() {
    if (!authStore.isAuthenticated || !isActive) {
      console.log('User not authenticated or composable inactive, skipping scenario load');
      return;
    }
    
    try {
      isLoading.value = true;
      error.value = null;
      
      const response = await apiService.getSimulations();
      
      // Check if composable is still active before updating state
      if (!isActive) return;
      
      // Transform the API response to match our Scenario interface
      scenarios.value = (response.simulations || []).map((sim: any) => ({
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
        portfolio: sim.portfolio,
        results: sim.results,
        equityShock: sim.equityShock,
        cpiShift: sim.cpiShift,
        grantTargets: sim.grantTargets
      }));
      
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
    loadScenarios();
  });

  // Cleanup on unmount
  onUnmounted(() => {
    isActive = false;
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
    selectedScenarios,
    
    // Methods
    loadScenarios,
    deleteScenario,
    duplicateScenario,
    toggleExpanded,
    toggleComparisonMode,
    toggleScenarioSelection,
    clearFilters,
    formatMoney,
    formatPercent,
    getResultsSummary,
    parseGrantTargets,
    hasNonZeroGrantTargets
  };
}
