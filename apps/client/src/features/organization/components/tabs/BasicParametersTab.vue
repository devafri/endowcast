<template>
<div class="space-y-6">
  <!-- Simulation Timeline Card -->
  <section class="bg-slate-50 border border-slate-100 rounded-lg p-5">
  <div class="flex items-start gap-3 mb-4">
  <div class="h-10 w-1 rounded-md bg-accent"></div>
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
        :value="years" 
        @input="e => years = parseInt((e.target as HTMLInputElement).value) || 10"
        class="input-field w-full p-3 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100" 
        placeholder="10" 
        min="1" 
        max="30" 
      />
    </div>

    <!-- Starting Year -->
    <div>
      <label class="block text-sm font-medium text-slate-800 mb-2">Starting Year</label>
      <input 
        type="number" 
        :value="startYear" 
        @input="e => startYear = parseInt((e.target as HTMLInputElement).value) || new Date().getFullYear()"
        class="input-field w-full p-3 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100" 
        :placeholder="String(new Date().getFullYear())" 
        min="2000" 
        max="2100" 
      />
    </div>
  </div>
</section>

<!-- Financial Foundation Card -->
<section class="bg-slate-50 border border-slate-100 rounded-lg p-5">
  <div class="flex items-start gap-3 mb-4">
    <div class="h-10 w-1 rounded-md bg-accent"></div>
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

    <!-- Benchmark Configuration -->
    <div>
      <label class="block text-sm font-medium text-slate-800 mb-2">Benchmark</label>
      <div class="bg-white border border-slate-200 rounded-lg p-3 space-y-3">
        <div class="flex items-center justify-between">
          <label class="inline-flex items-center text-sm text-slate-700">
            <input
              type="checkbox"
              :checked="benchmarkEnabled"
              @change="onToggleBenchmark(($event.target as HTMLInputElement).checked)"
              class="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Enable benchmark comparison
          </label>
          <span class="text-xs text-slate-500">{{ benchmarkSummary }}</span>
        </div>

        <div v-if="benchmarkEnabled" class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Benchmark type</label>
            <select
              :value="benchmarkConfig.type"
              @change="onBenchmarkTypeChange(($event.target as HTMLSelectElement).value)"
              class="input-field w-full p-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="cpi_plus">CPI + Fixed Return</option>
              <option value="fixed">Fixed Annual Return</option>
              <option value="asset_class">Single Asset Class</option>
              <option value="blended">Blended Portfolio</option>
            </select>
          </div>

          <div v-if="benchmarkConfig.type === 'cpi_plus' || benchmarkConfig.type === 'fixed'">
            <label class="block text-xs font-medium text-slate-600 mb-1">
              {{ benchmarkConfig.type === 'cpi_plus' ? 'Additional return above CPI (%)' : 'Fixed annual return (%)' }}
            </label>
            <input
              type="number"
              :value="benchmarkConfig.value ?? 0"
              @input="onBenchmarkValueChange(($event.target as HTMLInputElement).value)"
              class="input-field w-full p-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              step="0.1"
              min="-10"
              max="20"
            />
            <p class="text-xs text-slate-500 mt-1">
              {{ benchmarkConfig.type === 'cpi_plus' ? 'Example: 6 means CPI + 6% annual return' : 'Fixed return regardless of inflation' }}
            </p>
          </div>

          <div v-else-if="benchmarkConfig.type === 'asset_class'">
            <label class="block text-xs font-medium text-slate-600 mb-1">Asset class to track</label>
            <select
              :value="benchmarkConfig.assetKey || ''"
              @change="onBenchmarkAssetChange(($event.target as HTMLSelectElement).value)"
              class="input-field w-full p-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="" disabled>Select asset class</option>
              <option v-for="asset in assetClassOptions" :key="asset.key" :value="asset.key">
                {{ asset.label }}
              </option>
            </select>
          </div>

          <div v-else class="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-2">
            Configure blended benchmark weights in the Benchmarks tab.
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Custom label (optional)</label>
            <input
              type="text"
              :value="benchmarkConfig.label || ''"
              @input="onBenchmarkLabelChange(($event.target as HTMLInputElement).value)"
              class="input-field w-full p-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Leave blank for auto-generated label"
            />
          </div>
        </div>
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

    <!-- Inflation (CPI) Assumption -->
    <div>
      <label class="block text-sm font-medium text-slate-800 mb-2">Inflation (CPI) Assumption (%)</label>
      <input
        type="number"
        v-model.number="inputs.inflationRate"
        :class="[
          'input-field w-full p-3 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100',
          inflationOutOfRange
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        ]"
        placeholder="2"
        step="0.1"
        min="-5"
        max="10"
        @input="$emit('update:inputs', inputs)"
      />
      <div v-if="inflationOutOfRange" class="mt-1 text-sm text-red-600">
        Inflation should be between -5% and 10%
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

    <!-- Risk-free Rate -->
    <div>
      <label class="block text-sm font-medium text-slate-800 mb-2">Risk-free Rate (%)</label>
      <input
        type="number"
        v-model.number="inputs.riskFreeRate"
        :class="[
          'input-field w-full p-3 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100',
          riskFreeOutOfRange
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        ]"
        placeholder="2"
        step="0.1"
        min="-5"
        max="15"
        @input="$emit('update:inputs', inputs)"
      />
      <div v-if="riskFreeOutOfRange" class="mt-1 text-sm text-red-600">
        Risk-free rate should be between -5% and 15%
      </div>
    </div>
  </div>
</section>

 <!-- Operating Commitments & Grants Card -->
<section class="bg-slate-50 border border-slate-100 rounded-lg p-5">
  <div class="flex items-start gap-3 mb-4">
    <div class="h-10 w-1 rounded-md bg-accent"></div>
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
    <div class="h-10 w-1 rounded-md bg-accent"></div>
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
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4C7F70]',
          enableGrantOverride ? 'bg-accent' : 'bg-slate-300'
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

</div>
  
</template>




<script setup lang="ts">
import { computed } from 'vue';
import type { SimulationInputs, SimulationOptions, BenchmarkConfig } from '../../types/SettingsTypes';
import GrantTargets from '../../../simulation/components/inputs/GrantTargets.vue';

interface Props {
  inputs: SimulationInputs;
  options: SimulationOptions;
  canAccessTab?: boolean; // Optional since basic tab is always accessible
  assetClasses?: Array<{ key: string; label: string }>;
}

interface Emits {
  (e: 'update:inputs', inputs: SimulationInputs): void;
  (e: 'update:options', options: SimulationOptions): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const DEFAULT_BENCHMARK: BenchmarkConfig = { enabled: false, type: 'cpi_plus', value: 6, label: 'CPI + 6%' };

const assetClassOptions = computed(() => props.assetClasses ?? []);

function cloneBenchmark(): BenchmarkConfig {
  const current = props.options.benchmark ? { ...props.options.benchmark } : { ...DEFAULT_BENCHMARK };
  if (props.options.benchmark?.blended) {
    current.blended = { ...props.options.benchmark.blended };
  }
  return current;
}

function emitBenchmarkUpdate(next: BenchmarkConfig) {
  emit('update:options', { ...props.options, benchmark: next });
}

function updateBenchmark(partial: Partial<BenchmarkConfig>) {
  const next = cloneBenchmark();
  Object.assign(next, partial);
  emitBenchmarkUpdate(next);
}

const benchmarkConfig = computed(() => props.options.benchmark ?? DEFAULT_BENCHMARK);
const benchmarkEnabled = computed(() => benchmarkConfig.value.enabled === true);

const benchmarkSummary = computed(() => {
  if (!benchmarkEnabled.value) return 'Disabled';
  const cfg = benchmarkConfig.value;
  switch (cfg.type) {
    case 'cpi_plus':
      return `CPI + ${(cfg.value ?? 0)}%`;
    case 'fixed':
      return `Fixed ${(cfg.value ?? 0)}%`;
    case 'asset_class':
      if (cfg.assetKey) {
        const label = assetClassOptions.value.find(a => a.key === cfg.assetKey)?.label;
        return label ? `Asset: ${label}` : `Asset: ${cfg.assetKey}`;
      }
      return 'Asset class';
    case 'blended':
      return 'Blended portfolio';
    default:
      return 'Configured';
  }
});

function ensureLabelForDefaults(next: BenchmarkConfig) {
  if (!next.label || next.label.startsWith('CPI +') || next.label.startsWith('Fixed')) {
    if (next.type === 'cpi_plus' && typeof next.value === 'number') {
      next.label = `CPI + ${next.value}%`;
    } else if (next.type === 'fixed' && typeof next.value === 'number') {
      next.label = `Fixed ${next.value}%`;
    }
  }
}

function onToggleBenchmark(enabled: boolean) {
  const next = cloneBenchmark();
  next.enabled = enabled;
  if (enabled) {
    if (!next.type) next.type = 'cpi_plus';
    if (next.type === 'cpi_plus' && typeof next.value !== 'number') next.value = 6;
    ensureLabelForDefaults(next);
  }
  emitBenchmarkUpdate(next);
}

function onBenchmarkTypeChange(type: string) {
  const next = cloneBenchmark();
  next.type = type as BenchmarkConfig['type'];
  if (type === 'cpi_plus') {
    if (typeof next.value !== 'number') next.value = 6;
    delete next.assetKey;
    ensureLabelForDefaults(next);
  } else if (type === 'fixed') {
    if (typeof next.value !== 'number') next.value = 6;
    delete next.assetKey;
    ensureLabelForDefaults(next);
  } else if (type === 'asset_class') {
    if (!next.assetKey && assetClassOptions.value.length) {
      next.assetKey = assetClassOptions.value[0].key;
    }
    delete next.value;
  } else if (type === 'blended') {
    if (!next.blended) next.blended = {};
  }
  emitBenchmarkUpdate(next);
}

function onBenchmarkValueChange(rawValue: string) {
  const parsed = parseFloat(rawValue);
  if (Number.isNaN(parsed)) {
    updateBenchmark({ value: undefined });
  } else {
    const next = cloneBenchmark();
    next.value = parsed;
    ensureLabelForDefaults(next);
    emitBenchmarkUpdate(next);
  }
}

function onBenchmarkAssetChange(assetKey: string) {
  updateBenchmark({ assetKey });
}

function onBenchmarkLabelChange(label: string) {
  updateBenchmark({ label });
}

// Create getter/setter computed properties for two-way binding on props
const years = computed({
  get: () => props.options.years || 10,
  set: (value: any) => {
    const numValue = typeof value === 'number' ? value : parseInt(String(value), 10);
    // Only emit if the value actually changed to avoid infinite update loops
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 30 && numValue !== props.options.years) {
      const newOptions = { ...props.options, years: numValue };
      emit('update:options', newOptions);
    }
  }
});

const startYear = computed({
  get: () => props.options.startYear || new Date().getFullYear(),
  set: (value: any) => {
    const numValue = typeof value === 'number' ? value : parseInt(String(value), 10);
    // Only emit if the value actually changed to avoid infinite update loops
    if (!isNaN(numValue) && numValue >= 2000 && numValue <= 2100 && numValue !== props.options.startYear) {
      const newOptions = { ...props.options, startYear: numValue };
      emit('update:options', newOptions);
    }
  }
});

const inflationOutOfRange = computed(() => {
  const val = props.inputs.inflationRate;
  if (val === undefined || val === null) return false;
  return val < -5 || val > 10;
});

const riskFreeOutOfRange = computed(() => {
  const val = props.inputs.riskFreeRate;
  if (val === undefined || val === null) return false;
  return val < -5 || val > 15;
});

// Computed properties for validation states
const isFinancialSectionComplete = computed(() => {
  const hasValidRiskFree = props.inputs.riskFreeRate !== undefined && props.inputs.riskFreeRate !== null && !riskFreeOutOfRange.value;
  const hasValidInflation = props.inputs.inflationRate !== undefined && props.inputs.inflationRate !== null && !inflationOutOfRange.value;
  return props.inputs.initialEndowment >= 1000000 &&
         props.inputs.spendingPolicyRate >= 0 && props.inputs.spendingPolicyRate <= 15 &&
         props.inputs.investmentExpenseRate >= 0 && props.inputs.investmentExpenseRate <= 5 &&
         hasValidRiskFree && hasValidInflation;
});

const hasFinancialErrors = computed(() => {
  return (props.inputs.initialEndowment && props.inputs.initialEndowment < 1000000) ||
         (props.inputs.spendingPolicyRate && (props.inputs.spendingPolicyRate < 0 || props.inputs.spendingPolicyRate > 15)) ||
         (props.inputs.investmentExpenseRate && (props.inputs.investmentExpenseRate < 0 || props.inputs.investmentExpenseRate > 5)) ||
         riskFreeOutOfRange.value ||
         inflationOutOfRange.value ||
         (props.inputs.initialOperatingExpense && props.inputs.initialOperatingExpense < 0) ||
         (props.inputs.initialGrant && props.inputs.initialGrant < 0);
});

// Computed property to check if grant override is enabled (has array, even if all zeros)
const isGrantOverrideEnabled = computed(() => Array.isArray(props.inputs.grantTargets) && props.inputs.grantTargets.length > 0);

// Toggle for enabling per-year grant targets (manual override)
// Make this a computed property that derives from store state for persistence
const enableGrantOverride = computed({
  get: () => isGrantOverrideEnabled.value,
  set: (value: boolean) => {
    if (value) {
      // When the toggle is switched ON:
      // Initialize grantTargets array with zeros for the current number of years
      const years = props.options.years || 10;
      (props.inputs as any).grantTargets = Array(years).fill(0);
      emit('update:inputs', props.inputs);
    } else {
      // When the toggle is switched OFF:
      // Reset the grantTargets in the data model to an empty array.
      // This tells the engine to use the residual calculation logic.
      (props.inputs as any).grantTargets = [];
      emit('update:inputs', props.inputs);
    }
  }
});

function onUpdateGrantTargets(nv: number[]) {
  // Update nested prop and emit to keep parent store in sync
  (props.inputs as any).grantTargets = nv;
  // Emit the entire inputs object to mirror other inputs behavior
  // (the parent merges into sim.inputs)
  emit('update:inputs', props.inputs);
}
</script>
