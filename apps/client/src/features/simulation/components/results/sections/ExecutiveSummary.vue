<script setup lang="ts">
import { computed } from 'vue';
import { medianFinalValue, probabilityOfLoss, medianAnnualizedReturnFromReturns, inflationAdjustedPreservation } from '@/features/simulation/lib/analytics';
import Tooltip from '@/components/ui/Tooltip.vue';
const props = defineProps<{ results: any }>();

function formatMoney(num: number): string {
  if (!isFinite(num)) return '-';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${Math.round(num).toLocaleString()}`;
}

function formatPctFromDecimal(d: number): string {
  if (!isFinite(d)) return '-';
  return `${(d * 100).toFixed(2)}%`;
}

function formatPctFromFull(val: number): string {
  if (!isFinite(val)) return '-';
  return `${val.toFixed(2)}%`;
}

const years = computed(() => props.results?.simulations?.[0]?.length ?? 10);

const medianFinal = computed(() => {
  if (props.results?.summary?.medianFinalValue != null) return props.results.summary.medianFinalValue;
  return medianFinalValue(props.results?.simulations ?? []);
});

const medianReturnPct = computed(() => {
  // medianAnnualizedReturnFromReturns returns decimal (0.05) when called with returns; the store sometimes stores percents
  if (props.results?.summary?.medianAnnualizedReturn != null) return (props.results.summary.medianAnnualizedReturn / 100);
  if (props.results?.portfolioReturns) return medianAnnualizedReturnFromReturns(props.results.portfolioReturns);
  return NaN;
});

const probabilityOfLossPct = computed(() => {
  if (props.results?.summary?.probabilityOfLoss != null) return props.results.summary.probabilityOfLoss;
  const initial = props.results?.inputs?.initialEndowment ?? props.results?.inputs?.initialValue ?? 0;
  return probabilityOfLoss(props.results?.simulations ?? [], initial);
});

const inflationAdjustedPrincipalRetained = computed(() => {
  if (props.results?.summary?.realValuePreservation != null) return props.results.summary.realValuePreservation;
  if (props.results?.analytics?.realValuePreservation != null) return props.results.analytics.realValuePreservation;
  const initial = props.results?.inputs?.initialEndowment ?? props.results?.inputs?.initialValue ?? 0;
  return inflationAdjustedPreservation(props.results?.simulations ?? [], initial, years.value, 0.03);
});

const longTermSustainableRate = computed(() => {
  const safe80 = props.results?.analytics?.safeSpending80?.ratePct ?? props.results?.summary?.safeSpending80?.ratePct;
  if (safe80 != null) return safe80 / 100;
  if (props.results?.inputs?.spendingPolicyRate) return props.results.inputs.spendingPolicyRate / 100;
  return medianReturnPct.value || NaN;
});

</script>

<template>
    <h2 class="text-xl font-semibold mb-4 text-gray-800">Executive Summary</h2>
  <div class="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
    <div class="bg-white rounded-xl shadow p-5 text-center">
      <div class="flex items-center justify-center space-x-2">
        <div class="text-sm text-text-secondary">50th Percentile Projected Endowment</div>
        <Tooltip :content="'The median (50th percentile) projected endowment value at the end of the simulation horizon.'" id="tt-exec-median">
          <template #trigger="{ open, close }">
            <button @mouseenter="open()" @mouseleave="close()" @focus="open()" @blur="close()" class="text-gray-400 hover:text-gray-600 p-1" aria-label="Explain median endowment" type="button">
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a1 1 0 11-2 0 1 1 0 012 0zM9 9h2v5H9V9z"/></svg>
            </button>
          </template>
        </Tooltip>
      </div>
      <div class="text-2xl sm:text-3xl font-bold text-accent mt-2">{{ formatMoney(medianFinal) }}</div>
      <div class="text-xs text-text-secondary mt-1">After {{ years }} years</div>
    </div>

    <div class="bg-white rounded-xl shadow p-5 text-center">
      <div class="flex items-center justify-center space-x-2">
        <div class="text-sm text-text-secondary">Median Annualized Return</div>
        <Tooltip :content="'Median annualized return across simulations (geometric mean per simulation). Shown as a percent.'" id="tt-exec-median-return">
          <template #trigger="{ open, close }">
            <button @mouseenter="open()" @mouseleave="close()" @focus="open()" @blur="close()" class="text-gray-400 hover:text-gray-600 p-1" aria-label="Explain median return" type="button">
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a1 1 0 11-2 0 1 1 0 012 0zM9 9h2v5H9V9z"/></svg>
            </button>
          </template>
        </Tooltip>
      </div>
      <div class="text-2xl sm:text-3xl font-bold mt-2">{{ formatPctFromDecimal(medianReturnPct) }}</div>
      <div class="text-xs text-text-secondary mt-1">Median across simulations</div>
    </div>

    <div class="bg-white rounded-xl shadow p-5 text-center">
      <div class="flex items-center justify-center space-x-2">
        <div class="text-sm text-text-secondary">Probability Endowment Loses Money</div>
        <Tooltip :content="'Probability that the final endowment value is less than the starting value.'" id="tt-exec-loss-prob">
          <template #trigger="{ open, close }">
            <button @mouseenter="open()" @mouseleave="close()" @focus="open()" @blur="close()" class="text-gray-400 hover:text-gray-600 p-1" aria-label="Explain probability of loss" type="button">
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a1 1 0 11-2 0 1 1 0 012 0zM9 9h2v5H9V9z"/></svg>
            </button>
          </template>
        </Tooltip>
      </div>
      <div :class="['text-2xl sm:text-3xl font-bold mt-2', (probabilityOfLossPct >= 0.33) ? 'text-danger' : 'text-accent']">{{ formatPctFromDecimal(probabilityOfLossPct) }}</div>
      <div class="text-xs text-text-secondary mt-1">Final &lt; starting value</div>
    </div>

    <div class="bg-white rounded-xl shadow p-5 text-center">
      <div class="flex items-center justify-center space-x-2">
        <div class="text-sm text-text-secondary">Inflation-adjusted Principal Retained</div>
        <Tooltip :content="'Fraction of simulations where final endowment is at least the inflation-adjusted original principal (3% p.a.).'" id="tt-exec-inflation">
          <template #trigger="{ open, close }">
            <button @mouseenter="open()" @mouseleave="close()" @focus="open()" @blur="close()" class="text-gray-400 hover:text-gray-600 p-1" aria-label="Explain inflation-adjusted principal" type="button">
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a1 1 0 11-2 0 1 1 0 012 0zM9 9h2v5H9V9z"/></svg>
            </button>
          </template>
        </Tooltip>
      </div>
      <div class="text-2xl sm:text-3xl font-bold mt-2">{{ formatPctFromDecimal(inflationAdjustedPrincipalRetained) }}</div>
      <div class="text-xs text-text-secondary mt-1">Using 3% p.a. inflation</div>
    </div>

    <div class="bg-white rounded-xl shadow p-5 text-center">
      <div class="flex items-center justify-center space-x-2">
        <div class="text-sm text-text-secondary">Long-term Sustainable Rate</div>
        <Tooltip :content="'Estimated sustainable spending rate (80% success heuristic if available); otherwise the scenario spendingPolicyRate or median return.'" id="tt-exec-sustainable">
          <template #trigger="{ open, close }">
            <button @mouseenter="open()" @mouseleave="close()" @focus="open()" @blur="close()" class="text-gray-400 hover:text-gray-600 p-1" aria-label="Explain sustainable rate" type="button">
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a1 1 0 11-2 0 1 1 0 012 0zM9 9h2v5H9V9z"/></svg>
            </button>
          </template>
        </Tooltip>
      </div>
      <div class="text-2xl sm:text-3xl font-bold mt-2">{{ formatPctFromDecimal(longTermSustainableRate) }}</div>
      <div class="text-xs text-text-secondary mt-1">Estimated safe spending rate</div>
    </div>
  </div>
</template>

