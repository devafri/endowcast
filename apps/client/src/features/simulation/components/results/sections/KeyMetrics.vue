<script setup lang="ts">
// @ts-nocheck
import { computed } from 'vue';
import { medianFinalValue, probabilityOfLoss, medianAnnualizedReturnFromReturns, medianAnnualizedVolatility, sharpePercentile, sortinoRatio, medianMaxDrawdown, calculateRiskMetrics, inflationAdjustedPreservation, percentile } from '@/features/simulation/lib/analytics';

const props = defineProps<{ results: any }>();

// Define a placeholder for the current year. In a production app, this would be dynamic.
// Using a fixed year for calculation stability in this component.
const CURRENT_YEAR = 2025; 

// Helpers / derived metrics (prefer precomputed summary values, fallback to local calc)
const sims = computed(() => props.results?.simulations ?? []);
const portfolioReturns = computed(() => props.results?.portfolioReturns ?? []);

// --- New Computed Properties ---

const horizonYear = computed(() => {
    // Get the simulation horizon from inputs
    return props.results?.inputs?.horizon ?? props.results?.yearLabels?.length ?? null;
});

const finalYear = computed(() => {
    const horizon = horizonYear.value;
    if (horizon == null || !isFinite(horizon)) return '—';
    // Calculate the final calendar year (assuming simulation starts at the beginning of CURRENT_YEAR)
    return CURRENT_YEAR + horizon;
});

const medianFinal = computed(() => {
  if (props.results?.summary?.medianFinalValue != null) return props.results.summary.medianFinalValue;
  if (!sims.value.length) return null;
  return medianFinalValue(sims.value as number[][]);
});

const realFinalMedian = computed(() => {
  const nominalMedian = medianFinal.value;
  const years = horizonYear.value;
  
  if (nominalMedian == null || !isFinite(nominalMedian) || years == null || years === 0) return null;

  // Use the Risk-Free Rate as the inflation proxy, as is standard practice in this model 
  const rfVal = props.results?.summary?.riskFreeRate ?? props.results?.inputs?.riskFreeRate ?? null;
  if (rfVal == null) return null;
  
  const inflationRate = (isFinite(rfVal) ? rfVal : 2) / 100; // Use 2% default if rate is null/NaN
  const inflationFactor = Math.pow(1 + inflationRate, years);
  
  const realValue = nominalMedian / inflationFactor;

  return isFinite(realValue) ? realValue : null;
});

// --- Existing Computed Properties (Retained for completeness) ---

const probabilityOfLossComputed = computed(() => {
  if (props.results?.summary?.probabilityOfLoss != null) return props.results.summary.probabilityOfLoss;
  const initial = props.results?.inputs?.initialEndowment ?? NaN;
  if (!sims.value.length || !isFinite(initial)) return null;
  return probabilityOfLoss(sims.value as number[][], initial);
});

const riskMetrics = computed(() => {
  const initial = props.results?.inputs?.initialEndowment ?? NaN;
  if (!sims.value.length || !isFinite(initial)) return null;
  const rfVal = props.results?.summary?.riskFreeRate ?? props.results?.inputs?.riskFreeRate ?? 2;
  const rfPct = isFinite(rfVal) ? rfVal : 2;
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

const finalValues = computed(() => {
  const simsArr = sims.value || [];
  if (!simsArr.length) return [] as number[];
  const Y = simsArr[0]?.length ?? 0;
  return simsArr.map(s => s[Y - 1]).filter(isFinite);
});

const finalP10 = computed(() => {
  const vals = finalValues.value;
  return vals.length ? percentile(vals, 10) : null;
});

const finalP90 = computed(() => {
  const vals = finalValues.value;
  return vals.length ? percentile(vals, 90) : null;
});

const inflationPreservationPct = computed(() => {
  const initial = props.results?.inputs?.initialEndowment ?? NaN;
  if (!sims.value.length || !isFinite(initial)) return null;
  const years = sims.value[0]?.length ?? (props.results?.yearLabels?.length ?? 10);
  const finalValues = sims.value.map(sim => sim[sim.length - 1]);
  const medianFinal = percentile(finalValues, 50);
  const rfVal = props.results?.summary?.riskFreeRate ?? props.results?.inputs?.riskFreeRate ?? 2;
  const rfPct = isFinite(rfVal) ? rfVal : 2;
  const inflationRate = rfPct / 100;
  const inflationFactor = Math.pow(1 + inflationRate, years);
  const val = medianFinal / (initial * inflationFactor);
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
  const rfVal = props.results?.summary?.riskFreeRate ?? props.results?.inputs?.riskFreeRate ?? 2;
  const rfPct = isFinite(rfVal) ? rfVal : 2;
  const rf = rfPct > 1 ? rfPct / 100 : rfPct;
  const val = sharpePercentile(portfolioReturns.value as number[][], 50, rf);
  return isFinite(val) ? val : null;
});

const sortinoValue = computed(() => {
  if (props.results?.summary?.sortino != null) return props.results.summary.sortino;
  const rm = riskMetrics.value;
  if (rm && isFinite(rm.sortino)) return rm.sortino;
  const rfVal = props.results?.summary?.riskFreeRate ?? props.results?.inputs?.riskFreeRate ?? 2;
  const rfPct = isFinite(rfVal) ? rfVal : 2;
  const rf = rfPct > 1 ? rfPct / 100 : rfPct;
  // Compute Sortino for each simulation and take the 50th percentile
  const sortinoValues = portfolioReturns.value.map((r: number[]) => {
    try {
      return sortinoRatio(r, rf);
    } catch {
      return NaN;
    }
  }).filter(isFinite);
  if (!sortinoValues.length) return null;
  return percentile(sortinoValues, 50);
});

// Expose used values to template
defineExpose({ medianAnnualizedReturnPct, annualizedVolatilityPct, sharpeMedian, sortinoValue, medianMDDPct, cvar95Value, cvar95LossPct, inflationPreservationPct, medianFinal, probabilityOfLossComputed, formatMoney, pctStr, finalP10, finalP90, realFinalMedian, horizonYear, finalYear });
</script>
<template>
            <div class="xl:col-span-3 bg-white shadow-md rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-bold text-slate-800">Key Metrics (Monte Carlo — Annualized)</h2>
              <div class="rounded-md chip bg-slate-200 text-slate-700 text-xs px-2 py-1">Stochastic outputs</div>
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
              <div class="text-sm font-semibold text-blue-700 mb-1 flex items-center">
                <span>Expected Return (μ)</span>
                <div class="relative group cursor-help ml-1">
                    <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
                        The average yearly growth rate of the endowment across all possible scenarios
                    </div>
                </div>
              </div>
                            <div id="er-value" class="text-4xl font-extrabold tabnums text-blue-600">{{ medianAnnualizedReturnPct !== null ? `${medianAnnualizedReturnPct.toFixed(2)}%` : '—' }}</div>
              <div class="text-xs text-slate-500 mt-2">Annualized mean return across all paths.</div>
            </div>
            <div class="rounded-xl p-4 primary-metric">
              <div class="text-sm font-semibold text-blue-700 mb-1 flex items-center">
                <span>Volatility (σ)</span>
                <div class="relative group cursor-help ml-1">
                    <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
                        How much the endowment's value tends to swing up and down each year
                    </div>
                </div>
              </div>
              <div id="vol-value" class="text-4xl font-extrabold tabnums text-blue-600">{{ annualizedVolatilityPct !== null ? `${annualizedVolatilityPct.toFixed(2)}%` : '—' }}</div>
              <div class="text-xs text-slate-500 mt-2">Annualized standard deviation.</div>
            </div>
            <div class="rounded-xl p-4 primary-metric">
              <div class="text-sm font-semibold text-blue-700 mb-1 flex items-center">
                <span>Sharpe Ratio</span>
                <div class="relative group cursor-help ml-1">
                    <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
                        A measure of how much extra return you get for each unit of risk taken. Higher values mean better risk-adjusted performance.
                    </div>
                </div>
              </div>
              <div id="sharpe-value" class="text-4xl font-extrabold tabnums text-blue-600">{{ sharpeMedian !== null ? sharpeMedian.toFixed(2) : '—' }}</div>
              <div class="text-xs text-slate-500 mt-2">Excess return per unit of total risk (σ).</div>
            </div>
          </div>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="rounded-lg border border-slate-200 bg-white p-3">
              <div class="text-xs text-slate-500 mb-1 flex items-center">
                <span>Sortino Ratio</span>
                <div class="relative group cursor-help ml-1">
                    <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
                        Similar to Sharpe ratio but focuses on downside risk (losses) rather than overall volatility. Higher values indicate better performance relative to bad outcomes.
                    </div>
                </div>
              </div>
              <div id="sortino-value" class="text-xl font-semibold tabnums">{{ sortinoValue != null && isFinite(sortinoValue) ? sortinoValue.toFixed(2) : '—' }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 bg-white p-3">
              <div class="text-xs text-slate-500 mb-1 flex items-center">
                <span>Median Max Drawdown</span>
                <div class="relative group cursor-help ml-1">
                    <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
                        The biggest drop in value from its highest point to lowest point in the worst-case scenarios
                    </div>
                </div>
              </div>
              <div id="mdd-value" class="text-xl font-semibold tabnums">{{ medianMDDPct !== null ? `${medianMDDPct.toFixed(2)}%` : '—' }}</div>
            </div>
            <div class="rounded-lg border border-slate-200 bg-white p-3">
              <div class="text-xs text-slate-500 mb-1 flex items-center">
                <span>CVaR 95% (Final / Loss)</span>
                <div class="relative group cursor-help ml-1">
                    <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
                        The average loss in the worst 5% of possible scenarios
                    </div>
                </div>
              </div>
              <div id="cvar-value" class="text-xl font-semibold tabnums">
                {{ cvar95Value !== null && isFinite(cvar95Value) ? formatMoney(cvar95Value) : '—' }}
                <div class="text-xs text-slate-400">{{ cvar95LossPct !== null ? `Loss vs initial: ${cvar95LossPct.toFixed(2)}%` : '' }}</div>
              </div>
            </div>
            <div class="rounded-lg border border-slate-200 bg-white p-3">
              <div class="text-xs text-slate-500 mb-1 flex items-center">
                <span>Inflation‑Adjusted Preservation</span>
                <div class="relative group cursor-help ml-1">
                    <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                    <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
                        How much of the original money is left after accounting for rising prices over time (using the risk-free rate as inflation proxy). Important for boards because it shows if the endowment can maintain its purchasing power, ensuring funds last longer in real terms despite inflation.
                    </div>
                </div>
              </div>
              <div id="mfe-preservation" class="text-xl font-semibold tabnums text-emerald-600">{{ inflationPreservationPct !== null ? `${inflationPreservationPct.toFixed(1)}%` : '—' }}</div>
            </div>

            <div class="rounded-lg border border-slate-200 bg-white p-3 md:col-span-3">
              <div class="flex items-start justify-between">
                <div>
                  <div class="text-sm font-medium text-slate-600 mb-1 flex items-center">
                    <span>Median Final Endowment (Year <span id="mfe-year">{{ finalYear }}</span>)</span>
                    <div class="relative group cursor-help ml-1">
                        <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                        </svg>
                        <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
                            The middle value of the endowment at the end of the simulation period
                        </div>
                    </div>
                  </div>
                  <div class="text-2xl font-bold tabnums text-blue-600" id="mfe-nominal">{{ formatMoney(medianFinal) }}</div>
                  <div class="text-sm text-slate-500">
                    Real (today’s $): <span class="font-semibold tabnums" id="mfe-real">{{ realFinalMedian !== null ? formatMoney(realFinalMedian) : '—' }}</span>
                  </div>
                </div>
                <div class="text-right space-y-1 pt-1">
                    <div class="text-sm text-slate-500 font-semibold flex items-center">
                      <span>Final Value 10 – 90% band</span>
                      <div class="relative group cursor-help ml-1">
                        <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                        </svg>
                        <div class="absolute z-20 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-2 -ml-40 whitespace-normal">
                            The range from the lowest 10% to the highest 10% of possible final values (excluding the extreme outcomes)
                        </div>
                      </div>
                    </div>
                    <div class="font-medium tabnums text-sm text-blue-600" id="mfe-band">
                      {{ finalP10 !== null && finalP90 !== null ? `${formatMoney(finalP10)} — ${formatMoney(finalP90)}` : '—' }}
                    </div>

                </div>
              </div>
            </div>
          </div>
        </div>
</template>