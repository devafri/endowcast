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

const percentiles = [90, 75, 50, 25, 10];
const rows = percentiles.map(p => ({
  label: p === 50 ? 'Median (50th)' : `${p}th`,
  finalValue: percentile(finalValues, p),
  annReturn: percentile(perSimGeo, p),
  annVol: percentile(perSimVol, p),
}));

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
const corpusRow = showCorpus ? {
  finalValue: percentile(corpusFinals, 50),
  annReturn: percentile(corpusGeo, 50),
  annVol: percentile(corpusVol, 50),
} : { finalValue: NaN, annReturn: NaN, annVol: NaN };

const lossProb = props.results?.summary?.probabilityOfLoss ?? 0;
</script>

<template>
  <div class="card p-4 sm:p-6">
    <h3 class="section-title mb-4">Statistical Summary</h3>
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="text-text-secondary uppercase text-sm border-b border-border">
            <th class="py-3 px-6 text-left">Percentile</th>
            <th class="py-3 px-6 text-left">Final Value</th>
            <th class="py-3 px-6 text-left">Annualized Return</th>
            <th class="py-3 px-6 text-left">Annualized Volatility</th>
          </tr>
        </thead>
        <tbody class="text-sm font-light">
          <tr v-for="row in rows" :key="row.label" class="border-b border-border">
            <td class="py-3 px-6">{{ row.label }}</td>
            <td class="py-3 px-6">{{ formatMoney(row.finalValue) }}</td>
            <td class="py-3 px-6">{{ formatPct(row.annReturn) }}</td>
            <td class="py-3 px-6">{{ formatPct(row.annVol) }}</td>
          </tr>
          <tr v-if="showCorpus" class="border-b border-border" style="background:#E8DCD6;">
            <td class="py-3 px-6 font-medium">Corpus</td>
            <td class="py-3 px-6">{{ formatMoney(corpusRow.finalValue) }}</td>
            <td class="py-3 px-6">{{ formatPct(corpusRow.annReturn) }}</td>
            <td class="py-3 px-6">{{ formatPct(corpusRow.annVol) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="text-center mt-6">
      <span class="text-base font-semibold">Probability of falling below initial value: </span>
      <span class="text-danger text-base font-semibold">{{ (lossProb * 100).toFixed(2) }}%</span>
    </div>
  </div>
  
</template>
