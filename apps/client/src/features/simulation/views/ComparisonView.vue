<template>
  <div class="comparison-view">
    <!-- Header -->
    <div class="comparison-header">
      <h1 class="text-2xl font-bold text-gray-900">Scenario Comparison</h1>
      <p class="text-sm text-gray-600 mt-1">
        Compare up to 4 scenarios side-by-side
      </p>
    </div>

    <!-- Empty State -->
    <div v-if="scenarios.length === 0" class="empty-state">
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No scenarios selected</h3>
        <p class="mt-1 text-sm text-gray-500">Get started by adding scenarios to compare.</p>
        <div class="mt-6 flex justify-center gap-3">
          <button
            @click="showScenarioSelector = true"
            class="btn-primary"
          >
            Add from History
          </button>
          <button
            @click="addCurrentSimulation"
            :disabled="!hasCurrentSimulation"
            class="btn-secondary"
          >
            Add Current Simulation
          </button>
        </div>
      </div>
    </div>

    <!-- Scenarios Grid -->
    <div v-else class="comparison-content">
      <!-- Controls Bar -->
      <div class="controls-bar">
        <div class="flex items-center gap-4">
          <button
            @click="showScenarioSelector = true"
            :disabled="hasMaximumScenarios"
            class="btn-secondary btn-sm"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Scenario
            <span v-if="hasMaximumScenarios" class="ml-1 text-xs">(Max 4)</span>
          </button>

          <button
            @click="runComparison"
            :disabled="!hasMinimumScenarios || isRunning"
            class="btn-primary btn-sm"
          >
            <svg v-if="!isRunning" class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span v-if="isRunning" class="loading-spinner mr-2"></span>
            {{ isRunning ? `Running... ${progress.toFixed(0)}%` : 'Run Comparison' }}
          </button>

          <button
            @click="clearComparison"
            class="btn-secondary btn-sm text-red-600 hover:bg-red-50"
          >
            Clear All
          </button>
        </div>

        <div class="text-sm text-gray-600">
          {{ scenarios.length }}/4 scenarios
        </div>
      </div>

      <!-- Combined Overlay Chart -->
      <div v-if="allScenariosLoaded" class="mb-6">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">All Scenarios Comparison</h3>
          <p class="text-sm text-gray-600 mb-4">
            Median paths for all {{ scenarios.length }} scenarios overlaid on a single chart
          </p>
          <ComparisonChart 
            :scenarios="scenarios"
            :baseline-id="baselineScenario?.id"
          />
        </div>
      </div>

      <!-- Scenarios Grid -->
      <div class="scenarios-grid" :class="`grid-cols-${scenarios.length}`">
        <div
          v-for="scenario in scenarios"
          :key="scenario.id"
          class="scenario-column"
        >
          <!-- Scenario Header -->
          <div class="scenario-header">
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900 truncate">{{ scenario.name }}</h3>
                <p v-if="scenario.description" class="text-xs text-gray-500 mt-0.5 truncate">
                  {{ scenario.description }}
                </p>
              </div>
              
              <button
                @click="removeScenario(scenario.id)"
                class="text-gray-400 hover:text-red-600 p-1 -mr-1"
                title="Remove scenario"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Baseline Badge -->
            <div class="mt-2 flex items-center gap-2">
              <button
                v-if="baselineScenario?.id !== scenario.id"
                @click="setBaseline(scenario.id)"
                class="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                Set as Baseline
              </button>
              <span
                v-else
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                Baseline
              </span>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="scenario.isLoading" class="scenario-body">
            <div class="flex items-center justify-center py-8">
              <div class="loading-spinner"></div>
              <span class="ml-2 text-sm text-gray-600">Loading...</span>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="scenario.error" class="scenario-body">
            <div class="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
              <p class="font-medium">Error loading scenario</p>
              <p class="mt-1">{{ scenario.error }}</p>
            </div>
          </div>

          <!-- Results -->
          <div v-else-if="scenario.result" class="scenario-body">
            <!-- Key Metrics -->
            <div class="metrics-section">
              <h4 class="text-xs font-medium text-gray-700 mb-3">Key Metrics</h4>
              
              <div class="space-y-3">
                <!-- Annualized Return -->
                <div v-if="scenario.result.annualizedReturn !== undefined">
                  <MetricItem
                    label="Annualized Return"
                    :value="formatMetric(scenario.result.annualizedReturn, 'percent')"
                    :diff="getMetricDiff(scenario.id, 'Annualized Return')"
                    :is-baseline="baselineScenario?.id === scenario.id"
                  />
                </div>

                <!-- Volatility -->
                <div v-if="scenario.result.volatility !== undefined">
                  <MetricItem
                    label="Volatility"
                    :value="formatMetric(scenario.result.volatility, 'percent')"
                    :diff="getMetricDiff(scenario.id, 'Volatility')"
                    :is-baseline="baselineScenario?.id === scenario.id"
                  />
                </div>

                <!-- Sharpe Ratio -->
                <div v-if="scenario.result.sharpe !== undefined">
                  <MetricItem
                    label="Sharpe Ratio"
                    :value="formatMetric(scenario.result.sharpe, 'ratio')"
                    :diff="getMetricDiff(scenario.id, 'Sharpe Ratio')"
                    :is-baseline="baselineScenario?.id === scenario.id"
                  />
                </div>

                <!-- Sustainability Rate -->
                <div v-if="scenario.result.sustainabilityRate !== undefined">
                  <MetricItem
                    label="Sustainability Rate"
                    :value="formatMetric(scenario.result.sustainabilityRate, 'percent')"
                    :diff="getMetricDiff(scenario.id, 'Sustainability Rate')"
                    :is-baseline="baselineScenario?.id === scenario.id"
                  />
                </div>
              </div>
            </div>

            <!-- Chart Placeholder -->
            <div v-if="scenario.result" class="chart-section mt-6">
              <h4 class="text-xs font-medium text-gray-700 mb-3">Simulation Path</h4>
              <ComparisonChart 
                :scenarios="[scenario]"
                :baseline-id="baselineScenario?.id"
              />
            </div>
          </div>

          <!-- No Results -->
          <div v-else class="scenario-body">
            <div class="text-center py-8 text-sm text-gray-500">
              No results available
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scenario Selector Modal -->
    <ScenarioSelectorModal
      v-if="showScenarioSelector"
      :exclude-ids="excludedScenarioIds"
      @close="showScenarioSelector = false"
      @select="onScenarioSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useComparison } from '../composables/useComparison';
import { useSimulationStore } from '../stores/simulation';
import { useComparisonStore } from '../stores/comparison';
import MetricItem from '@/components/ui/MetricItem.vue';
import ScenarioSelectorModal from '../components/comparison/ScenarioSelectorModal.vue';
import ComparisonChart from '../components/comparison/ComparisonChart.vue';

const simulationStore = useSimulationStore();
const comparisonStore = useComparisonStore();

const {
  scenarios,
  baselineScenario,
  hasMinimumScenarios,
  hasMaximumScenarios,
  allScenariosLoaded,
  isRunning,
  progress,
  metricDiffs,
  runComparison,
  addCurrentScenario,
  addScenarioFromHistory,
  removeScenario,
  setBaseline,
  clearComparison,
  formatMetric
} = useComparison();

const showScenarioSelector = ref(false);

const hasCurrentSimulation = computed(() => !!simulationStore.results);

const excludedScenarioIds = computed(() => 
  scenarios.value.map(s => s.simulationId).filter((id): id is string => !!id)
);

function addCurrentSimulation() {
  if (!hasCurrentSimulation.value) return;
  
  const name = `Simulation ${scenarios.value.length + 1}`;
  addCurrentScenario(name);
}

function onScenarioSelected(simulationId: string, name: string, description?: string) {
  addScenarioFromHistory(simulationId, name, description);
  showScenarioSelector.value = false;
}

function getMetricDiff(scenarioId: string, metricLabel: string) {
  if (baselineScenario.value?.id === scenarioId) return null;
  
  const allDiffs = metricDiffs.value as Record<string, any[]>;
  const diffs = allDiffs[scenarioId];
  if (!diffs) return null;
  
  return diffs.find((d: any) => d.label === metricLabel) || null;
}
</script>

<style scoped>
.comparison-view {
  @apply max-w-7xl mx-auto px-4 py-8;
}

.comparison-header {
  @apply mb-8;
}

.empty-state {
  @apply bg-white rounded-lg shadow-sm border border-gray-200;
}

.comparison-content {
  @apply space-y-4;
}

.controls-bar {
  @apply flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3;
}

.scenarios-grid {
  @apply grid gap-4;
}

.scenarios-grid.grid-cols-1 {
  @apply grid-cols-1;
}

.scenarios-grid.grid-cols-2 {
  @apply grid-cols-1 lg:grid-cols-2;
}

.scenarios-grid.grid-cols-3 {
  @apply grid-cols-1 lg:grid-cols-3;
}

.scenarios-grid.grid-cols-4 {
  @apply grid-cols-1 lg:grid-cols-2 xl:grid-cols-4;
}

.scenario-column {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden;
}

.scenario-header {
  @apply bg-gray-50 px-4 py-3 border-b border-gray-200;
}

.scenario-body {
  @apply px-4 py-4;
}

.metrics-section {
  @apply space-y-1;
}

.chart-section {
  @apply border-t border-gray-100 pt-4;
}

.chart-placeholder {
  @apply bg-gray-50 rounded border border-gray-200 h-48 flex items-center justify-center;
}

.btn-primary {
  @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-sm {
  @apply px-3 py-1.5 text-xs;
}

.loading-spinner {
  @apply inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin;
}
</style>
