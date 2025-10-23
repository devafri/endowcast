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
// Use annualized volatility from summary (already computed and stored as percentage)
let annualizedVolatilityPct = props.results?.summary?.annualizedVolatility ?? NaN;
// Fallback: if summary doesn't have it but we have portfolio returns, compute it
if (!isFinite(annualizedVolatilityPct) && perSimCagrs.length > 0) {
  annualizedVolatilityPct = standardDeviation(perSimCagrs) * 100;
}
const returnVolatility = isFinite(annualizedVolatilityPct) ? `${annualizedVolatilityPct.toFixed(2)}%` : '—';
// Risk-free rate: prefer from current inputs, fall back to summary (handles user scenario updates post-simulation)
const inputs = props.results?.inputs ?? {};
const candidates = [inputs.riskFreeRate, inputs.riskFreeRatePct, inputs.riskFreePct, inputs.riskFree];
let riskFreeRatePct: number = 2;
for (const c of candidates) { if (c != null) { riskFreeRatePct = Number(c); break; } }
if (Number.isNaN(riskFreeRatePct)) {
  riskFreeRatePct = props.results?.summary?.riskFreeRate ?? 2;
}
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
            <div class="rounded-lg border border-slate-200 bg-white p-4 order-last xl:order-first"> <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold">Simulation Inputs</h3>
            <span class="chip bg-slate-100 text-slate-700">Assumptions</span>
          </div>
          <div class="text-sm text-gray-700 space-y-3">
                                  <!-- Initial Endowment -->
          <MetricItem
            label="Initial Endowment"
            :value="`${inputs.initialEndowment?.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }) ?? '$0'}`"
            tip="The initial amount of the endowment fund."
            id="tt-initial-endowment"
          />
            <!-- Horizon (years) -->
          <MetricItem
            label="Horizon (years)"
            :value="`${props.results?.yearLabels?.length ? props.results.yearLabels.length - 1 : '—'}`"
            tip="The number of years the simulation was run."
            id="tt-horizon-years"
          />
            <!-- Simulations -->
            <MetricItem
            label="Simulations"
            :value="`${props.results?.simulations?.length ?? 0}`"
            tip="The number of simulation runs performed."
            id="tt-simulations"
          />
            <!-- Spending Rate -->
          <MetricItem
            label="Spending Rate"
            :value="`${inputs.spendingPolicyRate != null ? inputs.spendingPolicyRate.toFixed(1) + '%' : '—'}`"
            tip="The percentage of the endowment spent each year."
            id="tt-spending-rate"
          />
            <!-- Investment Expense Rate -->
          <MetricItem
            label="Investment Expense Rate"
            :value="`${inputs.investmentExpenseRate != null ? inputs.investmentExpenseRate.toFixed(1) + '%' : '—'}`"
            tip="The annual percentage cost of investment management."
            id="tt-investment-expense-rate"
          />
          <!-- Risk-Free Rate -->
          <MetricItem
            label="Risk-Free Rate"
            :value="`${riskFreeRatePct.toFixed(1)}%`"
            tip="The assumed risk-free rate used in Sharpe and Sortino calculations."
            id="tt-risk-free"
          />
            <!-- Inflation (for preservation) -->
          <MetricItem
            label="Inflation (for preservation)"
            :value="`${inputs.inflationRate != null ? inputs.inflationRate.toFixed(2) + '%' : '—'}`"
            tip="The assumed annual inflation rate used for corpus preservation calculations."
            id="tt-inflation-rate"
          />
          </div>
          <footer class="text-xs text-slate-500 mt-4 pt-3 border-t">
            Generated: <span id="gen-time">—</span>
          </footer>
        </div>
</template>