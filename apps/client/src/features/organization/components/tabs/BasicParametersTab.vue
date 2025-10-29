<template>
  

<!-- Simulation Timeline Card -->
<section class="bg-slate-50 border border-slate-100 rounded-lg p-5">
  <div class="flex items-start gap-3 mb-4">
    <div class="h-10 w-1 rounded-md bg-indigo-600"></div>
    <div class="flex-1">
      <h2 class="text-lg font-semibold text-slate-900">Simulation Timeline</h2>
      <p class="text-xs text-slate-500 mt-1">Define the projection period and starting year</p>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Number of Years -->
    <div>
      <label class="block text-sm font-medium text-slate-800 mb-2">Number of Years</label>
      <input 
        type="number" 
        v-model.number="options.years" 
        class="input-field w-full p-3 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100" 
        placeholder="10" 
        min="1" 
        max="30" 
        @input="$emit('update:options', options)"
      />
    </div>

    <!-- Starting Year -->
    <div>
      <label class="block text-sm font-medium text-slate-800 mb-2">Starting Year</label>
      <input 
        type="number" 
        v-model.number="options.startYear" 
        class="input-field w-full p-3 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100" 
        :placeholder="String(new Date().getFullYear())" 
        min="2000" 
        max="2100" 
        @input="$emit('update:options', options)"
      />
    </div>
  </div>
</section>

<!-- Financial Foundation Card -->
<section class="bg-slate-50 border border-slate-100 rounded-lg p-5">
  <div class="flex items-start gap-3 mb-4">
    <div class="h-10 w-1 rounded-md bg-indigo-600"></div>
    <div class="flex-1">
      <h2 class="text-lg font-semibold text-slate-900">Financial Foundation</h2>
      <p class="text-xs text-slate-500 mt-1">Core endowment financial parameters</p>
    </div>
    <div class="flex items-center">
      <div v-if="isFinancialSectionComplete" class="flex items-center text-green-600">
        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span class="text-sm font-medium">Complete</span>
      </div>
      <div v-else-if="hasFinancialErrors" class="flex items-center text-red-600">
        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span class="text-sm font-medium">Errors</span>
      </div>
      <div v-else class="flex items-center text-gray-400">
        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm font-medium">Pending</span>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Initial Endowment Value -->
    <div>
      <label class="block text-sm font-medium text-slate-800 mb-2">Initial Endowment Value</label>
      <div class="relative">
        <input 
          type="number" 
          v-model.number="inputs.initialEndowment" 
          :class="[
            'input-field w-full p-3 pl-14 pr-10 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100',
            inputs.initialEndowment && inputs.initialEndowment < 1000000 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : inputs.initialEndowment && inputs.initialEndowment >= 1000000
              ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          ]"
          placeholder="50000000" 
          step="1000000" 
          min="1000000" 
          @input="$emit('update:inputs', inputs)"
        />
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span class="text-slate-600 sm:text-sm">$</span>
        </div>
        <div v-if="inputs.initialEndowment && inputs.initialEndowment >= 1000000" class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div v-if="inputs.initialEndowment && inputs.initialEndowment < 1000000" class="mt-1 text-sm text-red-600">
        Minimum endowment value is $1,000,000
      </div>
    </div>

    <!-- Spending Policy Rate -->
    <div>
      <label class="block text-sm font-medium text-slate-800 mb-2">Spending Policy Rate (%)</label>
      <input 
        type="number" 
        v-model.number="inputs.spendingPolicyRate" 
        :class="[
          'input-field w-full p-3 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100',
          inputs.spendingPolicyRate && (inputs.spendingPolicyRate < 0 || inputs.spendingPolicyRate > 15)
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        ]"
        placeholder="5" 
        step="0.1" 
        min="0" 
        max="15" 
        @input="$emit('update:inputs', inputs)"
      />
      <div v-if="inputs.spendingPolicyRate && (inputs.spendingPolicyRate < 0 || inputs.spendingPolicyRate > 15)" class="mt-1 text-sm text-red-600">
        Spending rate should be between 0% and 15%
      </div>
    </div>

    <!-- Investment Expense Rate -->
    <div>
      <label class="block text-sm font-medium text-slate-800 mb-2">Investment Expense Rate (%)</label>
      <input 
        type="number" 
        v-model.number="inputs.investmentExpenseRate" 
        :class="[
          'input-field w-full p-3 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100',
          inputs.investmentExpenseRate && (inputs.investmentExpenseRate < 0 || inputs.investmentExpenseRate > 5)
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        ]"
        placeholder="1" 
        step="0.1" 
        min="0" 
        max="5" 
        @input="$emit('update:inputs', inputs)"
      />
      <div v-if="inputs.investmentExpenseRate && (inputs.investmentExpenseRate < 0 || inputs.investmentExpenseRate > 5)" class="mt-1 text-sm text-red-600">
        Investment expenses should be between 0% and 5%
      </div>
    </div>
  </div>
</section>

 <!-- Operating Commitments & Grants Card -->
<section class="bg-slate-50 border border-slate-100 rounded-lg p-5">
  <div class="flex items-start gap-3 mb-4">
    <div class="h-10 w-1 rounded-md bg-indigo-600"></div>
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Operating Commitments & Grants</h2>
      <p class="text-xs text-slate-500 mt-1">Annual expenses and mission-driven distributions</p>
    </div>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
    <!-- Initial Operating Expense -->
    <div>
      <label class="text-xs font-medium text-slate-600">Initial Operating Expense ($)</label>
      <div class="relative">
        <input 
          type="number" 
          v-model.number="inputs.initialOperatingExpense" 
          :class="[
            'mt-1 w-full rounded-lg border bg-white border-slate-200 p-3 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100',
            inputs.initialOperatingExpense && inputs.initialOperatingExpense < 0
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          ]"
          placeholder="0"
          step="50000"
          min="0"
          @input="$emit('update:inputs', inputs)"
        />
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span class="text-gray-500 sm:text-sm">$</span>
        </div>
      </div>
      <div v-if="inputs.initialOperatingExpense && inputs.initialOperatingExpense < 0" class="mt-1 text-sm text-red-600">
        Operating expenses cannot be negative
      </div>
    </div>

    <!-- Initial Grant Amount -->
    <div>
      <label class="text-xs font-medium text-slate-600">Initial Grant Amount ($)</label>
      <div class="relative">
        <input 
          type="number" 
          v-model.number="inputs.initialGrant" 
          :class="[
            'mt-1 w-full rounded-lg border bg-white border-slate-200 p-3 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100',
            inputs.initialGrant && inputs.initialGrant < 0
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          ]"
          placeholder=""
          step="50000"
          min="0"
          @input="$emit('update:inputs', inputs)"
        />
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span class="text-gray-500 sm:text-sm">$</span>
        </div>
      </div>
      <div v-if="inputs.initialGrant && inputs.initialGrant < 0" class="mt-1 text-sm text-red-600">
        Grant amounts cannot be negative
      </div>
    </div>
  </div>
</section>

<!-- Manual Grant Override Card -->
<section class="bg-slate-50 border border-slate-100 rounded-lg p-5">
  <div class="flex items-start gap-3 mb-4">
    <div class="h-10 w-1 rounded-md bg-indigo-600"></div>
    <div class="flex-1">
      <h2 class="text-lg font-semibold text-slate-900">Manual Grant Override</h2>
      <p class="text-xs text-slate-500 mt-1">Enable and edit per-year grant targets</p>
    </div>
    <div>
      <button
        type="button"
        role="switch"
        :aria-checked="enableGrantOverride ? 'true' : 'false'"
        @click="enableGrantOverride = !enableGrantOverride"
        :class="[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400',
          enableGrantOverride ? 'bg-indigo-600' : 'bg-slate-300'
        ]"
      >
        <span class="sr-only">Enable manual override</span>
        <span :class="[
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transform transition-transform',
          enableGrantOverride ? 'translate-x-5' : 'translate-x-0'
        ]"></span>
      </button>
    </div>
  </div>

  <div :class="[ enableGrantOverride ? '' : 'opacity-60 pointer-events-none' ]">
    <GrantTargets
      :model-value="inputs.grantTargets"
      :years="options.years"
      :start-year="options.startYear"
      @update:modelValue="onUpdateGrantTargets"
    />
  </div>
</section>

  
</template>




<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import type { SimulationInputs, SimulationOptions } from '../../types/SettingsTypes';
import GrantTargets from '../../../simulation/components/inputs/GrantTargets.vue';

interface Props {
  inputs: SimulationInputs;
  options: SimulationOptions;
}

interface Emits {
  (e: 'update:inputs', inputs: SimulationInputs): void;
  (e: 'update:options', options: SimulationOptions): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Computed properties for validation states
const isFinancialSectionComplete = computed(() => {
  return props.inputs.initialEndowment >= 1000000 &&
         props.inputs.spendingPolicyRate >= 0 && props.inputs.spendingPolicyRate <= 15 &&
         props.inputs.investmentExpenseRate >= 0 && props.inputs.investmentExpenseRate <= 5;
});

const hasFinancialErrors = computed(() => {
  return (props.inputs.initialEndowment && props.inputs.initialEndowment < 1000000) ||
         (props.inputs.spendingPolicyRate && (props.inputs.spendingPolicyRate < 0 || props.inputs.spendingPolicyRate > 15)) ||
         (props.inputs.investmentExpenseRate && (props.inputs.investmentExpenseRate < 0 || props.inputs.investmentExpenseRate > 5)) ||
         (props.inputs.initialOperatingExpense && props.inputs.initialOperatingExpense < 0) ||
         (props.inputs.initialGrant && props.inputs.initialGrant < 0);
});

// Toggle for enabling per-year grant targets (manual override)
const enableGrantOverride = ref(false);
const hasNonZeroGrantTargets = computed(() => Array.isArray(props.inputs.grantTargets) && props.inputs.grantTargets.some(v => (Number(v) || 0) > 0));
onMounted(() => { enableGrantOverride.value = hasNonZeroGrantTargets.value; });


//  Watch the toggle state
watch(enableGrantOverride, (isNowEnabled) => {
    if (!isNowEnabled) {
        // When the toggle is switched OFF:
        // 1. Reset the grantTargets in the data model to an empty array.
        //    This tells the engine to use the residual calculation logic.
        (props.inputs as any).grantTargets = [];
        
        // 2. Emit the updated inputs object to the parent store/state.
        //    This forces the parent to update its state, which triggers the engine re-run.
        emit('update:inputs', props.inputs);
    } 
    // Note: When switching ON, the GrantTargets component handles initialization 
    // when it receives focus/input, so no explicit action is needed here.
});

function onUpdateGrantTargets(nv: number[]) {
  // Update nested prop and emit to keep parent store in sync
  (props.inputs as any).grantTargets = nv;
  // Emit the entire inputs object to mirror other inputs behavior
  // (the parent merges into sim.inputs)
  emit('update:inputs', props.inputs);
}
</script>
