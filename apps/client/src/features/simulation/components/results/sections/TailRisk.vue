<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { percentile, calculateRiskMetrics, inflationAdjustedPreservation } from '@/features/simulation/lib/analytics';

const props = defineProps({
  results: {
    type: Object as PropType<any>,
    required: true,
  },
});

function fmtMoney(n: number | undefined | null) {
  if (n == null || !isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000_000) return `$${(n/1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n/1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function pct(n: number | undefined | null) {
  if (n == null || !isFinite(n)) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

const sims = computed<number[][]>(() => props.results?.simulations ?? []);
const portfolioReturns = computed<number[][]>(() => props.results?.portfolioReturns ?? []);
const spendingPolicy = computed<number[][] | undefined>(() => props.results?.spendingPolicy ?? props.results?.grants);
const inputs = computed(() => props.results?.inputs ?? {});

const initialEndowment = computed(() => {
  const v = props.results?.inputs?.initialEndowment ?? props.results?.inputs?.initialEndowment ?? NaN;
  return typeof v === 'number' ? v : NaN;
});

const years = computed(() => sims.value[0]?.length ?? props.results?.yearLabels?.length ?? 10);

const riskFreePct = computed(() => {
  const s = props.results?.summary?.riskFreeRate ?? props.results?.inputs?.riskFreeRate ?? 2; // percent or fraction
  return typeof s === 'number' && s > 1 ? s / 100 : (typeof s === 'number' ? s : 0.02);
});

// Compute or prefer precomputed risk metrics
const riskMetrics = computed(() => {
  const pre = props.results?.summary ?? props.results?.analytics;
  if (pre && (pre.tailRiskMetrics || pre.safeSpending80 || pre.principalLossProb)) return pre;
  if (!sims.value.length || !isFinite(initialEndowment.value)) return null;
  try {
    return calculateRiskMetrics(sims.value, initialEndowment.value, portfolioReturns.value, props.results?.benchmarks, spendingPolicy.value, initialEndowment.value, riskFreePct.value);
  } catch (e) {
    return null;
  }
});

// Worst percentiles of final value
const worst1Value = computed(() => {
  if (riskMetrics.value?.tailRiskMetrics?.worst1Pct != null) return riskMetrics.value.tailRiskMetrics.worst1Pct;
  if (!sims.value.length) return NaN;
  const yearsN = sims.value[0].length;
  const finals = sims.value.map(s => s[yearsN - 1]).filter(isFinite).sort((a,b)=>a-b);
  return percentile(finals, 1);
});

const worst5Value = computed(() => {
  if (riskMetrics.value?.tailRiskMetrics?.worst5Pct != null) return riskMetrics.value.tailRiskMetrics.worst5Pct;
  if (!sims.value.length) return NaN;
  const yearsN = sims.value[0].length;
  const finals = sims.value.map(s => s[yearsN - 1]).filter(isFinite).sort((a,b)=>a-b);
  return percentile(finals, 5);
});

const worst10Value = computed(() => {
  if (riskMetrics.value?.tailRiskMetrics?.worst10Pct != null) return riskMetrics.value.tailRiskMetrics.worst10Pct;
  if (!sims.value.length) return NaN;
  const yearsN = sims.value[0].length;
  const finals = sims.value.map(s => s[yearsN - 1]).filter(isFinite).sort((a,b)=>a-b);
  return percentile(finals, 10);
});

// Principal loss probability
const principalLossProb = computed(() => {
  if (riskMetrics.value?.principalLossProb != null) return riskMetrics.value.principalLossProb;
  if (!sims.value.length || !isFinite(initialEndowment.value)) return NaN;
  const yearsN = sims.value[0].length;
  const finals = sims.value.map(s => s[yearsN - 1]);
  return finals.filter(v => v < initialEndowment.value).length / finals.length;
});

// Inflation-adjusted preservation (fraction 0..1)
const inflationRate = computed(() => props.results?.inputs?.inflation ?? props.results?.summary?.inflationRate ?? 0.03);
const inflationAdjustedPreservationFrac = computed(() => {
  if (!sims.value.length || !isFinite(initialEndowment.value)) return NaN;
  try { return inflationAdjustedPreservation(sims.value, initialEndowment.value, years.value, inflationRate.value); } catch { return NaN; }
});

// Safe spending (80% success) amount and rate (rate returned by analytics is percent)
const safeSpend80Amount = computed(() => {
  if (riskMetrics.value?.safeSpending80?.amount != null) return riskMetrics.value.safeSpending80.amount;
  // fallback: compute 20th percentile of per-sim minimums from spendingPolicy
  const sp = spendingPolicy.value;
  if (!sp?.length) return NaN;
  const perSimMin = sp.map(s => Math.min(...s));
  return percentile(perSimMin.filter(isFinite), 20);
});

const safeSpend80RatePct = computed(() => {
  if (riskMetrics.value?.safeSpending80?.ratePct != null) return riskMetrics.value.safeSpending80.ratePct;
  if (!isFinite(safeSpend80Amount.value) || !isFinite(initialEndowment.value) || initialEndowment.value === 0) return NaN;
  return (safeSpend80Amount.value / initialEndowment.value) * 100; // percent
});

</script>
<template>
<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-md">
          <h3 class="text-xl font-bold mb-4">Tail Risk (Final Value)</h3> <div class="grid grid-cols-3 gap-3">
            <div class="rounded-lg border border-slate-200 p-3 bg-red-50"> <div class="text-xs text-slate-600 mb-1">Worst 1% Value</div>
              <div id="worst1" class="text-xl font-bold tabnums text-red-700">{{ Number.isFinite(worst1Value) ? fmtMoney(worst1Value) : '—' }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 p-3 bg-red-50">
              <div class="text-xs text-slate-600 mb-1">Worst 5% Value</div>
              <div id="worst5" class="text-xl font-bold tabnums text-red-700">{{ Number.isFinite(worst5Value) ? fmtMoney(worst5Value) : '—' }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 p-3 bg-red-50">
              <div class="text-xs text-slate-600 mb-1">Worst 10% Value</div>
              <div id="worst10" class="text-xl font-bold tabnums text-red-700">{{ Number.isFinite(worst10Value) ? fmtMoney(worst10Value) : '—' }}</div>
            </div>
          </div>
          
          <div class="mt-4 pt-4 border-t border-slate-100">
            <div class="flex items-center justify-between text-base">
              <span class="text-slate-700">Principal Loss Probability (Final &lt; Initial)</span>
              <span id="plp" class="font-bold tabnums text-red-600">{{ Number.isFinite(principalLossProb) ? pct(principalLossProb) : '—' }}</span>
            </div>
          </div>
          
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div class="rounded-lg border border-slate-200 p-3">
              <div class="text-xs text-slate-500 mb-1">Inflation‑Adjusted Preservation</div>
              <div id="iap" class="text-xl font-semibold tabnums text-emerald-600">{{ Number.isFinite(inflationAdjustedPreservationFrac) ? pct(inflationAdjustedPreservationFrac) : '—' }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 p-3">
              <div class="text-xs text-slate-500 mb-1">80% Safe Spend (Amount)</div>
              <div class="text-xl font-semibold tabnums">{{ Number.isFinite(safeSpend80Amount) ? fmtMoney(safeSpend80Amount) : '—' }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 p-3">
              <div class="text-xs text-slate-500 mb-1">Safe Spend Rate</div>
              <div class="text-xl font-semibold tabnums">{{ Number.isFinite(safeSpend80RatePct) ? `${safeSpend80RatePct.toFixed(2)}%` : '—' }}</div>
            </div>
          </div>
        </div>
        
</template>