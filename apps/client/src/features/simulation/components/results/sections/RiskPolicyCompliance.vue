<script setup lang="ts">
import { annualizedReturn, standardDeviation, medianFinalValue, sharpeFromCAGRs, perSimulationSharpe, sortinoRatio, sharpePercentile, percentile } from '@/features/simulation/lib/analytics';
import { computed } from 'vue';
import MetricItem from '@/components/ui/MetricItem.vue';
const props = defineProps<{ results: any }>();

function formatMoney(num: number): string {
  if (!isFinite(num)) return '-';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function pct(n: number) { return isFinite(n) ? `${(n * 100).toFixed(2)}%` : '-'; }

// derive a few metrics used here
const finalValues = props.results?.simulations?.map((s: number[]) => s[s.length-1]) || [];
// VaR(5%) is the 5th percentile (worst 5% outcomes)
const valueAtRisk5 = finalValues.length ? percentile(finalValues, 5) : 0;

// Calculate per-simulation CAGR from portfolio returns (if available)
const perSimCagrs = (props.results?.portfolioReturns ?? []).map((sim: number[]) => annualizedReturn(sim)).filter((v: number) => Number.isFinite(v));
const medianReturn = perSimCagrs.length ? perSimCagrs.sort((a: number, b: number) => a - b)[Math.floor(perSimCagrs.length / 2)] : (props.results?.summary?.medianAnnualizedReturn ? props.results.summary.medianAnnualizedReturn / 100 : NaN);
const returnVolatility = standardDeviation(perSimCagrs);
// Read risk-free rate from scenario inputs (Portfolio settings). Support several field names.
const numericSharpe = computed(() => {
  const inputs = props.results?.inputs ?? {};
  const candidates = [inputs.riskFreeRate, inputs.riskFreeRatePct, inputs.riskFreePct, inputs.riskFree];
  let pct: number | undefined;
  for (const c of candidates) { if (c != null) { pct = Number(c); break; } }
  let rf = 0.02; // default 2% as decimal
  if (pct != null && !Number.isNaN(pct)) {
    rf = pct > 1 ? pct / 100 : pct; // if stored as percent (2) convert to decimal
  }
  // Use the same metric as the Statistical Summary: median (50th) of per-simulation Sharpe
  return sharpePercentile(props.results?.portfolioReturns ?? [], 50, rf);
});

const numericSortino = computed(() => {
  const inputs = props.results?.inputs ?? {};
  const candidates = [inputs.riskFreeRate, inputs.riskFreeRatePct, inputs.riskFreePct, inputs.riskFree];
  let pct: number | undefined;
  for (const c of candidates) { if (c != null) { pct = Number(c); break; } }
  let rf = 0.02;
  if (pct != null && !Number.isNaN(pct)) {
    rf = pct > 1 ? pct / 100 : pct;
  }
  return perSimCagrs.length ? sortinoRatio(perSimCagrs, rf) : NaN;
});
</script>

<template>
  <h3 class="text-lg font-semibold">Risk & Policy Compliance</h3>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
        <h4 class="text-sm font-semibold text-gray-900 mb-2">Investment Risk</h4>
        <div class="text-sm text-gray-700 space-y-3">
          <!-- Value at Risk -->
          <MetricItem
            label="Value at Risk (5%)"
            :value="formatMoney(valueAtRisk5)"
            tip="The 5th percentile of final endowment values across simulations — 5% of simulations fall below this value."
            id="tt-var-5"
          />

          <!-- Annualized Volatility -->
          <MetricItem
            label="Annualized Volatility"
            :value="returnVolatility ? returnVolatility : '—'"
            tip="Standard deviation of annualized returns across simulations (higher = more variability)."
            id="tt-vol"
          />

          <!-- Sharpe -->
          <MetricItem
            label="Sharpe ratio (median)"
            :value="Number.isFinite(numericSharpe) ? numericSharpe : '—'"
            tip="Sharpe is computed per simulation as (annualized return − risk‑free) / volatility. Card shows the median across simulations; the Statistical Summary table shows percentiles."
            id="tt-sharpe"
          />

          <!-- Sortino -->
          <MetricItem
            label="Sortino Ratio"
            :value="Number.isFinite(numericSortino) ? numericSortino : '—'"
            tip="Sortino uses downside deviation relative to the risk-free target; higher is better."
            id="tt-sortino"
          />

          <!-- Stress -->
          <MetricItem
            label="Stress Test (2008 Scenario)"
            value="—"
            tip="Result under a historical 2008-like stress scenario (if available)."
            id="tt-stress"
          />
        </div>
      </div>
    <div class="p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
      <h4 class="text-sm font-semibold text-gray-900 mb-2">Spending Policy Compliance</h4>
      <ul class="text-sm text-gray-700 space-y-2">
      <p class="text-sm text-gray-700">Policy Target: <strong>{{ (props.results?.inputs?.spendingPolicyRate ?? 0) * 100 }}%</strong></p>
      <p class="text-sm text-text-secondary mt-2">Actual metrics and probability of violation shown in detailed view.</p>
        </ul>
    </div>
  </div>
</template>
