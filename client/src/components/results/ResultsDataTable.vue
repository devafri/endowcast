<script setup lang="ts">
import { ref, computed } from 'vue';
const props = defineProps<{ results: any }>();

function formatMoney(num: number): string {
  if (!isFinite(num)) return '-';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

// Build median series for each measure
function percentileSeries(matrix: number[][], p: number): number[] {
  if (!matrix?.length) return [];
  const Y = matrix[0].length;
  const out: number[] = [];
  for (let i = 0; i < Y; i++) {
  const arr = matrix.map(r => r[i]).sort((a,b)=>a-b);
  const idx = Math.floor((p / 100) * (arr.length - 1));
  out.push(arr[idx]);
  }
  return out;
}

const tabs = [90, 75, 50, 25, 10];
const active = ref(50);
const simSer = computed(() => percentileSeries(props.results?.simulations ?? [], active.value));
const opExSer = computed(() => percentileSeries(props.results?.operatingExpenses ?? [], active.value));
const grantsSer = computed(() => percentileSeries(props.results?.grants ?? [], active.value));
const spendingSer = computed(() => percentileSeries(props.results?.spendingPolicy ?? [], active.value));
const invExpSer = computed(() => percentileSeries(props.results?.investmentExpenses ?? [], active.value));
const totalSpendSer = computed(() => percentileSeries(props.results?.totalSpendings ?? [], active.value));
</script>

<template>
  <div class="card p-4 sm:p-6">
    <h3 class="section-title mb-4">Simulation Data by Percentile</h3>
    <div class="mb-4 border-b border-border">
      <nav class="flex -mb-px space-x-6" aria-label="Tabs">
        <button
          v-for="p in tabs"
          :key="p"
          class="percentile-tab whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm"
          :class="{ active: active === p }"
          @click="active = p"
        >
          {{ p === 50 ? 'Median (50th)' : `${p}th` }}
        </button>
      </nav>
    </div>
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="text-text-secondary uppercase text-sm border-b border-border">
            <th class="py-3 px-6 text-left">Year</th>
            <th class="py-3 px-6 text-left">Endowment Value</th>
            <th class="py-3 px-6 text-left">Operating Expense</th>
            <th class="py-3 px-6 text-left">Grants</th>
            <th class="py-3 px-6 text-left subtle-highlight">Spending Policy Expense</th>
            <th class="py-3 px-6 text-left">Investment Expense</th>
            <th class="py-3 px-6 text-left">Total Spending</th>
          </tr>
        </thead>
        <tbody class="text-sm font-light">
          <tr v-for="(val, i) in simSer" :key="i" class="border-b border-border">
            <td class="py-3 px-6">{{ (props.results?.yearLabels?.[i]) || (i + 1) }}</td>
            <td class="py-3 px-6">{{ formatMoney(val) }}</td>
            <td class="py-3 px-6">{{ formatMoney(opExSer[i] ?? 0) }}</td>
            <td class="py-3 px-6">{{ formatMoney(grantsSer[i] ?? 0) }}</td>
            <td class="py-3 px-6 subtle-highlight">{{ formatMoney(spendingSer[i] ?? 0) }}</td>
            <td class="py-3 px-6">{{ formatMoney(invExpSer[i] ?? 0) }}</td>
            <td class="py-3 px-6">{{ formatMoney(totalSpendSer[i] ?? 0) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
  