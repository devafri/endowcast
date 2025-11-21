import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Use any for now since SimulationResult type isn't centrally defined
// In production, this should reference the actual type from simulation store
export interface ComparisonScenario {
  id: string;
  name: string;
  description?: string;
  simulationId?: string; // If loaded from history
  result?: any; // SimulationResult from backend
  isLoading: boolean;
  error?: string;
}

export const useComparisonStore = defineStore('comparison', () => {
  // State
  const scenarios = ref<ComparisonScenario[]>([]);
  const baselineScenarioId = ref<string | null>(null);
  const isComparing = ref(false);
  const comparisonError = ref<string | null>(null);

  // Computed
  const selectedScenarios = computed(() => scenarios.value.filter(s => s.id));
  const hasMinimumScenarios = computed(() => selectedScenarios.value.length >= 2);
  const hasMaximumScenarios = computed(() => selectedScenarios.value.length >= 4);
  const allScenariosLoaded = computed(() => 
    selectedScenarios.value.length > 0 && 
    selectedScenarios.value.every(s => !s.isLoading && s.result)
  );
  const baselineScenario = computed(() => 
    scenarios.value.find(s => s.id === baselineScenarioId.value)
  );

  // Actions
  function addScenario(scenario: Omit<ComparisonScenario, 'isLoading'>) {
    if (hasMaximumScenarios.value) {
      throw new Error('Maximum of 4 scenarios can be compared');
    }

    scenarios.value.push({
      ...scenario,
      isLoading: false
    });

    // Set first scenario as baseline if none set
    if (!baselineScenarioId.value && scenarios.value.length === 1) {
      baselineScenarioId.value = scenario.id;
    }
  }

  function removeScenario(scenarioId: string) {
    const index = scenarios.value.findIndex(s => s.id === scenarioId);
    if (index > -1) {
      scenarios.value.splice(index, 1);
    }

    // Update baseline if removed
    if (baselineScenarioId.value === scenarioId) {
      baselineScenarioId.value = scenarios.value[0]?.id || null;
    }
  }

  function updateScenarioResult(scenarioId: string, result: any) {
    const scenario = scenarios.value.find(s => s.id === scenarioId);
    if (scenario) {
      scenario.result = result;
      scenario.isLoading = false;
      scenario.error = undefined;
    }
  }

  function updateScenarioLoading(scenarioId: string, loading: boolean) {
    const scenario = scenarios.value.find(s => s.id === scenarioId);
    if (scenario) {
      scenario.isLoading = loading;
    }
  }

  function updateScenarioError(scenarioId: string, error: string) {
    const scenario = scenarios.value.find(s => s.id === scenarioId);
    if (scenario) {
      scenario.error = error;
      scenario.isLoading = false;
    }
  }

  function setBaseline(scenarioId: string) {
    if (scenarios.value.find(s => s.id === scenarioId)) {
      baselineScenarioId.value = scenarioId;
    }
  }

  function clearComparison() {
    scenarios.value = [];
    baselineScenarioId.value = null;
    isComparing.value = false;
    comparisonError.value = null;
  }

  function reorderScenarios(fromIndex: number, toIndex: number) {
    const [removed] = scenarios.value.splice(fromIndex, 1);
    scenarios.value.splice(toIndex, 0, removed);
  }

  return {
    // State
    scenarios,
    baselineScenarioId,
    isComparing,
    comparisonError,

    // Computed
    selectedScenarios,
    hasMinimumScenarios,
    hasMaximumScenarios,
    allScenariosLoaded,
    baselineScenario,

    // Actions
    addScenario,
    removeScenario,
    updateScenarioResult,
    updateScenarioLoading,
    updateScenarioError,
    setBaseline,
    clearComparison,
    reorderScenarios
  };
});
