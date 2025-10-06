<script setup lang="ts">
import { computed } from 'vue';
import { useScenarioHistory } from '../composables/useScenarioHistory';
import { useScenarioComparison } from '../composables/useScenarioComparison';

// Use the scenario history composable to get available scenarios
const { 
  scenarios,
  isLoading,
  error,
  loadScenarios,
  formatMoney,
  formatPercent 
} = useScenarioHistory();

// Use the scenario comparison composable for comparison logic
const {
  selectedScenarioIds,
  selectedScenarios,
  addScenario,
  removeScenario,
  clearComparison,
  exportComparison,
  comparisonStats
} = useScenarioComparison();

// Portfolio allocation display configuration
type WeightKey = 'publicEquity' | 'privateEquity' | 'publicFixedIncome' | 'privateCredit' | 'realAssets' | 'diversifying' | 'cashShortTerm';
const allocationRows: Array<{ label: string; key: WeightKey }> = [
  { label: 'Public Equity', key: 'publicEquity' },
  { label: 'Private Equity', key: 'privateEquity' },
  { label: 'Public Fixed Income', key: 'publicFixedIncome' },
  { label: 'Private Credit', key: 'privateCredit' },
  { label: 'Real Assets', key: 'realAssets' },
  { label: 'Diversifying', key: 'diversifying' },
];

// Comparison data computed from selected scenarios
const comparisonData = computed(() => {
  return selectedScenarios.value;
});

function formatPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function toggleScenarioSelection(scenarioId: string) {
  if (selectedScenarioIds.value.includes(scenarioId)) {
    removeScenario(scenarioId);
  } else {
    addScenario(scenarioId);
  }
}

function isScenarioSelected(scenarioId: string): boolean {
  return selectedScenarioIds.value.includes(scenarioId);
}

function getDifferenceClass(current: number, baseline: number, higherIsBetter: boolean = true): string {
  if (current === baseline) return 'text-gray-600';
  const isHigher = current > baseline;
  if (higherIsBetter) {
    return isHigher ? 'text-green-600' : 'text-red-600';
  } else {
    return isHigher ? 'text-red-600' : 'text-green-600';
  }
}

function getDifferenceText(current: number, baseline: number, isPercent: boolean = false): string {
  if (current === baseline) return '';
  const diff = current - baseline;
  const symbol = diff > 0 ? '+' : '';
  if (isPercent) {
    return `(${symbol}${diff.toFixed(2)}pp)`;
  } else {
    const pctChange = ((current - baseline) / baseline * 100);
    return `(${symbol}${pctChange.toFixed(1)}%)`;
  }
}

function getResultsValue(scenario: any, field: string) {
  // Helper to safely get results values from scenario
  const results = scenario.results || {};
  return results[field] || 0;
}

function getPortfolioValue(scenario: any, key: WeightKey): number {
  if (!scenario.portfolio) return 0;
  return Number(scenario.portfolio[key]) || 0;
}
</script>

<template>
  <main class="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Scenario Comparison</h1>
        <p class="text-gray-600 mt-2">Compare multiple scenarios side-by-side to inform strategic decisions</p>
      </div>
      <div class="flex space-x-3">
        <RouterLink to="/simulation/history" class="btn-secondary">
          📊 Scenario History
        </RouterLink>
        <RouterLink to="/simulation" class="btn-primary">
          ➕ New Scenario
        </RouterLink>
      </div>
    </div>

    <!-- Scenario Selection -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold mb-4">Select Scenarios to Compare</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="scenario in scenarios" :key="scenario.id" 
             class="p-4 border rounded-lg cursor-pointer transition-all"
             :class="isScenarioSelected(scenario.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
             @click="toggleScenarioSelection(scenario.id)">
          <div class="flex items-start justify-between">
            <h3 class="font-medium text-gray-900">{{ scenario.name }}</h3>
            <input type="checkbox" :checked="isScenarioSelected(scenario.id)" class="mt-1">
          </div>
          <p class="text-sm text-gray-600 mt-1">{{ scenario.description || 'No description available' }}</p>
          <div class="text-xs text-gray-500 mt-2">
            Created {{ new Date(scenario.createdAt).toLocaleDateString() }}
          </div>
          <div class="mt-3 text-sm">
            <div class="font-medium">{{ formatMoney(scenario.initialValue) }} initial value</div>
            <div class="text-gray-600">{{ scenario.years }} year horizon</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Comparison Results -->
    <div v-if="comparisonData.length >= 2" class="space-y-6">
      <!-- Key Metrics Comparison -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold mb-4">Key Metrics Comparison</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="py-3 px-4 text-left text-sm font-medium text-gray-500">Metric</th>
                <th v-for="(scenario, index) in comparisonData" :key="scenario.id" 
                    class="py-3 px-4 text-center text-sm font-medium"
                    :class="index === 0 ? 'text-blue-600' : 'text-purple-600'">
                  {{ scenario.name }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr>
                <td class="py-3 px-4 text-sm font-medium text-gray-900">Initial Value</td>
                <td v-for="(scenario, index) in comparisonData" :key="'initial-' + scenario.id" 
                    class="py-3 px-4 text-center text-sm font-semibold"
                    :class="index === 0 ? 'text-blue-900' : getDifferenceClass(scenario.initialValue, comparisonData[0].initialValue)">
                  {{ formatMoney(scenario.initialValue) }}
                  <div v-if="index > 0" class="text-xs">
                    {{ getDifferenceText(scenario.initialValue, comparisonData[0].initialValue) }}
                  </div>
                </td>
              </tr>
              <tr>
                <td class="py-3 px-4 text-sm font-medium text-gray-900">Time Horizon</td>
                <td v-for="(scenario, index) in comparisonData" :key="'years-' + scenario.id" 
                    class="py-3 px-4 text-center text-sm font-semibold"
                    :class="index === 0 ? 'text-blue-900' : 'text-gray-900'">
                  {{ scenario.years }} years
                </td>
              </tr>
              <tr>
                <td class="py-3 px-4 text-sm font-medium text-gray-900">Spending Rate</td>
                <td v-for="(scenario, index) in comparisonData" :key="'spending-' + scenario.id" 
                    class="py-3 px-4 text-center text-sm font-semibold"
                    :class="index === 0 ? 'text-blue-900' : getDifferenceClass(scenario.spendingRate, comparisonData[0].spendingRate, false)">
                  {{ formatPercent(scenario.spendingRate) }}
                  <div v-if="index > 0" class="text-xs">
                    {{ getDifferenceText(scenario.spendingRate, comparisonData[0].spendingRate, true) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Portfolio Allocation Comparison -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold mb-4">Portfolio Allocation Comparison</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="py-3 px-4 text-left text-sm font-medium text-gray-500">Asset Class</th>
                <th v-for="(scenario, index) in comparisonData" :key="scenario.id" 
                    class="py-3 px-4 text-center text-sm font-medium"
                    :class="index === 0 ? 'text-blue-600' : 'text-purple-600'">
                  {{ scenario.name }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="row in allocationRows" :key="row.key">
                <td class="py-3 px-4 text-sm font-medium text-gray-900">{{ row.label }}</td>
                <td v-for="(scenario, index) in comparisonData" :key="row.key + '-' + scenario.id" 
                    class="py-3 px-4 text-center text-sm"
                    :class="index === 0 ? 'text-blue-900' : (getPortfolioValue(scenario, row.key) !== getPortfolioValue(comparisonData[0], row.key) ? 'font-semibold text-purple-900' : 'text-gray-600')">
                  {{ getPortfolioValue(scenario, row.key) }}%
                  <span v-if="index > 0 && getPortfolioValue(scenario, row.key) !== getPortfolioValue(comparisonData[0], row.key)" 
                        class="text-xs ml-1"
                        :class="getPortfolioValue(scenario, row.key) > getPortfolioValue(comparisonData[0], row.key) ? 'text-green-600' : 'text-red-600'">
                    ({{ getPortfolioValue(scenario, row.key) > getPortfolioValue(comparisonData[0], row.key) ? '+' : '' }}{{ getPortfolioValue(scenario, row.key) - getPortfolioValue(comparisonData[0], row.key) }}pp)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Strategic Insights -->
      <div v-if="comparisonData.length >= 2" class="card p-6 bg-blue-50">
        <h2 class="text-lg font-semibold mb-4 text-blue-900">Strategic Insights</h2>
        <div class="space-y-3 text-sm">
          <div class="flex items-start space-x-2">
            <span class="text-blue-600 font-bold">💡</span>
            <div>
              <strong>Investment Approach Comparison:</strong> 
              {{ comparisonData[0]?.name }} uses a {{ formatPercent(comparisonData[0]?.spendingRate) }} spending rate
              compared to {{ comparisonData[1]?.name }}'s {{ formatPercent(comparisonData[1]?.spendingRate) }} rate.
            </div>
          </div>
          <div class="flex items-start space-x-2">
            <span class="text-blue-600 font-bold">📊</span>
            <div>
              <strong>Portfolio Diversification:</strong> 
              The scenarios show different approaches to asset allocation with varying equity and fixed income weightings.
              Review the Portfolio Allocation section above for detailed breakdowns.
            </div>
          </div>
          <div class="flex items-start space-x-2">
            <span class="text-blue-600 font-bold">⏱️</span>
            <div>
              <strong>Time Horizon Analysis:</strong> 
              Both scenarios use {{ comparisonData[0]?.years || 'similar' }} year time horizons, 
              allowing for direct comparison of long-term sustainability and growth potential.
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card p-8 text-center">
      <div class="text-gray-500">
        <div class="text-4xl mb-4">📊</div>
        <h3 class="text-lg font-medium mb-2">Select at least 2 scenarios to compare</h3>
        <p class="text-sm">Choose scenarios from the selection above to see detailed comparisons and insights.</p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.btn-primary {
  background-color: rgb(37 99 235);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}
.btn-primary:hover {
  background-color: rgb(29 78 216);
}
.btn-secondary {
  background-color: white;
  color: rgb(55 65 81);
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid rgb(209 213 219);
  transition: background-color 0.2s;
}
.btn-secondary:hover {
  background-color: rgb(249 250 251);
}
.card {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  border: 1px solid rgb(229 231 235);
}
</style>
