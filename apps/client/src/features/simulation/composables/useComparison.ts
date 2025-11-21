import { ref, computed } from 'vue';
import { useComparisonStore } from '../stores/comparison';
import { useSimulationStore } from '../stores/simulation';
import type { ComparisonScenario } from '../stores/comparison';

export interface MetricDiff {
  value: number;
  baselineValue: number;
  absoluteDiff: number;
  relativeDiff: number; // percentage
  isBetter: boolean | null; // null if neutral
  label: string;
}

export function useComparison() {
  const comparisonStore = useComparisonStore();
  const simulationStore = useSimulationStore();

  const isRunning = ref(false);
  const progress = ref(0);

  /**
   * Calculate diff between a value and baseline
   * higherIsBetter: true if higher values are better (e.g., returns), false if lower is better (e.g., volatility)
   */
  function calculateDiff(
    value: number,
    baselineValue: number,
    label: string,
    higherIsBetter = true
  ): MetricDiff {
    const absoluteDiff = value - baselineValue;
    const relativeDiff = baselineValue !== 0 
      ? (absoluteDiff / baselineValue) * 100 
      : 0;

    let isBetter: boolean | null = null;
    if (Math.abs(absoluteDiff) > 0.001) { // Threshold for meaningful difference
      if (higherIsBetter) {
        isBetter = absoluteDiff > 0;
      } else {
        isBetter = absoluteDiff < 0;
      }
    }

    return {
      value,
      baselineValue,
      absoluteDiff,
      relativeDiff,
      isBetter,
      label
    };
  }

  /**
   * Calculate metric diffs for all scenarios relative to baseline
   */
  const metricDiffs = computed(() => {
    const baseline = comparisonStore.baselineScenario;
    if (!baseline?.result) return [];

    const diffs: Record<string, MetricDiff[]> = {};

    comparisonStore.selectedScenarios.forEach(scenario => {
      if (!scenario.result || scenario.id === baseline.id) return;

      const scenarioDiffs: MetricDiff[] = [];

      // Annualized Return
      if (baseline.result.annualizedReturn !== undefined && scenario.result.annualizedReturn !== undefined) {
        scenarioDiffs.push(
          calculateDiff(
            scenario.result.annualizedReturn,
            baseline.result.annualizedReturn,
            'Annualized Return',
            true
          )
        );
      }

      // Volatility
      if (baseline.result.volatility !== undefined && scenario.result.volatility !== undefined) {
        scenarioDiffs.push(
          calculateDiff(
            scenario.result.volatility,
            baseline.result.volatility,
            'Volatility',
            false // Lower is better
          )
        );
      }

      // Sharpe Ratio
      if (baseline.result.sharpe !== undefined && scenario.result.sharpe !== undefined) {
        scenarioDiffs.push(
          calculateDiff(
            scenario.result.sharpe,
            baseline.result.sharpe,
            'Sharpe Ratio',
            true
          )
        );
      }

      // Sustainability Rate
      if (baseline.result.sustainabilityRate !== undefined && scenario.result.sustainabilityRate !== undefined) {
        scenarioDiffs.push(
          calculateDiff(
            scenario.result.sustainabilityRate,
            baseline.result.sustainabilityRate,
            'Sustainability Rate',
            true
          )
        );
      }

      diffs[scenario.id] = scenarioDiffs;
    });

    return diffs;
  });

  /**
   * Run all selected scenarios
   */
  async function runComparison() {
    if (!comparisonStore.hasMinimumScenarios) {
      throw new Error('At least 2 scenarios are required for comparison');
    }

    isRunning.value = true;
    progress.value = 0;
    comparisonStore.isComparing = true;

    const scenarios = comparisonStore.selectedScenarios;
    const total = scenarios.length;
    let completed = 0;

    try {
      // Run scenarios in parallel (backend can handle concurrent requests)
      const promises = scenarios.map(async (scenario) => {
        comparisonStore.updateScenarioLoading(scenario.id, true);

        try {
          // Load the scenario from the API
          if (scenario.simulationId) {
            const token = localStorage.getItem('endowcast_token');
            const response = await fetch(`/api/simulations/${scenario.simulationId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              throw new Error(`Failed to load scenario: ${response.statusText}`);
            }

            const data = await response.json();
            comparisonStore.updateScenarioResult(scenario.id, data);
          } else {
            throw new Error('Scenario has no simulation ID');
          }

          completed++;
          progress.value = (completed / total) * 100;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          comparisonStore.updateScenarioError(scenario.id, errorMessage);
          completed++;
          progress.value = (completed / total) * 100;
        } finally {
          comparisonStore.updateScenarioLoading(scenario.id, false);
        }
      });

      await Promise.all(promises);
    } finally {
      isRunning.value = false;
      comparisonStore.isComparing = false;
    }
  }

  /**
   * Add a scenario from history
   */
  function addScenarioFromHistory(simulationId: string, name: string, description?: string) {
    const scenario: Omit<ComparisonScenario, 'isLoading'> = {
      id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      simulationId
    };

    comparisonStore.addScenario(scenario);
    return scenario.id;
  }

  /**
   * Add current simulation state as a scenario
   */
  function addCurrentScenario(name: string) {
    if (!simulationStore.results) {
      throw new Error('No simulation results available');
    }

    const scenario: Omit<ComparisonScenario, 'isLoading'> = {
      id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      result: simulationStore.results,
      simulationId: simulationStore.results.id
    };

    comparisonStore.addScenario(scenario);
    return scenario.id;
  }

  /**
   * Format a metric value for display
   */
  function formatMetric(value: number, type: 'percent' | 'currency' | 'ratio'): string {
    switch (type) {
      case 'percent':
        return `${(value * 100).toFixed(2)}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'ratio':
        return value.toFixed(2);
      default:
        return value.toString();
    }
  }

  return {
    // State
    isRunning,
    progress,

    // Computed
    metricDiffs,
    scenarios: computed(() => comparisonStore.selectedScenarios),
    baselineScenario: computed(() => comparisonStore.baselineScenario),
    hasMinimumScenarios: computed(() => comparisonStore.hasMinimumScenarios),
    hasMaximumScenarios: computed(() => comparisonStore.hasMaximumScenarios),
    allScenariosLoaded: computed(() => comparisonStore.allScenariosLoaded),

    // Actions
    runComparison,
    addScenarioFromHistory,
    addCurrentScenario,
    removeScenario: comparisonStore.removeScenario,
    setBaseline: comparisonStore.setBaseline,
    clearComparison: comparisonStore.clearComparison,

    // Utilities
    calculateDiff,
    formatMetric
  };
}
