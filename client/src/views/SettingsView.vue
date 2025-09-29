<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useSimulationStore } from '../stores/simulation';
import { useAuthStore } from '../stores/auth';
import GrantTargets from '../components/inputs/GrantTargets.vue';
import CorrelationMatrix from '../components/inputs/CorrelationMatrix.vue';
import { assetClasses } from '../lib/monteCarlo';

const sim = useSimulationStore();
const auth = useAuthStore();
const activeTab = ref('basic');
const showOnboardingTip = ref(true);

const tabs = [
  { id: 'basic', label: 'Basic Parameters', icon: '📊', feature: 'basic' },
  { id: 'spending', label: 'Spending & Policy', icon: '💰', feature: 'stress' },
  { id: 'stress', label: 'Stress Testing', icon: '⚠️', feature: 'stress' },
  { id: 'assets', label: 'Asset Classes', icon: '📈', feature: 'advanced' },
  { id: 'advanced', label: 'Advanced', icon: '⚙️', feature: 'advanced' },
  { id: 'benchmarks', label: 'Benchmarks', icon: '🎯', feature: 'advanced' }
];

const availableTabs = computed(() => {
  return tabs.filter(tab => auth.hasFeature(tab.feature));
});

const restrictedTabs = computed(() => {
  return tabs.filter(tab => !auth.hasFeature(tab.feature));
});

const isTrialUser = computed(() => {
  return auth.subscription?.planType === 'FREE';
});

const canAccessTab = (tabId: string) => {
  const tab = tabs.find(t => t.id === tabId);
  return tab ? auth.hasFeature(tab.feature) : false;
};

const switchToTab = (tabId: string) => {
  if (canAccessTab(tabId)) {
    activeTab.value = tabId;
  }
};

const seed = computed({
  get: () => sim.options.seed,
  set: v => (sim.options.seed = Number(v))
});

function ensureOverride(key: string) {
  if (!sim.options.assets) (sim.options as any).assets = { overrides: {} };
  if (!sim.options.assets!.overrides) (sim.options.assets as any).overrides = {};
  if (!(sim.options.assets!.overrides as any)[key]) (sim.options.assets!.overrides as any)[key] = {};
}

function getOverrideMeanPct(key: string, defMean: number): number | undefined {
  const val = (sim.options.assets?.overrides as any)?.[key]?.mean;
  return typeof val === 'number' ? val * 100 : undefined;
}

function setOverrideMeanPct(key: string, e: any) {
  const val = parseFloat(e.target.value);
  if (isNaN(val) || e.target.value === '') {
    if ((sim.options.assets?.overrides as any)?.[key]) {
      delete (sim.options.assets!.overrides as any)[key].mean;
    }
  } else {
    ensureOverride(key);
    (sim.options.assets!.overrides as any)[key].mean = val / 100;
  }
}

function getOverrideSdPct(key: string, defSd: number): number | undefined {
  const val = (sim.options.assets?.overrides as any)?.[key]?.sd;
  return typeof val === 'number' ? val * 100 : undefined;
}

function setOverrideSdPct(key: string, e: any) {
  const val = parseFloat(e.target.value);
  if (isNaN(val) || e.target.value === '') {
    if ((sim.options.assets?.overrides as any)?.[key]) {
      delete (sim.options.assets!.overrides as any)[key].sd;
    }
  } else {
    ensureOverride(key);
    (sim.options.assets!.overrides as any)[key].sd = val / 100;
  }
}

function addEquityShock() {
  if (!sim.options.stress) (sim.options as any).stress = { equityShocks: [], cpiShifts: [] };
  if (!sim.options.stress!.equityShocks) sim.options.stress!.equityShocks = [];
  sim.options.stress!.equityShocks.push({ assetKey: 'publicEquity', pct: -20, year: 1 });
}

function removeEquityShock(index: number) {
  if (sim.options.stress?.equityShocks) {
    sim.options.stress.equityShocks.splice(index, 1);
  }
}

function addCpiShock() {
  if (!sim.options.stress) (sim.options as any).stress = { equityShocks: [], cpiShifts: [] };
  if (!sim.options.stress!.cpiShifts) sim.options.stress!.cpiShifts = [];
  sim.options.stress!.cpiShifts.push({ deltaPct: 2, from: 1, to: 10 });
}

function removeCpiShock(index: number) {
  if (sim.options.stress?.cpiShifts) {
    sim.options.stress.cpiShifts.splice(index, 1);
  }
}

function normalizeBenchmarkWeights() {
  const blended = (sim.options.benchmark as any)?.blended || {};
  const total = Object.values(blended).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
  
  if (total > 0) {
    Object.keys(blended).forEach(key => {
      const value = Number(blended[key]) || 0;
      blended[key] = Math.round((value / total) * 100);
    });
  }
}

// Form validation computed properties
const hasValidationErrors = computed(() => {
  return (
    (sim.inputs.initialEndowment && sim.inputs.initialEndowment < 1000000) ||
    (sim.inputs.spendingPolicyRate && (sim.inputs.spendingPolicyRate < 0 || sim.inputs.spendingPolicyRate > 15)) ||
    (sim.inputs.investmentExpenseRate && (sim.inputs.investmentExpenseRate < 0 || sim.inputs.investmentExpenseRate > 5)) ||
    (sim.inputs.initialOperatingExpense && sim.inputs.initialOperatingExpense < 0) ||
    (sim.inputs.initialGrant && sim.inputs.initialGrant < 0)
  );
});

const hasRequiredFields = computed(() => {
  return (
    sim.inputs.initialEndowment && sim.inputs.initialEndowment >= 1000000 &&
    sim.inputs.spendingPolicyRate && sim.inputs.spendingPolicyRate >= 0 && sim.inputs.spendingPolicyRate <= 15
  );
});

const hasFinancialErrors = computed(() => {
  return (
    (sim.inputs.initialEndowment && sim.inputs.initialEndowment < 1000000) ||
    (sim.inputs.spendingPolicyRate && (sim.inputs.spendingPolicyRate < 0 || sim.inputs.spendingPolicyRate > 15)) ||
    (sim.inputs.investmentExpenseRate && (sim.inputs.investmentExpenseRate < 0 || sim.inputs.investmentExpenseRate > 5))
  );
});

const isFinancialSectionComplete = computed(() => {
  return (
    sim.inputs.initialEndowment && sim.inputs.initialEndowment >= 1000000 &&
    sim.inputs.spendingPolicyRate && sim.inputs.spendingPolicyRate >= 0 && sim.inputs.spendingPolicyRate <= 15 &&
    sim.inputs.investmentExpenseRate !== undefined && sim.inputs.investmentExpenseRate >= 0 && sim.inputs.investmentExpenseRate <= 5
  );
});
</script>

<template>
  <main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Configuration Settings</h1>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          Define your endowment's fundamental parameters and modeling assumptions
        </p>
        <div class="mt-6 flex items-center justify-center">
          <div class="flex items-center bg-white rounded-full px-4 py-2 shadow-md">
            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span class="text-blue-600 font-semibold text-sm">2</span>
            </div>
            <span class="text-gray-700 font-medium">Settings & Assumptions</span>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="mb-8">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <nav class="flex space-x-1 overflow-x-auto" aria-label="Tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="switchToTab(tab.id)"
              :disabled="!canAccessTab(tab.id)"
              :class="[
                'flex-shrink-0 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap relative',
                activeTab === tab.id && canAccessTab(tab.id)
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : canAccessTab(tab.id)
                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 cursor-pointer'
                  : 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-75'
              ]"
            >
              <span class="mr-2">{{ tab.icon }}</span>
              {{ tab.label }}
              <!-- Trial User Lock Icon -->
              <svg 
                v-if="!canAccessTab(tab.id)" 
                class="w-4 h-4 ml-2 text-amber-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a1 1 0 001-1v-6a1 1 0 00-1-1H6a1 1 0 00-1 1v6a1 1 0 001 1zM12 9a3 3 0 110-6 3 3 0 010 6z"></path>
              </svg>
            </button>
          </nav>
        </div>
        
        <!-- Trial User Upgrade Banner -->
        <div v-if="isTrialUser && restrictedTabs.length > 0" class="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5 text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <h3 class="text-sm font-medium text-amber-900 mb-1">🚀 Unlock Advanced Features</h3>
              <div class="text-sm text-amber-800">
                <p class="mb-2">Your trial account has access to <strong>Basic Parameters</strong> only. Upgrade to unlock:</p>
                <ul class="list-disc list-inside space-y-1 text-amber-800">
                  <li><strong>Advanced Spending Policies:</strong> Smoothing rules, inflation adjustments</li>
                  <li><strong>Stress Testing:</strong> Market shock scenarios and risk analysis</li>
                  <li><strong>Asset Class Customization:</strong> Override default return assumptions</li>
                  <li><strong>Portfolio Benchmarking:</strong> Compare against custom benchmarks</li>
                </ul>
              </div>
            </div>
            <div class="ml-4">
              <RouterLink 
                to="/pricing" 
                class="inline-flex items-center px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded-md transition-colors"
              >
                Upgrade Now
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </RouterLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Onboarding Helper -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-blue-900 mb-1">Getting Started</h3>
            <div class="text-sm text-blue-800">
              <p class="mb-2 font-medium">Configure your endowment parameters in order:</p>
              <ol class="list-decimal list-inside space-y-1 text-blue-800 font-medium">
                <li><strong>Basic Parameters:</strong> Set your endowment size and spending policy</li>
                <li><strong>Asset Allocation:</strong> Define your investment mix across asset classes</li>
                <li><strong>Market Assumptions:</strong> Adjust expected returns and volatility (optional)</li>
                <li><strong>Advanced Settings:</strong> Fine-tune simulation parameters (optional)</li>
              </ol>
              <p class="mt-2 text-blue-800 font-semibold">💡 Tip: Default assumptions are based on institutional best practices</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="space-y-6">
        <!-- Basic Parameters Tab -->
        <div v-show="activeTab === 'basic'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Initial Endowment Value</label>
                  <div class="relative">
                    <input 
                      type="number" 
                      v-model.number="sim.inputs.initialEndowment" 
                      :class="[
                        'input-field w-full p-3 pl-14 pr-10 rounded-md',
                        sim.inputs.initialEndowment && sim.inputs.initialEndowment < 1000000 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                          : sim.inputs.initialEndowment && sim.inputs.initialEndowment >= 1000000
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      ]"
                      placeholder="50000000" 
                      step="1000000" 
                      min="1000000" 
                    />
                    <div class="absolute inset-y-0 left-0 pl-1 pr-1 flex items-center pointer-events-none">
                      <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <div v-if="sim.inputs.initialEndowment && sim.inputs.initialEndowment >= 1000000" class="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  </div>
                  <div v-if="sim.inputs.initialEndowment && sim.inputs.initialEndowment < 1000000" class="mt-1 text-sm text-red-600">
                    Minimum endowment value is $1,000,000
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Spending Policy Rate (%)</label>
                  <input 
                    type="number" 
                    v-model.number="sim.inputs.spendingPolicyRate" 
                    :class="[
                      'input-field w-full p-3 rounded-md',
                      sim.inputs.spendingPolicyRate && (sim.inputs.spendingPolicyRate < 0 || sim.inputs.spendingPolicyRate > 15)
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    ]"
                    placeholder="5" 
                    step="0.1" 
                    min="0" 
                    max="15" 
                  />
                  <div v-if="sim.inputs.spendingPolicyRate && (sim.inputs.spendingPolicyRate < 0 || sim.inputs.spendingPolicyRate > 15)" class="mt-1 text-sm text-red-600">
                    Spending rate should be between 0% and 15%
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Investment Expense Rate (%)</label>
                  <input 
                    type="number" 
                    v-model.number="sim.inputs.investmentExpenseRate" 
                    :class="[
                      'input-field w-full p-3 rounded-md',
                      sim.inputs.investmentExpenseRate && (sim.inputs.investmentExpenseRate < 0 || sim.inputs.investmentExpenseRate > 5)
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    ]"
                    placeholder="1" 
                    step="0.1" 
                    min="0" 
                    max="5" 
                  />
                  <div v-if="sim.inputs.investmentExpenseRate && (sim.inputs.investmentExpenseRate < 0 || sim.inputs.investmentExpenseRate > 5)" class="mt-1 text-sm text-red-600">
                    Investment expenses should be between 0% and 5%
                  </div>
                </div>
              </div>
            </div>

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
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Initial Operating Expense</label>
                  <div class="relative">
                    <input 
                      type="number" 
                      v-model.number="sim.inputs.initialOperatingExpense" 
                      :class="[
                        'input-field w-full p-3 pl-12 rounded-md',
                        sim.inputs.initialOperatingExpense && sim.inputs.initialOperatingExpense < 0
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      ]"
                      placeholder="1000000" 
                      step="50000" 
                      min="0" 
                    />
                    <div class="absolute inset-y-0 left-0 pl-1 pr-1 flex items-center pointer-events-none">
                      <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                  </div>
                  <div v-if="sim.inputs.initialOperatingExpense && sim.inputs.initialOperatingExpense < 0" class="mt-1 text-sm text-red-600">
                    Operating expenses cannot be negative
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Initial Grant Amount</label>
                  <div class="relative">
                    <input 
                      type="number" 
                      v-model.number="sim.inputs.initialGrant" 
                      :class="[
                        'input-field w-full p-3 pl-12 rounded-md',
                        sim.inputs.initialGrant && sim.inputs.initialGrant < 0
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      ]"
                      placeholder="1500000" 
                      step="50000" 
                      min="0" 
                    />
                    <div class="absolute inset-y-0 left-0 pl-1 pr-1 flex items-center pointer-events-none">
                      <span class="text-gray-500 sm:text-sm">$</span>
                    </div>
                  </div>
                  <div v-if="sim.inputs.initialGrant && sim.inputs.initialGrant < 0" class="mt-1 text-sm text-red-600">
                    Grant amounts cannot be negative
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                <input type="number" v-model.number="sim.options.years" class="input-field w-full p-3 rounded-md" placeholder="10" min="1" max="30" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Starting Year</label>
                <input type="number" v-model.number="sim.options.startYear" class="input-field w-full p-3 rounded-md" :placeholder="String(new Date().getFullYear())" min="2000" max="2100" />
              </div>
            </div>
          </div>
        </div>

        <!-- Spending & Policy Tab -->
        <div v-show="activeTab === 'spending'" class="space-y-6">
          <div v-if="!canAccessTab('spending')" class="relative">
            <div class="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
              <div class="text-center p-8">
                <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a1 1 0 001-1v-6a1 1 0 00-1-1H6a1 1 0 00-1 1v6a1 1 0 001 1zM12 9a3 3 0 110-6 3 3 0 010 6z"></path>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">🚀 Advanced Spending Policies</h3>
                <p class="text-gray-600 mb-4">Upgrade to access sophisticated spending rules, grant targeting, and policy smoothing features.</p>
                <RouterLink to="/pricing" class="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-md transition-colors">
                  Upgrade Now
                  <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </RouterLink>
              </div>
            </div>
            <div class="opacity-30 pointer-events-none">
              <GrantTargets />
            </div>
          </div>
          <GrantTargets v-else />
        </div>

        <!-- Stress Testing Tab -->
        <div v-show="activeTab === 'stress'" class="space-y-6">
          <div v-if="!canAccessTab('stress')" class="relative">
            <div class="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
              <div class="text-center p-8">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">⚠️ Stress Testing & Risk Analysis</h3>
                <p class="text-gray-600 mb-4">Upgrade to model market shocks, asset class stress scenarios, and inflation impacts.</p>
                <RouterLink to="/pricing" class="inline-flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-md transition-colors">
                  Upgrade Now
                  <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </RouterLink>
              </div>
            </div>
            <div class="opacity-30 pointer-events-none">
              <div class="card p-6">
                <div class="flex items-center mb-6">
                  <div class="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Stress Testing</h3>
                    <p class="text-sm text-gray-600">Model adverse scenarios and market shocks</p>
                  </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div class="bg-red-50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-4">
                      <h4 class="text-sm font-semibold text-gray-900">Asset Class Shocks</h4>
                    </div>
                    <div class="text-sm text-gray-600 italic">
                      Configure market stress scenarios...
                    </div>
                  </div>
                  <div class="bg-amber-50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-4">
                      <h4 class="text-sm font-semibold text-gray-900">CPI Inflation Shifts</h4>
                    </div>
                    <div class="text-sm text-gray-600 italic">
                      Model inflation scenarios...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="card p-6">
            <div class="flex items-center mb-6">
              <div class="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Stress Testing</h3>
                <p class="text-sm text-gray-600">Model adverse scenarios and market shocks</p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div class="bg-red-50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-4">
                  <h4 class="text-sm font-semibold text-gray-900">Asset Class Shocks</h4>
                  <button type="button" @click="addEquityShock" class="btn-secondary py-1 px-3 text-sm hover:bg-gray-100 transition-colors">
                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Add Shock
                  </button>
                </div>
                <div v-if="!sim.options.stress?.equityShocks?.length" class="text-sm text-gray-600 italic">
                  No asset class shocks configured. Click "Add Shock" to simulate market stress scenarios.
                </div>
                <div v-else class="space-y-3">
                  <div v-for="(shock, index) in sim.options.stress.equityShocks" :key="index" class="flex items-center gap-3 bg-white rounded p-3">
                    <div class="flex-1">
                      <label class="block text-xs font-medium text-gray-700 mb-1">Asset Class</label>
                      <select v-model="shock.assetKey" class="input-field w-full p-2 rounded-md">
                        <option v-for="asset in assetClasses" :key="asset.key" :value="asset.key">
                          {{ asset.label }}
                        </option>
                      </select>
                    </div>
                    <div class="flex-1">
                      <label class="block text-xs font-medium text-gray-700 mb-1">Shock Impact (%)</label>
                      <input type="number" v-model.number="shock.pct" step="1" min="-90" max="50" class="input-field w-full p-2 rounded-md" placeholder="e.g. -30" />
                    </div>
                    <div class="flex-1">
                      <label class="block text-xs font-medium text-gray-700 mb-1">Year</label>
                      <input type="number" v-model.number="shock.year" :min="1" :max="sim.options.years || 10" class="input-field w-full p-2 rounded-md" placeholder="e.g. 2" />
                    </div>
                    <button type="button" @click="removeEquityShock(index)" class="text-red-600 hover:text-red-800 p-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div class="bg-amber-50 rounded-lg p-4">
                <div class="flex items-center justify-between mb-4">
                  <h4 class="text-sm font-semibold text-gray-900">CPI Inflation Shifts</h4>
                  <button type="button" @click="addCpiShock" class="btn-secondary py-1 px-3 text-sm hover:bg-gray-100 transition-colors">
                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Add Shift
                  </button>
                </div>
                <div v-if="!sim.options.stress?.cpiShifts?.length" class="text-sm text-gray-600 italic">
                  No CPI shifts configured. Click "Add Shift" to model inflation scenarios.
                </div>
                <div v-else class="space-y-3">
                  <div v-for="(shift, index) in sim.options.stress.cpiShifts" :key="index" class="flex items-center gap-3 bg-white rounded p-3">
                    <div class="flex-1">
                      <label class="block text-xs font-medium text-gray-700 mb-1">Delta (%)</label>
                      <input type="number" v-model.number="shift.deltaPct" step="0.5" min="-10" max="10" class="input-field w-full p-2 rounded-md" placeholder="e.g. 2.5" />
                    </div>
                    <div class="flex-1">
                      <label class="block text-xs font-medium text-gray-700 mb-1">From Year</label>
                      <input type="number" v-model.number="shift.from" :min="1" :max="sim.options.years || 10" class="input-field w-full p-2 rounded-md" placeholder="e.g. 3" />
                    </div>
                    <div class="flex-1">
                      <label class="block text-xs font-medium text-gray-700 mb-1">To Year</label>
                      <input type="number" v-model.number="shift.to" :min="shift.from || 1" :max="sim.options.years || 10" class="input-field w-full p-2 rounded-md" placeholder="e.g. 10" />
                    </div>
                    <button type="button" @click="removeCpiShock(index)" class="text-red-600 hover:text-red-800 p-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Asset Classes Tab -->
        <div v-show="activeTab === 'assets'" class="space-y-6">
          <div v-if="!canAccessTab('assets')" class="relative">
            <div class="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
              <div class="text-center p-8">
                <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">📈 Custom Asset Class Assumptions</h3>
                <p class="text-gray-600 mb-4">Upgrade to customize expected returns and volatility for each asset class in your portfolio.</p>
                <RouterLink to="/pricing" class="inline-flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-md transition-colors">
                  Upgrade Now
                  <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </RouterLink>
              </div>
            </div>
            <div class="opacity-30 pointer-events-none">
              <div class="card p-6">
                <div class="flex items-center mb-6">
                  <div class="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Asset Class Assumptions</h3>
                    <p class="text-sm text-gray-600">Customize expected returns and volatility</p>
                  </div>
                </div>
                <div class="space-y-4">
                  <div v-for="a in assetClasses.slice(0, 3)" :key="a.key" class="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div>
                      <div class="font-medium text-gray-900">{{ a.label }}</div>
                      <div class="text-xs text-gray-500 mt-1">Default μ {{ (a.mean*100).toFixed(1) }}% / σ {{ (a.sd*100).toFixed(1) }}%</div>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Expected Return (%)</label>
                      <input type="number" disabled class="input-field w-full p-2 rounded-md bg-gray-100" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Volatility (%)</label>
                      <input type="number" disabled class="input-field w-full p-2 rounded-md bg-gray-100" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="card p-6">
            <div class="flex items-center mb-6">
              <div class="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Asset Class Assumptions</h3>
                <p class="text-sm text-gray-600">Customize expected returns and volatility for each asset class</p>
              </div>
            </div>
            <div class="space-y-4">
              <div v-for="a in assetClasses" :key="a.key" class="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div>
                  <div class="font-medium text-gray-900">{{ a.label }}</div>
                  <div class="text-xs text-gray-500 mt-1">Default μ {{ (a.mean*100).toFixed(1) }}% / σ {{ (a.sd*100).toFixed(1) }}%</div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Expected Return (%)</label>
                  <input type="number" step="0.1" :placeholder="(a.mean*100).toFixed(1)" :value="getOverrideMeanPct(a.key, a.mean)" @input="setOverrideMeanPct(a.key, $event)" class="input-field w-full p-2 rounded-md" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Volatility (%)</label>
                  <input type="number" step="0.1" :placeholder="(a.sd*100).toFixed(1)" :value="getOverrideSdPct(a.key, a.sd)" @input="setOverrideSdPct(a.key, $event)" class="input-field w-full p-2 rounded-md" />
                </div>
                <div class="flex justify-end md:justify-start">
                  <div class="text-xs text-gray-500 italic">Annual metrics</div>
                </div>
              </div>
            </div>
            <div class="mt-4 flex justify-between items-center pt-4 border-t border-gray-200">
              <p class="text-xs text-gray-500">Leave blank to use default institutional assumptions</p>
              <button type="button" class="btn-secondary py-2 px-3 text-sm hover:bg-gray-100 transition-colors" @click="(sim.options.assets as any).overrides = {}">Reset All</button>
            </div>
          </div>
        </div>

        <!-- Advanced Tab -->
        <div v-show="activeTab === 'advanced'" class="space-y-6">
          <div v-if="!canAccessTab('advanced')" class="relative">
            <div class="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
              <div class="text-center p-8">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">⚙️ Advanced Portfolio Management</h3>
                <p class="text-gray-600 mb-4">Upgrade to access sophisticated spending policies, rebalancing rules, and correlation matrix customization.</p>
                <RouterLink to="/pricing" class="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors">
                  Upgrade Now
                  <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </RouterLink>
              </div>
            </div>
            <div class="opacity-30 pointer-events-none">
              <div class="card p-6">
                <div class="flex items-center mb-6">
                  <div class="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Advanced Settings</h3>
                    <p class="text-sm text-gray-600">Fine-tune spending policies and portfolio management</p>
                  </div>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div class="space-y-4">
                    <div class="bg-blue-50 rounded-lg p-4">
                      <h4 class="text-sm font-semibold text-gray-900 mb-3">Advanced Spending Rules</h4>
                      <div class="space-y-2 text-xs text-gray-600">
                        <div>• Multi-year averaging</div>
                        <div>• Annual change limits</div>
                        <div>• Inflation adjustments</div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="space-y-4">
                    <div class="bg-green-50 rounded-lg p-4">
                      <h4 class="text-sm font-semibold text-gray-900 mb-3">Rebalancing Settings</h4>
                      <div class="space-y-2 text-xs text-gray-600">
                        <div>• Tolerance bands</div>
                        <div>• Rebalancing frequency</div>
                        <div>• Transaction costs</div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="space-y-4">
                    <div class="bg-orange-50 rounded-lg p-4">
                      <h4 class="text-sm font-semibold text-gray-900 mb-3">Correlation Matrix</h4>
                      <div class="space-y-2 text-xs text-gray-600">
                        <div>• Asset correlations</div>
                        <div>• Risk modeling</div>
                        <div>• Diversification analysis</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="card p-6">
            <div class="flex items-center mb-6">
              <div class="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Advanced Settings</h3>
                <p class="text-sm text-gray-600">Fine-tune spending policies and portfolio management</p>
              </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-900 mb-2">Spending Policy Method</label>
                  <select v-model="(sim.options.spendingPolicy as any).type" class="input-field w-full p-3 rounded-md border-gray-300">
                    <option value="simple">Simple (current market value)</option>
                    <option value="avgMV3">3-year average market value</option>
                    <option value="avgMV5">5-year average market value</option>
                  </select>
                </div>
                <div class="bg-blue-50 rounded-lg p-4">
                  <h4 class="text-sm font-semibold text-gray-900 mb-3">Annual Change Limits</h4>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Floor (min %)</label>
                      <input type="number" step="0.5" min="-50" max="50" v-model.number="(sim.options.spendingPolicy as any).floorYoY" class="input-field w-full p-2 rounded-md" placeholder="e.g. -5" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Cap (max %)</label>
                      <input type="number" step="0.5" min="-50" max="200" v-model.number="(sim.options.spendingPolicy as any).capYoY" class="input-field w-full p-2 rounded-md" placeholder="e.g. 10" />
                    </div>
                  </div>
                  <label class="inline-flex items-center mt-3 text-sm cursor-pointer hover:text-blue-700">
                    <input type="checkbox" v-model="(sim.options.spendingPolicy as any).cpiLinked" class="mr-2 text-blue-600" /> 
                    Adjust limits for inflation (CPI)
                  </label>
                </div>
              </div>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-900 mb-2">Portfolio Rebalancing</label>
                  <div class="bg-green-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Tolerance Band (%)</label>
                      <input type="number" step="1" min="0" max="25" v-model.number="sim.options.rebalancing!.bandPct" class="input-field w-full p-2 rounded-md" placeholder="e.g. 5" />
                      <p class="text-xs text-gray-500 mt-1">Trigger rebalancing when allocations drift beyond this threshold</p>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
                      <select v-model="sim.options.rebalancing!.frequency" class="input-field w-full p-2 rounded-md">
                        <option value="annual">Annual Review</option>
                        <option value="never">Never (Buy & Hold)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-900 mb-2">Corpus & Reproducibility</label>
                  <div class="bg-orange-50 rounded-lg p-4 space-y-3">
                    <div class="flex items-center">
                      <input type="checkbox" v-model="(sim.options.corpus as any).enabled" class="mr-3 text-orange-600" />
                      <div>
                        <label class="text-sm font-medium text-gray-900">Enable Corpus Tracking</label>
                        <p class="text-xs text-gray-600">Track inflation-adjusted benchmark</p>
                      </div>
                    </div>
                    
                    <div v-if="(sim.options.corpus as any).enabled">
                      <label class="block text-xs font-medium text-gray-700 mb-1">Initial Corpus Value</label>
                      <input type="number" v-model.number="(sim.options.corpus as any).initialValue" class="input-field w-full p-2 rounded-md" placeholder="246900000" step="1000000" min="0" />
                    </div>
                  </div>
                  
                  <div class="bg-yellow-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Random Seed (optional)</label>
                      <input type="number" v-model.number="sim.options.seed" class="input-field w-full p-2 rounded-md" placeholder="e.g. 12345" />
                      <p class="text-xs text-gray-500 mt-1">Use same seed for identical results across runs</p>
                    </div>
                    <div class="pt-2">
                      <button type="button" class="btn-secondary py-2 px-3 text-sm w-full hover:bg-gray-100 transition-colors" @click="sim.copyShareLink">
                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                        </svg>
                        Copy Shareable Link
                      </button>
                      <p class="text-xs text-gray-500 mt-2 text-center">Share your settings with colleagues or save for later</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Correlation Matrix Section -->
            <div class="mt-8">
              <CorrelationMatrix v-model="sim.options.correlationMatrix!" />
            </div>
          </div>
        </div>

        <!-- Benchmarks Tab -->
        <div v-show="activeTab === 'benchmarks'" class="space-y-6">
          <div v-if="!canAccessTab('benchmarks')" class="relative">
            <div class="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
              <div class="text-center p-8">
                <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">🎯 Custom Benchmarking</h3>
                <p class="text-gray-600 mb-4">Upgrade to compare your endowment's performance against custom benchmarks and market indices.</p>
                <RouterLink to="/pricing" class="inline-flex items-center px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-md transition-colors">
                  Upgrade Now
                  <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </RouterLink>
              </div>
            </div>
            <div class="opacity-30 pointer-events-none">
              <div class="card p-6">
                <div class="flex items-center mb-6">
                  <div class="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center mr-3">
                    <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">Benchmark Settings</h3>
                    <p class="text-sm text-gray-600">Configure performance benchmarks</p>
                  </div>
                </div>
                
                <div class="bg-purple-50 rounded-lg p-4 space-y-4">
                  <div class="flex items-center">
                    <input type="checkbox" disabled class="mr-3 text-purple-600" />
                    <div>
                      <label class="text-sm font-medium text-gray-900">Enable Benchmark Comparison</label>
                      <p class="text-xs text-gray-600">Show benchmark in simulation charts</p>
                    </div>
                  </div>
                  
                  <div class="space-y-2 text-xs text-gray-600">
                    <div>• CPI + Fixed Return benchmarks</div>
                    <div>• Custom asset class tracking</div>
                    <div>• Blended portfolio benchmarks</div>
                    <div>• Performance comparison charts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="card p-6">
            <div class="flex items-center mb-6">
              <div class="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Benchmark Settings</h3>
                <p class="text-sm text-gray-600">Configure performance benchmark for comparison analysis</p>
              </div>
            </div>
            
            <div class="bg-purple-50 rounded-lg p-4 space-y-4">
              <div class="flex items-center">
                <input type="checkbox" v-model="(sim.options.benchmark as any).enabled" class="mr-3 text-purple-600" />
                <div>
                  <label class="text-sm font-medium text-gray-900">Enable Benchmark Comparison</label>
                  <p class="text-xs text-gray-600">Show benchmark line in simulation charts</p>
                </div>
              </div>
              
              <div v-if="(sim.options.benchmark as any).enabled" class="space-y-4 pt-3 border-t border-purple-200">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Benchmark Type</label>
                  <select v-model="(sim.options.benchmark as any).type" class="input-field w-full p-3 rounded-md">
                    <option value="cpi_plus">CPI + Fixed Return</option>
                    <option value="fixed">Fixed Annual Return</option>
                    <option value="asset_class">Single Asset Class</option>
                    <option value="blended">Blended Portfolio</option>
                  </select>
                </div>
                
                <!-- CPI Plus Configuration -->
                <div v-if="(sim.options.benchmark as any).type === 'cpi_plus'" class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Additional Return above CPI (%)</label>
                    <input type="number" v-model.number="(sim.options.benchmark as any).value" class="input-field w-full p-3 rounded-md" placeholder="6" step="0.1" min="-5" max="15" />
                    <p class="text-xs text-gray-500 mt-1">Example: 6% means CPI + 6% annual return</p>
                  </div>
                </div>
                
                <!-- Fixed Return Configuration -->
                <div v-if="(sim.options.benchmark as any).type === 'fixed'" class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Fixed Annual Return (%)</label>
                    <input type="number" v-model.number="(sim.options.benchmark as any).value" class="input-field w-full p-3 rounded-md" placeholder="6" step="0.1" min="-10" max="20" />
                    <p class="text-xs text-gray-500 mt-1">Fixed return regardless of inflation</p>
                  </div>
                </div>
                
                <!-- Asset Class Configuration -->
                <div v-if="(sim.options.benchmark as any).type === 'asset_class'" class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Asset Class to Track</label>
                    <select v-model="(sim.options.benchmark as any).assetKey" class="input-field w-full p-3 rounded-md">
                      <option v-for="asset in assetClasses" :key="asset.key" :value="asset.key">
                        {{ asset.label }}
                      </option>
                    </select>
                    <p class="text-xs text-gray-500 mt-1">Benchmark follows the performance of this asset class</p>
                  </div>
                </div>
                
                <!-- Blended Portfolio Configuration -->
                <div v-if="(sim.options.benchmark as any).type === 'blended'" class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Benchmark Portfolio Weights</label>
                    <div class="grid grid-cols-2 gap-3">
                      <div v-for="asset in assetClasses" :key="asset.key" class="space-y-1">
                        <label class="block text-xs font-medium text-gray-700">{{ asset.label }} (%)</label>
                        <input type="number" v-model.number="(sim.options.benchmark as any).blended[asset.key]" class="input-field w-full p-2 rounded-md" placeholder="0" step="1" min="0" max="100" />
                      </div>
                    </div>
                    <div class="mt-2">
                      <span class="text-xs text-gray-500">
                        Total: {{ Object.values((sim.options.benchmark as any).blended || {}).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) }}%
                      </span>
                      <button type="button" class="ml-4 px-3 py-1 text-xs bg-purple-100 text-purple-800 hover:bg-purple-200 hover:text-purple-900 rounded-md transition-colors font-medium" @click="normalizeBenchmarkWeights">Normalize to 100%</button>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Define a custom benchmark portfolio allocation</p>
                  </div>
                </div>
                
                <!-- Custom Label -->
                <div class="space-y-3 pt-3 border-t border-purple-200">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Custom Label (optional)</label>
                    <input type="text" v-model="(sim.options.benchmark as any).label" class="input-field w-full p-3 rounded-md" placeholder="Leave blank for auto-generated label" />
                    <p class="text-xs text-gray-500 mt-1">Custom name to display in charts and legends</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex justify-between items-center mt-8">
        <!-- Form Validation Summary -->
        <div v-if="hasValidationErrors" class="flex items-center text-amber-600">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <span class="text-sm font-medium">Please correct the highlighted fields</span>
        </div>
        <div v-else-if="hasRequiredFields" class="flex items-center text-green-600">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span class="text-sm font-medium">All required fields completed</span>
        </div>
        <div></div>

        <RouterLink 
          to="/allocation" 
          :class="[
            'py-3 px-6 text-lg font-medium rounded-lg transition-all duration-200 inline-flex items-center',
            hasValidationErrors 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'btn-primary hover:shadow-lg hover:scale-105'
          ]"
          :style="{ pointerEvents: hasValidationErrors ? 'none' : 'auto' }"
        >
          Next: Portfolio Allocation 
          <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
          </svg>
        </RouterLink>
      </div>
    </div>
  </main>
</template>
