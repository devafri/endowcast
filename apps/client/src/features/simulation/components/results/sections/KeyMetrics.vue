<script setup lang="ts">
// @ts-nocheck
import { computed } from 'vue';
import { medianFinalValue, probabilityOfLoss, medianAnnualizedReturnFromReturns, medianAnnualizedVolatility, sharpePercentile, sortinoRatio, medianMaxDrawdown, calculateRiskMetrics, inflationAdjustedPreservation } from '@/features/simulation/lib/analytics';

const props = defineProps<{ results: any }>();

// Helpers / derived metrics (prefer precomputed summary values, fallback to local calc)
const sims = computed(() => props.results?.simulations ?? []);
const portfolioReturns = computed(() => props.results?.portfolioReturns ?? []);

const medianFinal = computed(() => {
  if (props.results?.summary?.medianFinalValue != null) return props.results.summary.medianFinalValue;
  if (!sims.value.length) return null;
  return medianFinalValue(sims.value as number[][]);
});

const probabilityOfLossComputed = computed(() => {
  if (props.results?.summary?.probabilityOfLoss != null) return props.results.summary.probabilityOfLoss;
  const initial = props.results?.inputs?.initialEndowment ?? NaN;
  if (!sims.value.length || !isFinite(initial)) return null;
  return probabilityOfLoss(sims.value as number[][], initial);
});

// Compute richer risk metrics via calculateRiskMetrics when possible
const riskMetrics = computed(() => {
  const initial = props.results?.inputs?.initialEndowment ?? NaN;
  if (!sims.value.length || !isFinite(initial)) return null;
  const rfPct = props.results?.summary?.riskFreeRate ?? props.results?.inputs?.riskFreeRate ?? 2;
  const rf = rfPct > 1 ? rfPct / 100 : rfPct;
  try {
    return calculateRiskMetrics(sims.value as number[][], initial, portfolioReturns.value as number[][], undefined, props.results?.spendingPolicy as number[][], initial, rf);
  } catch (e) {
    return null;
  }
});

const medianMDDPct = computed(() => {
  if (props.results?.summary?.medianMaxDrawdown != null) return props.results.summary.medianMaxDrawdown * 100;
  const val = medianMaxDrawdown(sims.value as number[][]);
  return isFinite(val) ? val * 100 : null;
});

const cvar95Value = computed(() => {
  if (props.results?.summary?.cvar95 != null) return props.results.summary.cvar95;
  return riskMetrics.value?.cvar95 ?? null;
});

const cvar95LossPct = computed(() => {
  const initial = props.results?.inputs?.initialEndowment ?? NaN;
  const cvar = cvar95Value.value;
  if (!isFinite(initial) || cvar == null || !isFinite(cvar)) return null;
  return ((initial - cvar) / initial) * 100;
});

const inflationPreservationPct = computed(() => {
  if (props.results?.summary?.inflationAdjustedPreservation != null) return props.results.summary.inflationAdjustedPreservation * 100;
  const initial = props.results?.inputs?.initialEndowment ?? NaN;
  if (!sims.value.length || !isFinite(initial)) return null;
  const years = sims.value[0]?.length ?? (props.results?.yearLabels?.length ?? 10) ;
  const val = inflationAdjustedPreservation(sims.value as number[][], initial, years, 0.03);
  return isFinite(val) ? val * 100 : null;
});

function formatMoney(num: number | null | undefined) {
  if (num == null || !isFinite(num)) return '—';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function pctStr(n: number | null | undefined) { return n == null || !isFinite(n) ? '—' : `${n.toFixed(2)}%`; }

const medianAnnualizedReturnPct = computed(() => {
  if (props.results?.summary?.medianAnnualizedReturn != null) return props.results.summary.medianAnnualizedReturn; // percent
  const rm = riskMetrics.value;
  if (rm && isFinite(rm.medianCagr)) return rm.medianCagr * 100;
  const val = medianAnnualizedReturnFromReturns(portfolioReturns.value as number[][]);
  return isFinite(val) ? val * 100 : null;
});

const annualizedVolatilityPct = computed(() => {
  if (props.results?.summary?.annualizedVolatility != null) return props.results.summary.annualizedVolatility; // percent
  const val = medianAnnualizedVolatility(portfolioReturns.value as number[][], 12, true);
  return isFinite(val) ? val * 100 : null;
});

const sharpeMedian = computed(() => {
  if (props.results?.summary?.sharpeMedian != null) return props.results.summary.sharpeMedian;
  const rfPct = props.results?.summary?.riskFreeRate ?? props.results?.inputs?.riskFreeRate ?? 2; // percent
  const rf = rfPct > 1 ? rfPct / 100 : rfPct;
  const val = sharpePercentile(portfolioReturns.value as number[][], 50, rf);
  return isFinite(val) ? val : null;
});

const sortinoValue = computed(() => {
  if (props.results?.summary?.sortino != null) return props.results.summary.sortino;
  const rm = riskMetrics.value;
  if (rm && isFinite(rm.sortino)) return rm.sortino;
  const rfPct = props.results?.summary?.riskFreeRate ?? props.results?.inputs?.riskFreeRate ?? 2; // percent
  const rf = rfPct > 1 ? rfPct / 100 : rfPct;
  const perSimCagrs = portfolioReturns.value.map((r: number[]) => {
    const v = medianAnnualizedReturnFromReturns([r]);
    return isFinite(v) ? v : NaN;
  }).filter(isFinite);
  if (!perSimCagrs.length) return null;
  try { return sortinoRatio(perSimCagrs, rf); } catch { return null; }
});

// Expose used values to template (helps language server template type-checking)
defineExpose({ medianAnnualizedReturnPct, annualizedVolatilityPct, sharpeMedian, sortinoValue, medianMDDPct, cvar95Value, cvar95LossPct, inflationPreservationPct, medianFinal, probabilityOfLossComputed, formatMoney, pctStr });
</script>
<template>
            <div class="xl:col-span-3">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-bold">Key Metrics (Monte Carlo — Annualized)</h2>
              <span class="chip bg-slate-100 text-slate-700">Stochastic outputs</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-slate-500">Display:</span>
              <label class="inline-flex items-center gap-2 text-sm">
                <input id="toggle-real" type="checkbox" class="accent-blue-600">
                <span>Real (today’s $)</span>
              </label>
            </div>
          </div>
            

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="rounded-xl p-4 primary-metric">
              <div class="text-sm font-semibold text-blue-700 mb-1">Expected Return (μ)</div>
              <div id="er-value" class="text-4xl font-extrabold tabnums text-blue-600">{{ medianAnnualizedReturnPct !== null ? `${medianAnnualizedReturnPct.toFixed(2)}%` : '—' }}</div>
              <div class="text-xs text-slate-500 mt-2">Annualized mean return across all paths.</div>
            </div>
            <div class="rounded-xl p-4 primary-metric">
              <div class="text-sm font-semibold text-blue-700 mb-1">Volatility (σ)</div>
              <div id="vol-value" class="text-4xl font-extrabold tabnums text-blue-600">{{ annualizedVolatilityPct !== null ? `${annualizedVolatilityPct.toFixed(2)}%` : '—' }}</div>
              <div class="text-xs text-slate-500 mt-2">Annualized standard deviation.</div>
            </div>
            <div class="rounded-xl p-4 primary-metric">
              <div class="text-sm font-semibold text-blue-700 mb-1">Sharpe Ratio</div>
              <div id="sharpe-value" class="text-4xl font-extrabold tabnums text-blue-600">{{ sharpeMedian !== null ? sharpeMedian.toFixed(2) : '—' }}</div>
              <div class="text-xs text-slate-500 mt-2">Excess return per unit of total risk (σ).</div>
            </div>
          </div>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="rounded-lg border border-slate-200 bg-white p-3">
              <div class="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <span>Sortino Ratio</span>
                <span title="(Mean Excess Return) / (Downside Deviation vs Risk-free)" class="text-slate-400">ⓘ</span>
              </div>
              <div id="sortino-value" class="text-xl font-semibold tabnums">{{ sortinoValue !== null ? sortinoValue.toFixed(2) : '—' }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 bg-white p-3">
              <div class="text-xs text-slate-500 mb-1">Median Max Drawdown</div>
              <div id="mdd-value" class="text-xl font-semibold tabnums">{{ medianMDDPct !== null ? `${medianMDDPct.toFixed(2)}%` : '—' }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 bg-white p-3">
              <div class="text-xs text-slate-500 mb-1">CVaR 95% (Final / Loss)</div>
              <div id="cvar-value" class="text-xl font-semibold tabnums">{{ cvar95Value !== null && isFinite(cvar95Value) ? formatMoney(cvar95Value) : '—' }}
                <div class="text-xs text-slate-400">{{ cvar95LossPct !== null ? `Loss vs initial: ${cvar95LossPct.toFixed(2)}%` : '' }}</div>
              </div>
            </div>
            <div class="rounded-lg border border-slate-200 bg-white p-3">
              <div class="text-xs text-slate-500 mb-1">Inflation‑Adjusted Preservation</div>
              <div id="mfe-preservation" class="text-xl font-semibold tabnums text-emerald-600">{{ inflationPreservationPct !== null ? `${inflationPreservationPct.toFixed(1)}%` : '—' }}</div>
            </div>

            <div class="rounded-lg border border-slate-200 bg-white p-3 md:col-span-2">
              <div class="flex items-start justify-between">
                <div>
                  <div class="text-sm font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <span>Median Final Endowment (Year <span id="mfe-year">—</span>)</span>
                
                  </div>
                  <div class="text-2xl font-bold tabnums text-slate-800" id="mfe-nominal">{{ formatMoney(medianFinal) }}</div>
                  <div class="text-sm text-slate-500">
                    Real (today’s $): <span class="font-semibold tabnums" id="mfe-real">—</span>
                  </div>
                </div>
                <div class="text-right space-y-1 pt-1">
                  <div class="text-xs text-slate-500">Final Value 10–90% band</div>
                  <div class="font-medium tabnums text-sm" id="mfe-band">—</div>
                </div>
              </div>
            </div>
          </div>
        </div>
</template>