<script setup lang="ts">
import { ref, computed } from 'vue';
const props = defineProps<{ results: any }>();

function formatMoney(num: number): string {
  if (typeof num !== 'number' || !isFinite(num)) return '-';
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
            <th class="py-3 px-4 text-left font-medium"></th>
            <th v-for="(val, i) in simSer" :key="i" class="py-3 px-3 text-center font-medium min-w-20">
              {{ (props.results?.yearLabels?.[i]) || (2025 + i) }}
            </th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <!-- Key Metric: Endowment Value -->
          <tr class="border-b-2 border-blue-600 bg-blue-100">
            <td class="py-4 px-4 font-bold text-blue-900 text-base">🏛️ Endowment Value</td>
            <td v-for="(val, i) in simSer" :key="i" class="py-4 px-3 text-center font-semibold text-blue-900 text-base">{{ formatMoney(val) }}</td>
          </tr>
          
          <!-- Spacing row -->
          <tr class="h-2"><td colspan="100%" class="border-0"></td></tr>
          
          <!-- Spending Policy Components -->
          <tr class="border-b border-gray-200 bg-gray-50">
            <td class="py-2 px-4 font-medium text-gray-700 text-xs uppercase tracking-wide">Spending Policy Components</td>
            <td v-for="(val, i) in simSer" :key="i" class="py-2 px-3"></td>
          </tr>
          <tr class="border-b border-border">
            <td class="py-3 px-4 pl-8 font-medium text-gray-900">• Operating Expenses</td>
            <td v-for="(val, i) in opExSer" :key="i" class="py-3 px-3 text-center">{{ formatMoney(val) }}</td>
          </tr>
          <tr class="border-b border-border">
            <td class="py-3 px-4 pl-8 font-medium text-gray-900">• Grant Distributions</td>
            <td v-for="(val, i) in grantsSer" :key="i" class="py-3 px-3 text-center">{{ formatMoney(val) }}</td>
          </tr>
          <tr class="border-b-2 border-orange-400 bg-orange-50">
            <td class="py-3 px-4 font-semibold text-orange-900">= Spending Policy Expense</td>
            <td v-for="(val, i) in spendingSer" :key="i" class="py-3 px-3 text-center font-semibold text-orange-800">{{ formatMoney(val) }}</td>
          </tr>
          
          <!-- Total Organization Expenses -->
          <tr class="border-b border-border bg-gray-50">
            <td class="py-3 px-4 font-medium text-gray-900">+ Investment Expenses</td>
            <td v-for="(val, i) in invExpSer" :key="i" class="py-3 px-3 text-center">{{ formatMoney(val) }}</td>
          </tr>
          <tr class="border-b-2 border-red-400 bg-red-50">
            <td class="py-3 px-4 font-semibold text-red-900">= Total Organization Expenses</td>
            <td v-for="(val, i) in totalSpendSer" :key="i" class="py-3 px-3 text-center font-semibold text-red-800">{{ formatMoney(val) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
  