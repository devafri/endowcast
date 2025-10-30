<script setup lang="ts">
import { ref, computed } from 'vue';
const props = defineProps<{ results: any }>();

// --- Formatting Helpers ---
function formatMoney(num: number): string {
  if (typeof num !== 'number' || !isFinite(num)) return '—';
  // Use compact formatting like the screenshot ($557.3M)
  const absNum = Math.abs(num);
  if (absNum >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (absNum >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (absNum >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function percentileSeries(matrix: number[][], p: number): number[] {
  if (!matrix?.length) return [];
  // Determine the length of the time series (number of years)
  // Ensure we use the length of the *shortest* simulation run as the max year count to prevent errors.
  const Y = Math.min(...matrix.map(row => row.length));
  const out: number[] = [];
  
  for (let i = 0; i < Y; i++) {
    // Extract the value for year 'i' from all simulations
    const arr = matrix.map(r => r[i]).filter(v => Number.isFinite(v)).sort((a,b)=>a-b);
    if (!arr.length) {
        out.push(NaN);
        continue;
    }
    // Calculate the index for the given percentile (p)
    const idx = Math.floor((p / 100) * (arr.length - 1));
    out.push(arr[idx]);
  }
  return out;
}

// --- Component State and Computed Data ---
const tabs = [90, 75, 50, 25, 10];
const active = ref(50);

// Get percentile series for core data
const simSer = computed(() => {
  const sims = props.results?.simulations ?? [];
  if (!sims.length) return [];
  return percentileSeries(sims, active.value);
});

// Get the matrices - add defensive null checks
const opExMatrix = props.results?.operatingExpenses ?? [];
const grantsMatrix = props.results?.grants ?? [];
const spendingPolicyMatrix = props.results?.spendingPolicy ?? [];
const invExpMatrix = props.results?.investmentExpenses ?? [];
// Note: totalSpendings is derived from (spendingPolicy + invExp) or (actualSpending + invExp)
const totalSpendSer = computed(() => {
  const totalSpendings = props.results?.totalSpendings ?? [];
  if (!totalSpendings.length) return [];
  return percentileSeries(totalSpendings, active.value);
});

// Actual Spending (OpEx + Grants) for display. Grants include any grant targets (gt) logic applied.
const actualSpending = computed(() => {
    // If we have actual spending data, use it.
    if (opExMatrix.length && grantsMatrix.length) {
        return opExMatrix.map((simOp: number[], s: number) => 
            simOp.map((op: number, y: number) => op + (grantsMatrix[s]?.[y] ?? 0))
        );
    }
    return [];
});

const opExSer = computed(() => {
  if (!opExMatrix.length) return [];
  return percentileSeries(opExMatrix, active.value);
});

const grantsSer = computed(() => {
  if (!grantsMatrix.length) return [];
  return percentileSeries(grantsMatrix, active.value);
});

// Spending Policy Expense Row: OpEx + Grants
const spendingSer = computed(() => {
    // Use the actual (OpEx + Grants) calculation if data is present
    if (actualSpending.value.length) {
        return percentileSeries(actualSpending.value, active.value);
    }
    // Fallback logic for older data or missing components: use spendingPolicy (which includes both)
    if (spendingPolicyMatrix.length) {
      return percentileSeries(spendingPolicyMatrix, active.value);
    }
    return [];
});

const invExpSer = computed(() => {
  if (!invExpMatrix.length) return [];
  return percentileSeries(invExpMatrix, active.value);
});

// Generate dynamic year labels
const yearLabels = computed(() => {
    const labels = props.results?.yearLabels ?? [];
    const seriesLength = simSer.value.length;
    
    // If no labels, generate years starting from 2025 (or current year)
    if (labels.length === 0) {
        // Find a plausible starting year. Use 2025 as the default based on visual context.
        const startYear = 2025; 
        return Array.from({ length: seriesLength }, (_, i) => startYear + i);
    }
    
    // Only return labels up to the length of the data series
    return labels.slice(0, seriesLength);
});
</script>

<template>
  <div class="p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
    <h3 class="text-xl font-bold mb-4 text-gray-800">Simulation Data by Percentile</h3>
    
    <div class="mb-6 border-b border-gray-200">
      <nav class="flex space-x-4 sm:space-x-8 -mb-px" aria-label="Tabs">
        <button
          v-for="p in tabs"
          :key="p"
          class="whitespace-nowrap py-3 px-1 text-sm font-medium transition duration-150 ease-in-out"
          :class="[
            active === p
              ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' // Active state
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
            <th class="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 z-20 bg-gray-50 min-w-48"></th>
            <th v-for="(year, i) in yearLabels" :key="i" class="py-3 px-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-24">
              {{ year }}
            </th>
          </tr>
        </thead>
        
        <tbody class="divide-y divide-gray-100">
          
<tr class="bg-white">
  <td class="py-4 px-4 font-bold text-blue-700 text-base sticky left-0 z-10 whitespace-nowrap bg-white">
    <span class="mr-2">🏛️</span> Endowment Value
  </td>
  <td v-for="(val, i) in simSer" :key="i" class="py-4 px-3 text-right font-semibold text-blue-700 text-base whitespace-nowrap tabnums">
    {{ formatMoney(val) }}
  </td>
</tr>

<tr class="bg-white">
  <td class="pt-6 pb-2 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide sticky left-0 z-10 whitespace-nowrap bg-white">
    Spending Policy Components
  </td>
  <td v-for="(val, i) in simSer" :key="i"></td>
</tr>

<tr class="bg-white hover:bg-slate-50 transition">
  <td class="py-3 px-4 pl-8 text-sm text-gray-700 sticky left-0 z-10 whitespace-nowrap bg-white">
    Operating Expenses
  </td>
  <td v-for="(val, i) in opExSer" :key="i" class="py-3 px-3 text-right text-sm text-gray-700 whitespace-nowrap tabnums">
    {{ formatMoney(val) }}
  </td>
</tr>

<tr class="bg-white hover:bg-slate-50 transition">
  <td class="py-3 px-4 pl-8 text-sm text-gray-700 sticky left-0 z-10 whitespace-nowrap bg-white">
    Grant Distributions
  </td>
  <td v-for="(val, i) in grantsSer" :key="i" class="py-3 px-3 text-right text-sm text-gray-700 whitespace-nowrap tabnums">
    {{ formatMoney(val) }}
  </td>
</tr>

<tr class="bg-yellow-50/50">
  <td class="py-3 px-4 font-bold text-amber-700 sticky left-0 z-10 whitespace-nowrap bg-yellow-50/50 border-l-4 border-amber-400">
    = Spending Policy Expense
  </td>
  <td v-for="(val, i) in spendingSer" :key="i" class="py-3 px-3 text-right font-bold text-amber-700 whitespace-nowrap tabnums">
    {{ formatMoney(val) }}
  </td>
</tr>

<tr class="bg-white hover:bg-slate-50 transition">
  <td class="py-3 px-4 font-medium text-gray-900 sticky left-0 z-10 whitespace-nowrap bg-white">
    + Investment Expenses
  </td>
  <td v-for="(val, i) in invExpSer" :key="i" class="py-3 px-3 text-right text-gray-700 whitespace-nowrap tabnums">
    {{ formatMoney(val) }}
  </td>
</tr>

<tr class="bg-rose-50/50">
  <td class="py-3 px-4 font-extrabold text-rose-700 sticky left-0 z-10 whitespace-nowrap bg-rose-50/50 border-l-4 border-rose-500">
    = Total Organization Expenses
  </td>
  <td v-for="(val, i) in totalSpendSer" :key="i" class="py-3 px-3 text-right font-extrabold text-rose-700 whitespace-nowrap tabnums">
    {{ formatMoney(val) }}
  </td>
</tr>

        </tbody>
      </table>
    </div>
  </div>
</template>