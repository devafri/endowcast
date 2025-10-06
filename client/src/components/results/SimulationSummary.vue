<script setup lang="ts">
const props = defineProps<{ results: any }>();

function formatMoney(num: number): string {
  if (!isFinite(num)) return '-';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function pct(n: number) { return isFinite(n) ? `${(n * 100).toFixed(2)}%` : '-'; }

function median(arr: number[]) {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a,b)=>a-b);
  return s[Math.floor(s.length/2)];
}

// Totals over the horizon at median
const years = props.results?.simulations?.[0]?.length ?? 10;
const medEndVals = Array.from({length: years}, (_, i) => median(props.results.simulations.map((r: number[]) => r[i])));
const medOpEx = Array.from({length: years}, (_, i) => median(props.results.operatingExpenses.map((r: number[]) => r[i])));
const medGrants = Array.from({length: years}, (_, i) => median(props.results.grants.map((r: number[]) => r[i])));
const medInvest = Array.from({length: years}, (_, i) => median(props.results.investmentExpenses.map((r: number[]) => r[i])));
const medSpendPol = Array.from({length: years}, (_, i) => median(props.results.spendingPolicy.map((r: number[]) => r[i])));

const totalOpEx = medOpEx.reduce((a,b)=>a+(b||0),0);
const totalGrants = medGrants.reduce((a,b)=>a+(b||0),0);
const totalInvest = medInvest.reduce((a,b)=>a+(b||0),0);
const totalSpendPol = medSpendPol.reduce((a,b)=>a+(b||0),0);

const finalMed = medEndVals[medEndVals.length-1] || 0;
const startVal = props.results?.simulations?.[0]?.[0] ? median(props.results.simulations.map((s: number[]) => s[0])) : NaN;

</script>

<template>
  <div class="card p-4 sm:p-6">
    <h3 class="section-title mb-4">Simulation Summary</h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <div class="text-sm text-text-secondary">Median Annualized Return</div>
        <div class="text-2xl font-semibold">{{ (results?.summary?.annualizedReturn ?? 0).toFixed(2) }}%</div>
      </div>
      <div>
        <div class="text-sm text-text-secondary">Probability of Loss vs Initial</div>
        <div class="text-2xl font-semibold">{{ pct(results?.summary?.probabilityOfLoss ?? 0) }}</div>
      </div>
      <div>
        <div class="text-sm text-text-secondary">Median Final Value</div>
        <div class="text-2xl font-semibold text-accent">{{ formatMoney(results?.summary?.medianFinalValue ?? 0) }}</div>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="p-4 rounded-lg border border-border bg-white/50">
        <div class="text-xs text-text-secondary mb-1">Total Operating Expense (10y, median)</div>
        <div class="text-lg font-semibold">{{ formatMoney(totalOpEx) }}</div>
      </div>
      <div class="p-4 rounded-lg border border-border bg-white/50">
        <div class="text-xs text-text-secondary mb-1">Total Grants (10y, median)</div>
        <div class="text-lg font-semibold">{{ formatMoney(totalGrants) }}</div>
      </div>
      <div class="p-4 rounded-lg border border-border bg-white/50">
        <div class="text-xs text-text-secondary mb-1">Total Spending Policy (10y, median)</div>
        <div class="text-lg font-semibold">{{ formatMoney(totalSpendPol) }}</div>
      </div>
      <div class="p-4 rounded-lg border border-border bg-white/50">
        <div class="text-xs text-text-secondary mb-1">Total Investment Expense (10y, median)</div>
        <div class="text-lg font-semibold">{{ formatMoney(totalInvest) }}</div>
      </div>
    </div>
  </div>
</template>
