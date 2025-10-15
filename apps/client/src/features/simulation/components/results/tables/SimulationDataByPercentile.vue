<script setup lang="ts">
import { ref, computed } from 'vue';
const props = defineProps<{ results: any }>();

function formatMoney(num: number): string {
  if (typeof num !== 'number' || !isFinite(num)) return '-';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

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
  <div class="p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
    <h3 class="text-xl font-bold mb-4 text-gray-800">Simulation Data by Percentile</h3>
    
    <div class="mb-6 border-b border-gray-200">
      <nav class="flex space-x-4 sm:space-x-8" aria-label="Tabs">
        <button
          v-for="p in tabs"
          :key="p"
          class="whitespace-nowrap py-3 px-1 text-sm font-medium transition duration-150 ease-in-out"
          :class="[
            active === p
              ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold' // Active state
              : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' // Inactive state
          ]"
          @click="active = p"
        >
          {{ p === 50 ? 'Median (50th)' : `${p}th` }}
        </button>
      </nav>
    </div>
    
    <div class="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
      <table class="min-w-full divide-y divide-gray-200">
        
        <thead class="bg-gray-50">
          <tr>
            <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-10 bg-gray-50"></th>
            <th v-for="(val, i) in simSer" :key="i" class="py-3 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24">
              {{ (props.results?.yearLabels?.[i]) || (2025 + i) }}
            </th>
          </tr>
        </thead>
        
        <tbody class="divide-y divide-gray-100">
          
          <tr class="bg-indigo-50 border-b-2 border-indigo-600">
            <td class="py-4 px-4 font-extrabold text-indigo-800 text-base sticky left-0 z-10 bg-indigo-50 whitespace-nowrap">
              🏛️ Endowment Value
            </td>
            <td v-for="(val, i) in simSer" :key="i" class="py-4 px-3 text-center font-bold text-indigo-800 text-base whitespace-nowrap">
              {{ formatMoney(val) }}
            </td>
          </tr>
          
          <tr class="bg-gray-100">
            <td class="py-2 px-4 font-semibold text-gray-700 text-xs uppercase tracking-wider sticky left-0 z-10 bg-gray-100 whitespace-nowrap">
              Spending Policy Components
            </td>
            <td v-for="(val, i) in simSer" :key="i" class="py-2 px-3"></td>
          </tr>
          
          <tr class="bg-white hover:bg-gray-50 transition duration-100">
            <td class="py-3 px-4 pl-8 text-sm text-gray-700 sticky left-0 z-10 bg-white whitespace-nowrap">
              • Operating Expenses
            </td>
            <td v-for="(val, i) in opExSer" :key="i" class="py-3 px-3 text-center text-sm text-gray-700 whitespace-nowrap">
              {{ formatMoney(val) }}
            </td>
          </tr>
          
          <tr class="bg-white hover:bg-gray-50 transition duration-100">
            <td class="py-3 px-4 pl-8 text-sm text-gray-700 sticky left-0 z-10 bg-white whitespace-nowrap">
              • Grant Distributions
            </td>
            <td v-for="(val, i) in grantsSer" :key="i" class="py-3 px-3 text-center text-sm text-gray-700 whitespace-nowrap">
              {{ formatMoney(val) }}
            </td>
          </tr>
          
          <tr class="border-y-2 border-orange-400 bg-orange-50">
            <td class="py-3 px-4 font-bold text-orange-800 sticky left-0 z-10 bg-orange-50 whitespace-nowrap">
              = Spending Policy Expense
            </td>
            <td v-for="(val, i) in spendingSer" :key="i" class="py-3 px-3 text-center font-bold text-orange-800 whitespace-nowrap">
              {{ formatMoney(val) }}
            </td>
          </tr>
          
          <tr class="bg-white hover:bg-gray-50 transition duration-100">
            <td class="py-3 px-4 font-medium text-gray-900 sticky left-0 z-10 bg-white whitespace-nowrap">
              + Investment Expenses
            </td>
            <td v-for="(val, i) in invExpSer" :key="i" class="py-3 px-3 text-center text-gray-700 whitespace-nowrap">
              {{ formatMoney(val) }}
            </td>
          </tr>
          
          <tr class="border-t-2 border-red-600 bg-red-50">
            <td class="py-3 px-4 font-extrabold text-red-800 sticky left-0 z-10 bg-red-50 whitespace-nowrap">
              = Total Organization Expenses
            </td>
            <td v-for="(val, i) in totalSpendSer" :key="i" class="py-3 px-3 text-center font-extrabold text-red-800 whitespace-nowrap">
              {{ formatMoney(val) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>