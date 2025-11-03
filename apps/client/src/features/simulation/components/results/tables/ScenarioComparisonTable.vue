<script setup lang="ts">
import { computed, ref } from 'vue';

interface SimulationInput {
  initialEndowment?: number;
  spendingRate?: number;
  investmentExpenseRate?: number;
  years?: number;
  portfolioWeights?: Record<string, number>;
}

interface SimulationSummary {
  medianFinalValue?: number;
  median?: number;
  percentile10?: number;
  percentile25?: number;
  percentile75?: number;
  percentile90?: number;
  annualizedReturn10?: number;
  annualizedReturn25?: number;
  medianAnnualizedReturn?: number;
  annualizedReturn75?: number;
  annualizedReturn90?: number;
  annualizedVolatility10?: number;
  annualizedVolatility25?: number;
  annualizedVolatility?: number;
  annualizedVolatility75?: number;
  annualizedVolatility90?: number;
  sharpe10?: number;
  sharpe25?: number;
  sharpeMedian?: number;
  sharpe75?: number;
  sharpe90?: number;
  sortino10?: number;
  sortino25?: number;
  sortino?: number;  // Backend returns 'sortino' for median (renamed from sortinoMedian)
  sortino75?: number;
  sortino90?: number;
  probabilityOfLoss?: number;
}

interface Simulation {
  id: string;
  name: string;
  inputs?: SimulationInput;
  summary?: SimulationSummary;
  createdAt?: string;
}

const props = defineProps<{
  scenarios: Simulation[];
  showExportButton?: boolean;
}>();

const emit = defineEmits<{
  exportCsv: [data: string];
}>();

const expandedSections = ref<Record<string, Record<string, boolean>>>({});

const toggleSection = (simId: string, section: string) => {
  if (!expandedSections.value[simId]) {
    expandedSections.value[simId] = {};
  }
  expandedSections.value[simId][section] = !expandedSections.value[simId][section];
};

const isSectionExpanded = (simId: string, section: string): boolean => {
  return expandedSections.value[simId]?.[section] ?? true;
};

const formatCurrency = (num: number | null | undefined): string => {
  if (!num && num !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatPercent = (num: number | null | undefined): string => {
  if (!num && num !== 0) return '-';
  return `${((num as number) * 100).toFixed(2)}%`;
};

const formatRatio = (num: number | null | undefined): string => {
  if (!num && num !== 0) return '-';
  return (num as number).toFixed(2);
};

const getRiskLevel = (sharpe: number | null | undefined): string => {
  if (!sharpe) return 'Unknown';
  if (sharpe < 0.5) return 'High Risk';
  if (sharpe < 1) return 'Medium Risk';
  return 'Lower Risk';
};

const getRiskColor = (sharpe: number | null | undefined): string => {
  if (!sharpe) return 'bg-gray-100';
  if (sharpe < 0.5) return 'bg-red-100 text-red-800';
  if (sharpe < 1) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'No date';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const portfolioAssets = computed(() => {
  if (!props.scenarios || props.scenarios.length === 0) return [];
  const weights = props.scenarios[0]?.inputs?.portfolioWeights || {};
  return Object.keys(weights).sort();
});

const exportToCSV = () => {
  let csvContent = '';

  props.scenarios.forEach((sim) => {
    // Simulation Header
    csvContent += `"${sim.name}"\n`;
    csvContent += `"Simulation ID","${sim.id}"\n`;
    csvContent += `"Initial Endowment","${formatCurrency(sim.inputs?.initialEndowment)}"\n`;
    csvContent += `"Spending Policy Rate","${formatPercent(sim.inputs?.spendingRate)}"\n`;
    csvContent += `"Investment Expense Rate","${formatPercent(sim.inputs?.investmentExpenseRate)}"\n`;
    csvContent += `"Years","${sim.inputs?.years}"\n\n`;

    // Portfolio Allocation
    csvContent += `"Portfolio Allocation"\n`;
    csvContent += `"Asset","Allocation %"\n`;
    Object.entries(sim.inputs?.portfolioWeights || {}).forEach(([asset, weight]) => {
      csvContent += `"${asset}","${formatPercent(weight as number)}"\n`;
    });
    csvContent += '\n';

    // Results by Percentile
    csvContent += `"Simulation Results by Percentile"\n`;
    csvContent += `"Metric","10th","25th","50th","75th","90th"\n`;

    // Final Value
    csvContent += `"Final Endowment Value",`;
    csvContent += `"${formatCurrency(sim.summary?.medianFinalValue)}",`;
    csvContent += `"${formatCurrency(sim.summary?.medianFinalValue)}",`;
    csvContent += `"${formatCurrency(sim.summary?.medianFinalValue)}",`;
    csvContent += `"${formatCurrency(sim.summary?.medianFinalValue)}",`;
    csvContent += `"${formatCurrency(sim.summary?.medianFinalValue)}"\n`;

    // Returns
    csvContent += `"Annualized Return",`;
    csvContent += `"${formatPercent(sim.summary?.annualizedReturn10)}",`;
    csvContent += `"${formatPercent(sim.summary?.annualizedReturn25)}",`;
    csvContent += `"${formatPercent(sim.summary?.medianAnnualizedReturn)}",`;
    csvContent += `"${formatPercent(sim.summary?.annualizedReturn75)}",`;
    csvContent += `"${formatPercent(sim.summary?.annualizedReturn90)}"\n`;

    // Volatility
    csvContent += `"Annualized Volatility",`;
    csvContent += `"${formatPercent(sim.summary?.annualizedVolatility10)}",`;
    csvContent += `"${formatPercent(sim.summary?.annualizedVolatility25)}",`;
    csvContent += `"${formatPercent(sim.summary?.annualizedVolatility)}",`;
    csvContent += `"${formatPercent(sim.summary?.annualizedVolatility75)}",`;
    csvContent += `"${formatPercent(sim.summary?.annualizedVolatility90)}"\n`;

    // Sharpe Ratio
    csvContent += `"Sharpe Ratio",`;
    csvContent += `"${formatRatio(sim.summary?.sharpe10)}",`;
    csvContent += `"${formatRatio(sim.summary?.sharpe25)}",`;
    csvContent += `"${formatRatio(sim.summary?.sharpeMedian)}",`;
    csvContent += `"${formatRatio(sim.summary?.sharpe75)}",`;
    csvContent += `"${formatRatio(sim.summary?.sharpe90)}"\n`;

    // Sortino Ratio
    csvContent += `"Sortino Ratio",`;
    csvContent += `"${formatRatio(sim.summary?.sortino10)}",`;
    csvContent += `"${formatRatio(sim.summary?.sortino25)}",`;
    csvContent += `"${formatRatio(sim.summary?.sortino)}",`;
    csvContent += `"${formatRatio(sim.summary?.sortino75)}",`;
    csvContent += `"${formatRatio(sim.summary?.sortino90)}"\n`;

    // Probability of Loss
    csvContent += `"Probability of Falling Below Initial Value",`;
    csvContent += `"${formatPercent(sim.summary?.probabilityOfLoss)}",`;
    csvContent += `"${formatPercent(sim.summary?.probabilityOfLoss)}",`;
    csvContent += `"${formatPercent(sim.summary?.probabilityOfLoss)}",`;
    csvContent += `"${formatPercent(sim.summary?.probabilityOfLoss)}",`;
    csvContent += `"${formatPercent(sim.summary?.probabilityOfLoss)}"\n`;

    csvContent += '\n\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `endowcast_scenarios_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  
  emit('exportCsv', csvContent);
};
</script>

<template>
  <div class="space-y-8 py-6">
    <!-- Export Button -->
    <div v-if="showExportButton" class="flex justify-end gap-2">
      <button
        @click="exportToCSV"
        class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center gap-2 shadow-md hover:shadow-lg"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
        Export All to CSV
      </button>
    </div>

    <!-- No Scenarios Message -->
    <div v-if="!scenarios || scenarios.length === 0" class="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
      <p class="text-gray-500 text-lg">No scenarios to display</p>
    </div>

    <!-- Simulation Tables -->
    <div v-for="sim in scenarios" :key="sim.id" class="space-y-4 pb-8 last:pb-0">
      <!-- Simulation Header Card -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200 shadow-sm">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-bold text-gray-900">{{ sim.name }}</h2>
              <span class="px-3 py-1 rounded-full text-xs font-semibold" :class="getRiskColor(sim.summary?.sharpeMedian)">
                {{ getRiskLevel(sim.summary?.sharpeMedian) }}
              </span>
            </div>
            <p class="text-sm text-gray-600 mt-2">
              <span class="font-mono text-gray-700">ID: {{ sim.id }}</span>
              <span v-if="sim.createdAt" class="ml-4 text-gray-500">Created: {{ formatDate(sim.createdAt) }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Collapsible Sections -->
      <!-- Portfolio Assumptions Section -->
      <div class="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
        <button
          @click="toggleSection(sim.id, 'assumptions')"
          class="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 transition"
        >
          <h3 class="text-base font-semibold text-gray-800">📋 Portfolio Assumptions</h3>
          <svg
            class="w-5 h-5 transition-transform text-gray-600"
            :class="{ 'rotate-180': isSectionExpanded(sim.id, 'assumptions') }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </button>
        <div v-if="isSectionExpanded(sim.id, 'assumptions')" class="p-0">
          <table class="w-full text-sm bg-white">
            <tbody>
              <tr class="border-b border-gray-200 hover:bg-blue-50">
                <td class="px-5 py-3 font-semibold text-gray-700 bg-gray-50 w-1/3">Initial Endowment</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatCurrency(sim.inputs?.initialEndowment) }}</td>
              </tr>
              <tr class="border-b border-gray-200 hover:bg-blue-50">
                <td class="px-5 py-3 font-semibold text-gray-700 bg-gray-50 w-1/3">Spending Policy Rate</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.inputs?.spendingRate) }}</td>
              </tr>
              <tr class="border-b border-gray-200 hover:bg-blue-50">
                <td class="px-5 py-3 font-semibold text-gray-700 bg-gray-50 w-1/3">Investment Expense Rate</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.inputs?.investmentExpenseRate) }}</td>
              </tr>
              <tr class="hover:bg-blue-50">
                <td class="px-5 py-3 font-semibold text-gray-700 bg-gray-50 w-1/3">Years</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ sim.inputs?.years }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Portfolio Allocation Section -->
      <div class="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
        <button
          @click="toggleSection(sim.id, 'allocation')"
          class="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 transition"
        >
          <h3 class="text-base font-semibold text-gray-800">🏗️ Portfolio Allocation</h3>
          <svg
            class="w-5 h-5 transition-transform text-gray-600"
            :class="{ 'rotate-180': isSectionExpanded(sim.id, 'allocation') }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </button>
        <div v-if="isSectionExpanded(sim.id, 'allocation')" class="p-0 overflow-x-auto">
          <table class="w-full text-sm bg-white">
            <thead>
              <tr class="bg-gray-100 border-b border-gray-200">
                <th class="px-5 py-3 text-left font-semibold text-gray-700">Asset Class</th>
                <th class="px-5 py-3 text-right font-semibold text-gray-700">Allocation %</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="asset in portfolioAssets"
                :key="asset"
                class="border-b border-gray-200 hover:bg-indigo-50"
              >
                <td class="px-5 py-3 text-gray-900">{{ asset }}</td>
                <td class="px-5 py-3 text-right text-gray-900 font-semibold">
                  {{ formatPercent((sim.inputs?.portfolioWeights?.[asset] as number) || 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Simulation Results Section -->
      <div class="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
        <button
          @click="toggleSection(sim.id, 'results')"
          class="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 transition"
        >
          <h3 class="text-base font-semibold text-gray-800">📊 Simulation Results by Percentile</h3>
          <svg
            class="w-5 h-5 transition-transform text-gray-600"
            :class="{ 'rotate-180': isSectionExpanded(sim.id, 'results') }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </button>
        <div v-if="isSectionExpanded(sim.id, 'results')" class="p-0 overflow-x-auto">
          <table class="w-full text-sm border-collapse bg-white">
            <thead>
              <tr class="bg-gray-100 border-b border-gray-300">
                <th class="px-5 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 z-10 min-w-[200px]">
                  Metric
                </th>
                <th class="px-5 py-3 text-center font-bold text-indigo-700 bg-indigo-100 text-xs">10th</th>
                <th class="px-5 py-3 text-center font-bold text-indigo-700 bg-indigo-100 text-xs">25th</th>
                <th class="px-5 py-3 text-center font-bold text-green-700 bg-green-100 text-xs font-extrabold">50th</th>
                <th class="px-5 py-3 text-center font-bold text-indigo-700 bg-indigo-100 text-xs">75th</th>
                <th class="px-5 py-3 text-center font-bold text-indigo-700 bg-indigo-100 text-xs">90th</th>
              </tr>
            </thead>
            <tbody>
              <!-- Performance Section -->
              <tr class="bg-blue-50 border-b border-gray-300 font-semibold text-blue-900">
                <td colspan="6" class="px-5 py-2">Performance</td>
              </tr>

              <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-5 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">Final Endowment Value</td>
                <td class="px-5 py-3 text-right text-gray-900 text-xs">{{ formatCurrency(sim.summary?.percentile10) }}</td>
                <td class="px-5 py-3 text-right text-gray-900 text-xs">{{ formatCurrency(sim.summary?.percentile25) }}</td>
                <td class="px-5 py-3 text-right text-gray-900 bg-green-50 font-semibold">{{ formatCurrency(sim.summary?.medianFinalValue || sim.summary?.median) }}</td>
                <td class="px-5 py-3 text-right text-gray-900 text-xs">{{ formatCurrency(sim.summary?.percentile75) }}</td>
                <td class="px-5 py-3 text-right text-gray-900 text-xs">{{ formatCurrency(sim.summary?.percentile90) }}</td>
              </tr>

              <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-5 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">Annualized Return</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.summary?.annualizedReturn10) }}</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.summary?.annualizedReturn25) }}</td>
                <td class="px-5 py-3 text-right text-gray-900 bg-green-50 font-semibold">{{ formatPercent(sim.summary?.medianAnnualizedReturn) }}</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.summary?.annualizedReturn75) }}</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.summary?.annualizedReturn90) }}</td>
              </tr>

              <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-5 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">Annualized Volatility</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.summary?.annualizedVolatility10) }}</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.summary?.annualizedVolatility25) }}</td>
                <td class="px-5 py-3 text-right text-gray-900 bg-green-50 font-semibold">{{ formatPercent(sim.summary?.annualizedVolatility) }}</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.summary?.annualizedVolatility75) }}</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.summary?.annualizedVolatility90) }}</td>
              </tr>

              <!-- Risk Metrics Section -->
              <tr class="bg-yellow-50 border-b border-gray-300 font-semibold text-yellow-900">
                <td colspan="6" class="px-5 py-2">Risk Metrics</td>
              </tr>

              <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-5 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">Sharpe Ratio</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatRatio(sim.summary?.sharpe10) }}</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatRatio(sim.summary?.sharpe25) }}</td>
                <td class="px-5 py-3 text-right text-gray-900 bg-green-50 font-semibold">{{ formatRatio(sim.summary?.sharpeMedian) }}</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatRatio(sim.summary?.sharpe75) }}</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatRatio(sim.summary?.sharpe90) }}</td>
              </tr>

            <!-- Sortino Ratio -->
            <tr class="border-b border-gray-200 hover:bg-gray-50">
              <td class="px-5 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">Sortino Ratio</td>
              <td class="px-5 py-3 text-right text-gray-900">{{ formatRatio(sim.summary?.sortino10) }}</td>
              <td class="px-5 py-3 text-right text-gray-900">{{ formatRatio(sim.summary?.sortino25) }}</td>
              <td class="px-5 py-3 text-right text-gray-900 bg-green-50 font-semibold">{{ formatRatio(sim.summary?.sortino) }}</td>
              <td class="px-5 py-3 text-right text-gray-900">{{ formatRatio(sim.summary?.sortino75) }}</td>
              <td class="px-5 py-3 text-right text-gray-900">{{ formatRatio(sim.summary?.sortino90) }}</td>
            </tr>              <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-5 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">
                  Probability of Loss
                </td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.summary?.probabilityOfLoss) }}</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.summary?.probabilityOfLoss) }}</td>
                <td class="px-5 py-3 text-right text-gray-900 bg-green-50 font-semibold">{{ formatPercent(sim.summary?.probabilityOfLoss) }}</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.summary?.probabilityOfLoss) }}</td>
                <td class="px-5 py-3 text-right text-gray-900">{{ formatPercent(sim.summary?.probabilityOfLoss) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
