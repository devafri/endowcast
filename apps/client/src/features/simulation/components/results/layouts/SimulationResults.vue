<script setup lang="ts">

import StatisticalSummarySection from '../tables/StatisticalSummary.vue';
import SimulationDataByPercentile from '../tables/SimulationDataByPercentile.vue';
import EndowmentValueChart from '../charts/EndowmentValueChart.vue';
import SpendingPolicyAmount from '../charts/SpendingPolicyAmount.vue';
import SimulationInputs from '../sections/SimulationInputs.vue';
import KeyMetrics from '../sections/KeyMetrics.vue';
import TailRisk from '../sections/TailRisk.vue';
import MethodologyNotes from '../sections/MethodologyNotes.vue';
import PolicyRangeAndWeights from '../sections/PolicyRangeAndWeights.vue';

const props = defineProps<{ results: any; forceMock?: boolean }>();
import { computed } from 'vue';


// Simple mock data to render layout in dev when real results aren't available
const mockResults = {
  summary: {
    medianFinalValue: 125000000,
    probabilityOfLoss: 0.28,
    medianAnnualizedReturn: 6.2, // percent
    annualizedReturn10: 2.5,
    annualizedReturn25: 4.1,
    annualizedReturn75: 8.3,
    annualizedReturn90: 10.5,
    annualizedVolatility: 8.5, // percent
    annualizedVolatility10: 6.2,
    annualizedVolatility25: 7.4,
    annualizedVolatility75: 9.6,
    annualizedVolatility90: 11.2,
    sharpeMedian: 0.52,
    sharpe10: 0.20,
    sharpe25: 0.35,
    sharpe75: 0.68,
    sharpe90: 0.85,
    sortino: 0.43,
    sortino10: 0.15,
    sortino25: 0.28,
    sortino75: 0.58,
    sortino90: 0.72,
    realValuePreservation: 0.63,
    finalValues: {
      percentile10: 95000000,
      percentile25: 110000000,
      percentile75: 140000000,
      percentile90: 160000000
    }
  },
  analytics: {
    safeSpending80: { amount: 4000000, ratePct: 4.0 }
  },
  inputs: { initialEndowment: 50000000, spendingPolicyRate: 4 },
  simulations: Array.from({ length: 200 }, () => Array.from({ length: 10 }, (_, i) => 50000000 * Math.pow(1.05, i))),
  spendingPolicy: Array.from({ length: 200 }, () => Array.from({ length: 10 }, () => 2000000)),
  yearLabels: Array.from({ length: 11 }, (_, i) => (new Date().getFullYear() + i).toString())
};

const dataToUse = computed(() => {
  // If a consumer explicitly forces mock, use mock; otherwise prefer real results when present
  if (props.forceMock) return mockResults;
  return props.results ?? mockResults;
});
</script>

<template>
  <div class="space-y-8">
    <div v-if="dataToUse === undefined" class="text-sm text-gray-500">No results available</div>
    <div v-else-if="(props.forceMock || !props.results)" class="mb-2 p-2 text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 rounded">Using mock results for layout preview (dev only)</div>
 
    <section class="grid grid-cols-1 xl:grid-cols-4 gap-6">
    <SimulationInputs :results="dataToUse" />
    <KeyMetrics :results="dataToUse" />
 </section>
  <PolicyRangeAndWeights :results="dataToUse" />
    
    <EndowmentValueChart :results="dataToUse" />
    <SpendingPolicyAmount v-if="dataToUse?.spendingPolicy?.[0]?.length >= 1" :results="dataToUse" />
    <StatisticalSummarySection :results="dataToUse" />
    <SimulationDataByPercentile :results="dataToUse" />

    
    <TailRisk :results="dataToUse" />
    
    <MethodologyNotes :results="dataToUse" />

  </div>
</template>
