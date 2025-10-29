<script setup lang="ts">
// @ts-nocheck
import { computed } from 'vue';
import { annualizedReturn, standardDeviation, medianFinalValue, sharpeFromCAGRs, perSimulationSharpe, sortinoRatio, sharpePercentile, percentile } from '@/features/simulation/lib/analytics';

const props = defineProps<{ results: any }>();

// --- Formatting Helpers ---
function formatMoney(num: number): string {
  if (!isFinite(num)) return '—';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatCompactMoney(num: number): string {
  if (!isFinite(num) || num === 0) return '—';
  if (Math.abs(num) >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function pct(n: number | null) { return n != null && isFinite(n) ? `${(n * 100).toFixed(2)}%` : '—'; }
function pctFixed(n: number | null, decimal: number) { return n != null && isFinite(n) ? `${n.toFixed(decimal)}%` : '—'; }

// --- Data Preparation ---
const inputs = computed(() => props.results?.inputs ?? {});

// Initial Endowment: use summary value if available, fall back to inputs
const initialEndowment = computed(() => {
    return inputs.value.initialEndowment ?? props.results?.summary?.initialEndowment ?? NaN;
});

// Horizon: use yearLabels length, or inputs.horizon
const horizonYears = computed(() => {
    const years = props.results?.yearLabels?.length;
    // If yearLabels is present, the horizon is the length of the labels minus 1 (Year 0 to Year N)
    if (years != null && years > 0) return years - 1; 
    return inputs.value.horizon ?? null;
});

// Simulations:
const simulationCount = computed(() => {
    return props.results?.simulations?.length ?? inputs.value.simulations ?? null;
});

// Spending Rate:
const spendingRate = computed(() => {
    return inputs.value.spendingPolicyRate ?? inputs.value.spendingRate ?? null;
});

// Investment Expense Rate:
const investmentExpenseRate = computed(() => {
    return inputs.value.investmentExpenseRate ?? inputs.value.expenseRate ?? null;
});

// Risk-Free Rate:
const riskFreeRatePct = computed(() => {
  const candidates = [inputs.value.riskFreeRate, inputs.value.riskFreeRatePct, inputs.value.riskFreePct, inputs.value.riskFree];
  let rate = null;
  for (const c of candidates) { if (c != null) { rate = Number(c); break; } }
  // Fallback to summary or default 2
  if (rate == null || Number.isNaN(rate)) {
    rate = props.results?.summary?.riskFreeRate ?? 2;
  }
  return rate;
});

// Inflation Rate:
const inflationRatePct = computed(() => {
    // If explicit inflation rate is set, use it. Otherwise, assume it's the risk-free rate (common practice when not specified).
    return inputs.value.inflationRate ?? inputs.value.inflationRatePct ?? null;
});

// --- Exposure for template ---
defineExpose({ formatCompactMoney, pctFixed, initialEndowment, horizonYears, simulationCount, spendingRate, investmentExpenseRate, riskFreeRatePct, inflationRatePct });

</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm order-last xl:order-first">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-bold text-base text-slate-800">Simulation Inputs</h3>
      <span class="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">Assumptions</span>
    </div>

    <div class="text-sm text-slate-700 space-y-2">
      
      <div class="flex items-center justify-between">
        <div class="flex items-center text-slate-500">
          <span>Initial Endowment</span>
          <div class="relative group cursor-help ml-1">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
              The initial amount of the endowment fund used at the start of the simulation.
            </div>
          </div>
        </div>
        <div class="font-semibold text-slate-800 tabnums">{{ formatCompactMoney(initialEndowment) }}</div>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center text-slate-500">
          <span>Horizon (years)</span>
          <div class="relative group cursor-help ml-1">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
              The total number of years the Monte Carlo simulation was projected.
            </div>
          </div>
        </div>
        <div class="font-semibold text-slate-800 tabnums">{{ horizonYears ?? '—' }}</div>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center text-slate-500">
          <span>Simulations</span>
          <div class="relative group cursor-help ml-1">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
              The number of individual, unique scenarios run in the Monte Carlo analysis.
            </div>
          </div>
        </div>
        <div class="font-semibold text-slate-800 tabnums">{{ simulationCount ?? '—' }}</div>
      </div>

      <div class="h-px bg-slate-100 my-2"></div>

      <div class="flex items-center justify-between">
        <div class="flex items-center text-slate-500">
          <span>Spending Rate</span>
          <div class="relative group cursor-help ml-1">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
              The assumed percentage of the endowment's value spent on grants and operations annually.
            </div>
          </div>
        </div>
        <div class="font-semibold text-slate-800 tabnums">{{ pctFixed(spendingRate, 1) }}</div>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center text-slate-500">
          <span>Investment Expense</span>
          <div class="relative group cursor-help ml-1">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
              The annual percentage cost deducted from investment returns for management and administrative fees.
            </div>
          </div>
        </div>
        <div class="font-semibold text-slate-800 tabnums">{{ pctFixed(investmentExpenseRate, 1) }}</div>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center text-slate-500">
          <span>Risk-Free Rate</span>
          <div class="relative group cursor-help ml-1">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
              The rate used as a proxy for a risk-free return in Sharpe and Sortino ratio calculations.
            </div>
          </div>
        </div>
        <div class="font-semibold text-slate-800 tabnums">{{ pctFixed(riskFreeRatePct, 1) }}</div>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center text-slate-500">
          <span>Inflation</span>
          <div class="relative group cursor-help ml-1">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
              The assumed long-term inflation rate used to calculate real, purchasing-power adjusted values.
            </div>
          </div>
        </div>
        <div class="font-semibold text-slate-800 tabnums">{{ inflationRatePct !== null ? pctFixed(inflationRatePct, 2) : '—' }}</div>
      </div>

    </div>

    <footer class="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
      Generated: <span id="gen-time">—</span>
    </footer>
  </div>
</template>