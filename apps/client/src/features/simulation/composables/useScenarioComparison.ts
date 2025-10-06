import { ref, computed } from 'vue';
import { useScenarioHistory, type Scenario } from './useScenarioHistory';

export function useScenarioComparison() {
  const { 
    scenarios, 
    isLoading, 
    error,
    loadScenarios,
    formatMoney,
    formatPercent,
    getResultsSummary 
  } = useScenarioHistory();

  // Selected scenarios for comparison (limit to 4)
  const selectedScenarioIds = ref<string[]>([]);
  const comparisonView = ref<'side-by-side' | 'table'>('side-by-side');
  const showDifferences = ref(false);

  // Get selected scenarios
  const selectedScenarios = computed(() => {
    return scenarios.value.filter(scenario => 
      selectedScenarioIds.value.includes(scenario.id)
    );
  });

  // Available scenarios for selection
  const availableScenarios = computed(() => {
    return scenarios.value.filter(scenario => scenario.isCompleted);
  });

  // Comparison metrics
  const comparisonMetrics = computed(() => {
    const metrics = selectedScenarios.value.map(scenario => {
      const results = getResultsSummary(scenario);
      return {
        id: scenario.id,
        name: scenario.name,
        initialValue: scenario.initialValue,
        spendingRate: scenario.spendingRate,
        years: scenario.years,
        portfolio: scenario.portfolio,
        results: results,
        // Calculate key differences
        equityAllocation: scenario.portfolio ? 
          (Number(scenario.portfolio.publicEquity) || 0) + (Number(scenario.portfolio.privateEquity) || 0) : 0,
        fixedIncomeAllocation: scenario.portfolio ?
          (Number(scenario.portfolio.publicFixedIncome) || 0) + (Number(scenario.portfolio.privateCredit) || 0) : 0,
        alternativeAllocation: scenario.portfolio ?
          (Number(scenario.portfolio.realAssets) || 0) + (Number(scenario.portfolio.diversifying) || 0) : 0,
      };
    });

    return metrics;
  });

  // Statistical comparison
  const comparisonStats = computed(() => {
    const metrics = comparisonMetrics.value;
    if (metrics.length < 2) return null;

    const getStatistics = (values: number[]) => {
      const validValues = values.filter(v => v != null && isFinite(v));
      if (validValues.length === 0) return null;
      
      const min = Math.min(...validValues);
      const max = Math.max(...validValues);
      const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
      const range = max - min;
      
      return { min, max, avg, range };
    };

    return {
      initialValue: getStatistics(metrics.map(m => m.initialValue)),
      spendingRate: getStatistics(metrics.map(m => m.spendingRate)),
      equityAllocation: getStatistics(metrics.map(m => m.equityAllocation)),
      finalValue: getStatistics(metrics.map(m => m.results?.medianFinalValue || 0).filter(v => v > 0)),
      annualizedReturn: getStatistics(metrics.map(m => m.results?.annualizedReturn || 0).filter(v => v > 0)),
      maxDrawdown: getStatistics(metrics.map(m => m.results?.maxDrawdown || 0).filter(v => v > 0)),
    };
  });

  // Add scenario to comparison
  function addScenario(scenarioId: string) {
    if (!selectedScenarioIds.value.includes(scenarioId) && selectedScenarioIds.value.length < 4) {
      selectedScenarioIds.value.push(scenarioId);
    }
  }

  // Remove scenario from comparison
  function removeScenario(scenarioId: string) {
    const index = selectedScenarioIds.value.indexOf(scenarioId);
    if (index > -1) {
      selectedScenarioIds.value.splice(index, 1);
    }
  }

  // Clear all selected scenarios
  function clearComparison() {
    selectedScenarioIds.value = [];
  }

  // Load scenarios with specific IDs
  function loadScenariosForComparison(scenarioIds: string[]) {
    selectedScenarioIds.value = scenarioIds.slice(0, 4); // Limit to 4
    loadScenarios();
  }

  // Export comparison data
  function exportComparison() {
    const data = {
      comparisonDate: new Date().toISOString(),
      scenarios: comparisonMetrics.value,
      statistics: comparisonStats.value
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-comparison-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Get difference indicators for highlighting
  function getDifferenceClass(metric: string, value: any, allValues: any[]) {
    if (!showDifferences.value || allValues.length < 2) return '';
    
    const validValues = allValues.filter(v => v != null && isFinite(v));
    if (validValues.length < 2) return '';
    
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    
    if (value === max) return 'text-green-600 font-semibold'; // Best value
    if (value === min) return 'text-red-600 font-semibold'; // Worst value
    return '';
  }

  // Check if scenario can be compared
  function canCompareScenario(scenario: Scenario): boolean {
    return scenario.isCompleted && scenario.results != null;
  }

  return {
    // State
    selectedScenarioIds,
    comparisonView,
    showDifferences,
    isLoading,
    error,
    
    // Computed
    selectedScenarios,
    availableScenarios,
    comparisonMetrics,
    comparisonStats,
    
    // Methods
    addScenario,
    removeScenario,
    clearComparison,
    loadScenariosForComparison,
    exportComparison,
    getDifferenceClass,
    canCompareScenario,
    loadScenarios,
    formatMoney,
    formatPercent,
    getResultsSummary
  };
}
