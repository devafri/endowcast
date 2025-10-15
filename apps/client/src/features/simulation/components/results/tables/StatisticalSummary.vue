<script setup lang="ts">
import { sharpePercentile, perSimulationSharpe } from '@/features/simulation/lib/analytics';
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
function percentile(values: number[], p: number) {
  if (!values?.length) return NaN;
  const sorted = [...values].sort((a,b)=>a-b);
  const idx = Math.floor((p/100) * (sorted.length - 1));
  return sorted[idx];
}
function geoMean(returns: number[]) {
  if (!returns?.length) return NaN;
  let prod = 1;
  for (const r of returns) prod *= (1 + r);
  return Math.pow(prod, 1 / returns.length) - 1;
}
function stdev(returns: number[]) {
  if (!returns?.length) return NaN;
  const mean = returns.reduce((a,b)=>a+b,0) / returns.length;
  const varp = returns.reduce((a,b)=>a + Math.pow(b-mean, 2), 0) / (returns.length - 1 || 1);
  return Math.sqrt(varp);
}

const years: number = props.results?.simulations?.[0]?.length ?? 10;
const finalValues: number[] = (props.results?.simulations ?? []).map((s: number[]) => s[years - 1]);
const perSimGeo: number[] = (props.results?.portfolioReturns ?? []).map((rets: number[]) => geoMean(rets)).filter((x: number) => isFinite(x));
const perSimVol: number[] = (props.results?.portfolioReturns ?? []).map((rets: number[]) => stdev(rets)).filter((x: number) => isFinite(x));

// determine risk free decimal from inputs
function readRfDecimal(inputs: any) {
  const candidates = [inputs?.riskFreeRate, inputs?.riskFreeRatePct, inputs?.riskFreePct, inputs?.riskFree];
  let pct: number | undefined;
  for (const c of candidates) { if (c != null) { pct = Number(c); break; } }
  let rf = 0.02;
  if (pct != null && !Number.isNaN(pct)) rf = pct > 1 ? pct / 100 : pct;
  return rf;
}

const percentiles = [90, 75, 50, 25, 10];
function formatSharpe(s: number) {
  if (!isFinite(s)) return '-';
  return s.toFixed(2);
}

const rows = percentiles.map(p => {
  const annR = percentile(perSimGeo, p);
  const annV = percentile(perSimVol, p);
  // Sharpe percentile computed using shared helper (reads per-simulation sharpe internally)
  const rf = readRfDecimal(props.results?.inputs ?? {});
  const sharpe = sharpePercentile(props.results?.portfolioReturns ?? [], p, rf);
  return {
    label: p === 50 ? 'Median (50th)' : `${p}th`,
    finalValue: percentile(finalValues, p),
    annReturn: annR,
    annVol: annV,
    sharpe,
  };
});

// Corpus row derived from corpusPaths
function pathToReturns(path: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < path.length; i++) out.push(path[i] / path[i-1] - 1);
  return out;
}
const corpusPaths: number[][] = (props.results?.corpusPaths ?? []).filter((p: number[]) => Array.isArray(p) && p.every(v => isFinite(v)));
const corpusEnabled = props.results?.corpus?.enabled !== false;
const showCorpus = corpusEnabled && corpusPaths.length > 0;
const corpusFinals = showCorpus ? corpusPaths.map(p => p[p.length - 1]) : [];
const corpusGeo = showCorpus ? corpusPaths.map(p => geoMean(pathToReturns(p))).filter((x: number)=>isFinite(x)) : [];
const corpusVol = showCorpus ? corpusPaths.map(p => stdev(pathToReturns(p))).filter((x: number)=>isFinite(x)) : [];
const corpusRow = showCorpus ? (() => {
  const annR = percentile(corpusGeo, 50);
  const annV = percentile(corpusVol, 50);
  // For corpus, compute sharpe from the corpus path returns
  const sharpe = (() => {
    const cr = corpusPaths.map(p => pathToReturns(p));
    const rf = readRfDecimal(props.results?.inputs ?? {});
    const perPathSharpe = cr.map(rets => {
      // reuse per-simulation style calculation for path returns
      const rr = geoMean(rets);
      const vv = stdev(rets);
      return (isFinite(rr) && isFinite(vv) && vv !== 0) ? (rr - rf) / vv : NaN;
    }).filter(x => isFinite(x));
    return perPathSharpe.length ? percentile(perPathSharpe, 50) : NaN;
  })();
  return {
    finalValue: percentile(corpusFinals, 50),
    annReturn: annR,
    annVol: annV,
    sharpe,
  };
})() : { finalValue: NaN, annReturn: NaN, annVol: NaN, sharpe: NaN };

const lossProb = props.results?.summary?.probabilityOfLoss ?? 0;
</script>

<template>
  <div class="p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-md">
    <h3 class="text-xl font-bold mb-4 text-gray-800">Statistical Summary</h3>
    <div class="overflow-x-auto rounded-lg border border-gray-100">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            <th 
              v-for="row in rows" 
              :key="row.label" 
              class="py-3 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20"
            >
              {{ row.label }}
            </th>
            <th 
              v-if="showCorpus" 
              class="py-3 px-3 text-center text-xs font-bold text-orange-700 uppercase tracking-wider min-w-20 bg-orange-100"
            >
              Corpus
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr class="bg-blue-50 hover:bg-blue-100 transition duration-150 ease-in-out">
            <td class="py-3 px-4 font-semibold text-sm text-blue-800 whitespace-nowrap">Final Value</td>
            <td 
              v-for="row in rows" 
              :key="'final-' + row.label" 
              class="py-3 px-3 text-center text-sm font-medium text-gray-800 whitespace-nowrap"
            >
              {{ formatMoney(row.finalValue) }}
            </td>
            <td 
              v-if="showCorpus" 
              class="py-3 px-3 text-center text-sm font-bold text-orange-800 bg-orange-50 whitespace-nowrap"
            >
              {{ formatMoney(corpusRow.finalValue) }}
            </td>
          </tr>
          <tr class="bg-white hover:bg-gray-50 transition duration-150 ease-in-out">
            <td class="py-3 px-4 font-semibold text-sm text-gray-900 whitespace-nowrap">Annualized Return</td>
            <td 
              v-for="row in rows" 
              :key="'return-' + row.label" 
              class="py-3 px-3 text-center text-sm text-gray-700 whitespace-nowrap"
            >
              {{ formatPct(row.annReturn) }}
            </td>
            <td 
              v-if="showCorpus" 
              class="py-3 px-3 text-center text-sm text-orange-700 bg-orange-50 whitespace-nowrap"
            >
              {{ formatPct(corpusRow.annReturn) }}
            </td>
          </tr>
          <tr class="bg-white hover:bg-gray-50 transition duration-150 ease-in-out">
            <td class="py-3 px-4 font-semibold text-sm text-gray-900 whitespace-nowrap">Annualized Volatility</td>
            <td 
              v-for="row in rows" 
              :key="'vol-' + row.label" 
              class="py-3 px-3 text-center text-sm text-gray-700 whitespace-nowrap"
            >
              {{ formatPct(row.annVol) }}
            </td>
            <td 
              v-if="showCorpus" 
              class="py-3 px-3 text-center text-sm text-orange-700 bg-orange-50 whitespace-nowrap"
            >
              {{ formatPct(corpusRow.annVol) }}
            </td>
          </tr>
          <tr class="bg-white hover:bg-gray-50 transition duration-150 ease-in-out">
            <td class="py-3 px-4 font-semibold text-sm text-gray-900 whitespace-nowrap">Sharpe Ratio</td>
            <td 
              v-for="row in rows" 
              :key="'sharpe-' + row.label" 
              class="py-3 px-3 text-center text-sm text-gray-700 whitespace-nowrap"
            >
              {{ formatSharpe(row.sharpe) }}
            </td>
            <td 
              v-if="showCorpus" 
              class="py-3 px-3 text-center text-sm text-orange-700 bg-orange-50 whitespace-nowrap"
            >
              {{ formatSharpe(corpusRow.sharpe) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="text-center mt-6 p-3 bg-gray-50 rounded-md">
      <span class="text-base font-semibold text-gray-700">Probability of falling below initial value: </span>
      <span class="text-red-600 text-lg font-bold">{{ (lossProb * 100).toFixed(2) }}%</span>
    </div>
  </div>
</template>