<script setup lang="ts">
import { ref, computed } from 'vue';
const props = defineProps<{ results: any }>();

// --- Formatting Helpers ---
function formatMoney(num: number): string {
  if (typeof num !== 'number' || !isFinite(num)) return '—';
  const absNum = Math.abs(num);
  if (absNum >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (absNum >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (absNum >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function percentileSeries(matrix: number[][], p: number): number[] {
  if (!matrix?.length) return [];
  const Y = Math.min(...matrix.map(row => row.length));
  const out: number[] = [];
  for (let i = 0; i < Y; i++) {
    const arr = matrix.map(r => r[i]).filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    if (!arr.length) { out.push(NaN); continue; }
    const idx = Math.floor((p / 100) * (arr.length - 1));
    out.push(arr[idx]);
  }
  return out;
}

const tabs = [90, 75, 50, 25, 10];
const active = ref(50);

const simSer = computed(() => percentileSeries(props.results?.simulations ?? [], active.value));
const opExMatrix = props.results?.operatingExpenses ?? [];
const grantsMatrix = props.results?.grants ?? [];
const spendingPolicyMatrix = props.results?.spendingPolicy ?? [];
const invExpMatrix = props.results?.investmentExpenses ?? [];

const totalSpendSer = computed(() => {
  // Compute total organization expense as Spending Policy Expense + Investment Expenses
  const s = spendingSer.value ?? [];
  const inv = invExpSer.value ?? [];
  const maxLen = Math.max(s.length, inv.length);
  const out: number[] = [];
  for (let i = 0; i < maxLen; i++) {
    const sv = Number.isFinite(s[i]) ? s[i] : 0;
    const iv = Number.isFinite(inv[i]) ? inv[i] : 0;
    out.push(sv + iv);
  }
  return out;
});
const actualSpending = computed(() => {
  if (opExMatrix.length && grantsMatrix.length) {
    return opExMatrix.map((simOp: number[], s: number) =>
      simOp.map((op: number, y: number) => op + (grantsMatrix[s]?.[y] ?? 0))
    );
  }
  return [];
});

const opExSer = computed(() => percentileSeries(opExMatrix, active.value));
const grantsSer = computed(() => percentileSeries(grantsMatrix, active.value));
const spendingSer = computed(() => {
  if (actualSpending.value.length) return percentileSeries(actualSpending.value, active.value);
  if (spendingPolicyMatrix.length) return percentileSeries(spendingPolicyMatrix, active.value);
  return [];
});
const invExpSer = computed(() => percentileSeries(invExpMatrix, active.value));

const yearLabels = computed(() => {
  const labels = props.results?.yearLabels ?? [];
  if (!labels.length) {
    const startYear = 2025;
    const numYears = props.results?.metadata?.yearsProjected || 5;
    return Array.from({ length: numYears }, (_, i) => startYear + i);
  }
  return labels;
});

function sliceSeries(series: number[]): number[] {
  if (!series?.length) return [];
  const targetLength = yearLabels.value.length;
  return series.slice(0, targetLength);
}
</script>

<template>
  <div class="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100">
      <h3 class="text-lg font-semibold text-slate-800">Simulation Data by Percentile</h3>
      <div class="flex space-x-2">
        <button
          v-for="p in tabs"
          :key="p"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150"
          :class="[
            active === p
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100'
          ]"
          @click="active = p"
        >
          {{ p === 50 ? 'Median (50th)' : `${p}th` }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto max-w-full">
      <table class="min-w-full text-sm text-right border-separate border-spacing-0">
        <thead class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
          <tr class="bg-slate-100">
            <th class="text-left py-3 px-5 sticky left-0 z-20 font-bold">Year</th>
            <th
              v-for="(year, i) in yearLabels"
              :key="i"
              class="py-3 px-4 font-bold text-right"
            >
              {{ year }}
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100 text-slate-700">
          <!-- Endowment Value -->
          <tr class="bg-white hover:bg-slate-50 transition">
            <td class="py-3 px-5 text-left font-semibold text-blue-700 sticky left-0 bg-white z-10">
              Endowment Value
            </td>
            <td v-for="(val, i) in sliceSeries(simSer)" :key="i" class="py-3 px-4 font-semibold text-blue-700">
              {{ formatMoney(val) }}
            </td>
          </tr>

          <!-- Section Label -->
          <tr class="bg-slate-100 ">
            <td class="py-2 px-5 text-left text-xs font-semibold text-slate-500 uppercase sticky left-0 z-10">
              Spending Policy Components
            </td>
            <td v-for="(val, i) in sliceSeries(simSer)" :key="i"></td>
          </tr>

          <!-- Operating Expenses -->
          <tr class="bg-white hover:bg-slate-50">
            <td class="py-3 px-5 text-left text-slate-700 sticky left-0 bg-white">Operating Expenses</td>
            <td v-for="(val, i) in sliceSeries(opExSer)" :key="i" class="py-3 px-4 tabnums">
              {{ formatMoney(val) }}
            </td>
          </tr>

          <!-- Grant Distributions -->
          <tr class="bg-white hover:bg-slate-50">
            <td class="py-3 px-5 text-left text-slate-700 sticky left-0 bg-white">Grant Distributions</td>
            <td v-for="(val, i) in sliceSeries(grantsSer)" :key="i" class="py-3 px-4 tabnums">
              {{ formatMoney(val) }}
            </td>
          </tr>

          <!-- Spending Policy Expense -->
          <tr class="bg-amber-50 border-l-4 border-amber-400">
            <td class="py-3 px-5 text-left font-semibold text-amber-700 sticky left-0 bg-amber-50">
              = Spending Policy Expense
            </td>
            <td v-for="(val, i) in sliceSeries(spendingSer)" :key="i" class="py-3 px-4 font-semibold text-amber-700 tabnums">
              {{ formatMoney(val) }}
            </td>
          </tr>

          <!-- Investment Expenses -->
          <tr class="bg-white hover:bg-slate-50">
            <td class="py-3 px-5 text-left text-slate-700 sticky left-0 bg-white">+ Investment Expenses</td>
            <td v-for="(val, i) in sliceSeries(invExpSer)" :key="i" class="py-3 px-4 tabnums">
              {{ formatMoney(val) }}
            </td>
          </tr>

          <!-- Total Organization Expenses -->
          <tr class="bg-rose-50 border-l-4 border-rose-500">
            <td class="py-3 px-5 text-left font-bold text-rose-700 sticky left-0 bg-rose-50">
              = Total Organization Expenses
            </td>
            <td v-for="(val, i) in sliceSeries(totalSpendSer)" :key="i" class="py-3 px-4 font-bold text-rose-700 tabnums">
              {{ formatMoney(val) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
