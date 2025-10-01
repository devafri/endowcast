<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Financial Foundation Card -->
      <div class="card p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center">
            <div class="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Financial Foundation</h3>
              <p class="text-sm text-gray-600">Core endowment financial parameters</p>
            </div>
          </div>
          <div class="flex items-center">
            <div v-if="isFinancialSectionComplete" class="flex items-center text-green-600">
              <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-sm font-medium">Complete</span>
            </div>
            <div v-else-if="hasFinancialErrors" class="flex items-center text-red-600">
              <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <span class="text-sm font-medium">Errors</span>
            </div>
            <div v-else class="flex items-center text-gray-400">
              <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm font-medium">Pending</span>
            </div>
          </div>
        </div>
        
        <div class="space-y-4">
          <!-- Initial Endowment Value -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Initial Endowment Value</label>
            <div class="relative">
              <input 
                type="number" 
                v-model.number="inputs.initialEndowment" 
                :class="[
                  'input-field w-full p-3 pl-14 pr-10 rounded-md',
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
              <div class="absolute inset-y-0 left-0 pl-1 pr-1 flex items-center pointer-events-none">
                <span class="text-gray-500 sm:text-sm">$</span>
              </div>
              <div v-if="inputs.initialEndowment && inputs.initialEndowment >= 1000000" class="absolute inset-y-0 right-0 pr-3 flex items-center">
                <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <div v-if="inputs.initialEndowment && inputs.initialEndowment < 1000000" class="mt-1 text-sm text-red-600">
              Minimum endowment value is $1,000,000
            </div>
          </div>

          <!-- Spending Policy Rate -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Spending Policy Rate (%)</label>
            <input 
              type="number" 
              v-model.number="inputs.spendingPolicyRate" 
              :class="[
                'input-field w-full p-3 rounded-md',
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
            <label class="block text-sm font-medium text-gray-700 mb-2">Investment Expense Rate (%)</label>
            <input 
              type="number" 
              v-model.number="inputs.investmentExpenseRate" 
              :class="[
                'input-field w-full p-3 rounded-md',
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
      </div>

      <!-- Operational Expenses Card -->
      <div class="card p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-6">
          <div class="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center mr-3">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Operational Expenses</h3>
            <p class="text-sm text-gray-600">Annual operating costs and commitments</p>
          </div>
        </div>
        
        <div class="space-y-4">
          <!-- Initial Operating Expense -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Initial Operating Expense</label>
            <div class="relative">
              <input 
                type="number" 
                v-model.number="inputs.initialOperatingExpense" 
                :class="[
                  'input-field w-full p-3 pl-12 rounded-md',
                  inputs.initialOperatingExpense && inputs.initialOperatingExpense < 0
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                ]"
                placeholder="1000000" 
                step="50000" 
                min="0" 
                @input="$emit('update:inputs', inputs)"
              />
              <div class="absolute inset-y-0 left-0 pl-1 pr-1 flex items-center pointer-events-none">
                <span class="text-gray-500 sm:text-sm">$</span>
              </div>
            </div>
            <div v-if="inputs.initialOperatingExpense && inputs.initialOperatingExpense < 0" class="mt-1 text-sm text-red-600">
              Operating expenses cannot be negative
            </div>
          </div>

          <!-- Initial Grant Amount -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Initial Grant Amount</label>
            <div class="relative">
              <input 
                type="number" 
                v-model.number="inputs.initialGrant" 
                :class="[
                  'input-field w-full p-3 pl-12 rounded-md',
                  inputs.initialGrant && inputs.initialGrant < 0
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                ]"
                placeholder="1500000" 
                step="50000" 
                min="0" 
                @input="$emit('update:inputs', inputs)"
              />
              <div class="absolute inset-y-0 left-0 pl-1 pr-1 flex items-center pointer-events-none">
                <span class="text-gray-500 sm:text-sm">$</span>
              </div>
            </div>
            <div v-if="inputs.initialGrant && inputs.initialGrant < 0" class="mt-1 text-sm text-red-600">
              Grant amounts cannot be negative
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Simulation Timeline Card -->
    <div class="card p-6 hover:shadow-md transition-shadow">
      <div class="flex items-center mb-6">
        <div class="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center mr-3">
          <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Simulation Timeline</h3>
          <p class="text-sm text-gray-600">Define the projection period and starting year</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Number of Years</label>
          <input 
            type="number" 
            v-model.number="options.years" 
            class="input-field w-full p-3 rounded-md" 
            placeholder="10" 
            min="1" 
            max="30" 
            @input="$emit('update:options', options)"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Starting Year</label>
          <input 
            type="number" 
            v-model.number="options.startYear" 
            class="input-field w-full p-3 rounded-md" 
            :placeholder="String(new Date().getFullYear())" 
            min="2000" 
            max="2100" 
            @input="$emit('update:options', options)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SimulationInputs, SimulationOptions } from '../../types/SettingsTypes';

interface Props {
  inputs: SimulationInputs;
  options: SimulationOptions;
}

interface Emits {
  (e: 'update:inputs', inputs: SimulationInputs): void;
  (e: 'update:options', options: SimulationOptions): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

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
</script>
