<script setup lang="ts">
const props = defineProps<{ results: any }>();

function formatMoney(num: number): string {
  if (!isFinite(num)) return '-';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatPct(p: number): string {
  if (!isFinite(p)) return '-';
  return `${(p * 100).toFixed(2)}%`;
}

// Calculate number of years from simulation data
const years = props.results?.simulations?.[0]?.length ?? 10;
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="card p-6 text-center">
      <h3 class="text-sm font-semibold text-text-secondary">Median Final Value (Year {{ years }})</h3>
      <p class="text-3xl sm:text-4xl font-bold text-accent mt-2">{{ formatMoney(results?.summary?.medianFinalValue ?? 0) }}</p>
      <span class="text-xs text-text-secondary mt-1">After {{ years }} years</span>
    </div>
    <div class="card p-6 text-center">
      <h3 class="text-sm font-semibold text-text-secondary">Probability of Loss vs Initial</h3>
      <p class="text-3xl sm:text-4xl font-bold mt-2" :class="(results?.summary?.probabilityOfLoss ?? 0) > 0.33 ? 'text-danger' : 'text-accent'">{{ formatPct(results?.summary?.probabilityOfLoss ?? 0) }}</p>
    </div>
    <div class="card p-6 text-center">
      <h3 class="text-sm font-semibold text-text-secondary">Median Annualized Return</h3>
      <p class="text-3xl sm:text-4xl font-bold text-accent mt-2">{{ (results?.summary?.medianAnnualizedReturn ?? 0).toFixed(2) }}%</p>
    </div>
  </div>
</template>