<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useSimulationStore } from '../stores/simulation';
import { useAuthStore } from '@/stores/auth';
import { apiService } from '@/services/api';
import GrantTargets from '../components/inputs/GrantTargets.vue';
import { assetClasses } from '../lib/monteCarlo';

const sim = useSimulationStore();
const authStore = useAuthStore();
const savedSimulations = ref<any[]>([]);
const isLoadingHistory = ref(false);

async function loadSimulationHistory() {
  if (!authStore.isAuthenticated) {
    console.log('User not authenticated, skipping simulation history load');
    return;
  }
  
  try {
    isLoadingHistory.value = true;
    console.log('Loading simulation history...');
    console.log('Auth token:', authStore.user?.email);
    
    // Try a simple call first without parameters
    const response = await apiService.getSimulations();
    console.log('Simulation history response:', response);
    savedSimulations.value = response.simulations || [];
    console.log('Saved simulations count:', savedSimulations.value.length);
  } catch (error: any) {
    console.error('Failed to load simulation history:', error);
    console.error('Error details:', error.status, error.message, error.data);
    // Show error to user
    alert(`Failed to load simulation history: ${error?.message || 'Unknown error'}`);
  } finally {
    isLoadingHistory.value = false;
  }
}

async function deleteSimulation(simulationId: string) {
  if (!confirm('Are you sure you want to delete this simulation?')) return;
  
  try {
    await apiService.deleteSimulation(simulationId);
    await loadSimulationHistory(); // Refresh the list
  } catch (error) {
    console.error('Failed to delete simulation:', error);
    alert('Failed to delete simulation. Please try again.');
  }
}

onMounted(() => {
  loadSimulationHistory();
});

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
    // remove the override
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
    // remove the override
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
  sim.options.stress!.equityShocks.push({ pct: -20, year: 1 });
}

function removeEquityShock(index: number) {
  if (sim.options.stress?.equityShocks) {
    sim.options.stress.equityShocks.splice(index, 1);
  }
}

function addCpiShock() {
  if (!sim.options.stress) (sim.options as any).stress = { equityShocks: [], cpiShifts: [] };
  if (!sim.options.stress!.cpiShifts) sim.options.stress!.cpiShifts = [];
  sim.options.stress!.cpiShifts.push({ deltaPct: 2, from: 1, to: sim.options.years || 10 });
}

function removeCpiShock(index: number) {
  if (sim.options.stress?.cpiShifts) {
    sim.options.stress.cpiShifts.splice(index, 1);
  }
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <!-- Core Parameters -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="card p-6 hover:shadow-md transition-shadow">
          <div class="flex items-center mb-6">
            <div class="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Endowment Value</h3>
              <p class="text-sm text-gray-600">Current market value of total assets</p>
            </div>
          </div>
          <div class="flex items-center">
            <span class="text-xl font-medium text-gray-500 mr-2">$</span>
            <input type="number" v-model.number="sim.inputs.initialEndowment" class="input-field w-full text-xl p-3 rounded-md" />
          </div>
        </div>

        <div class="card p-6 hover:shadow-md transition-shadow">
          <div class="flex items-center mb-6">
            <div class="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Spending Policy Rate</h3>
              <p class="text-sm text-gray-600">Annual distribution rate target</p>
            </div>
          </div>
          <div class="flex items-center">
            <input type="number" v-model.number="sim.inputs.spendingPolicyRate" step="0.1" min="0" max="10" class="input-field w-full text-xl p-3 rounded-md" />
            <span class="text-xl font-medium text-gray-500 ml-2">%</span>
          </div>
        </div>

        <div class="card p-6 hover:shadow-md transition-shadow">
          <div class="flex items-center mb-4">
            <div class="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Investment Management Fee</h3>
              <p class="text-sm text-gray-600">Annual fee charged by investment managers</p>
            </div>
          </div>
          <div class="flex items-center">
            <input type="number" v-model.number="sim.inputs.investmentExpenseRate" step="0.1" min="0" max="5" class="input-field w-full text-xl p-3 rounded-md" />
            <span class="text-xl font-medium text-gray-500 ml-2">%</span>
          </div>
        </div>

        <div class="card p-6 hover:shadow-md transition-shadow">
          <div class="flex items-center mb-4">
            <div class="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Operating Expenses</h3>
              <p class="text-sm text-gray-600">Annual administrative and operational costs</p>
            </div>
          </div>
          <div class="flex items-center">
            <span class="text-xl font-medium text-gray-500 mr-2">$</span>
            <input type="number" v-model.number="sim.inputs.initialOperatingExpense" class="input-field w-full text-xl p-3 rounded-md" />
          </div>
          <p class="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded italic">
            <svg class="w-3 h-3 inline text-blue-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            Expenses automatically increase with CPI inflation each year
          </p>
        </div>

        <div class="card p-6 hover:shadow-md transition-shadow md:col-span-2">
          <div class="flex items-center mb-4">
            <div class="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Initial Grant Amount</h3>
              <p class="text-sm text-gray-600">Year 1 grant distribution baseline</p>
            </div>
          </div>
          <div class="flex items-center max-w-md">
            <span class="text-xl font-medium text-gray-500 mr-2">$</span>
            <input type="number" v-model.number="sim.inputs.initialGrant" class="input-field w-full text-xl p-3 rounded-md" />
          </div>
          <p class="text-xs text-gray-500 mt-2 bg-blue-50 p-2 rounded italic">
            <svg class="w-3 h-3 inline text-blue-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            Subsequent years calculated automatically using your spending policy
          </p>
        </div>
      </div>

      <!-- Simulation Parameters -->
      <div class="card p-6 mb-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-6">
          <div class="w-6 h-6 rounded-md bg-cyan-100 flex items-center justify-center mr-3">
            <svg class="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Simulation Timeline</h3>
            <p class="text-sm text-gray-600">Configure the forecast period and starting year</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Number of Years to Forecast</label>
            <select v-model.number="sim.options.years" class="input-field w-full p-3 rounded-md">
              <option :value="5">5 years</option>
              <option :value="10">10 years</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">Choose the projection horizon for your analysis</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Starting Year</label>
            <input type="number" v-model.number="sim.options.startYear" :min="new Date().getFullYear()" :max="new Date().getFullYear() + 10" class="input-field w-full p-3 rounded-md" :placeholder="new Date().getFullYear().toString()" />
            <p class="text-xs text-gray-500 mt-1">First year of the forecast period</p>
          </div>
        </div>
      </div>

      <!-- Grant Targets -->
      <div class="card p-6 mb-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-6">
          <div class="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center mr-3">
            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Target Grant Amounts</h3>
            <p class="text-sm text-gray-600">Set specific grant targets for future years (optional)</p>
          </div>
        </div>
        <GrantTargets v-model="sim.inputs.grantTargets" :years="(sim.options as any).years || 10" :startYear="(sim.options as any).startYear" />
      </div>

      <!-- Stress Testing -->
      <div class="card p-6 mb-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-6">
          <div class="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center mr-3">
            <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.382 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Stress Testing & Scenarios</h3>
            <p class="text-sm text-gray-600">Test portfolio resilience with market shocks and economic scenarios</p>
          </div>
        </div>
        
        <div class="space-y-6">
          <!-- Equity Shocks -->
          <div class="bg-red-50 rounded-lg p-4">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-sm font-semibold text-gray-900">Equity Market Shocks</h4>
              <button type="button" @click="addEquityShock" class="btn-secondary py-1 px-3 text-sm hover:bg-gray-100 transition-colors">
                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Add Shock
              </button>
            </div>
            <div v-if="!sim.options.stress?.equityShocks?.length" class="text-sm text-gray-600 italic">
              No equity shocks configured. Click "Add Shock" to simulate market crashes.
            </div>
            <div v-else class="space-y-3">
              <div v-for="(shock, index) in sim.options.stress.equityShocks" :key="index" class="flex items-center gap-3 bg-white rounded p-3">
                <div class="flex-1">
                  <label class="block text-xs font-medium text-gray-700 mb-1">Shock Impact (%)</label>
                  <input type="number" v-model.number="shock.pct" step="1" min="-90" max="0" class="input-field w-full p-2 rounded-md" placeholder="e.g. -30" />
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

          <!-- CPI/Inflation Shocks -->
          <div class="bg-orange-50 rounded-lg p-4">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-sm font-semibold text-gray-900">Inflation Rate Shifts</h4>
              <button type="button" @click="addCpiShock" class="btn-secondary py-1 px-3 text-sm hover:bg-gray-100 transition-colors">
                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Add Shift
              </button>
            </div>
            <div v-if="!sim.options.stress?.cpiShifts?.length" class="text-sm text-gray-600 italic">
              No inflation shifts configured. Click "Add Shift" to test persistent inflation scenarios.
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

      <!-- Asset Class Assumptions -->
      <div class="card p-6 mb-6 hover:shadow-md transition-shadow">
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

      <!-- Advanced Settings -->
      <div class="card p-6 mb-6 hover:shadow-md transition-shadow">
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
              <label class="block text-sm font-semibold text-gray-900 mb-2">Reproducibility</label>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Simulation History Section -->
      <div v-if="authStore.isAuthenticated" class="mt-12">
        <div class="card p-6">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center">
              <div class="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Simulation History</h3>
                <p class="text-sm text-gray-600">Recent simulations saved to your account</p>
              </div>
            </div>
            <button @click="loadSimulationHistory" :disabled="isLoadingHistory" class="btn-secondary py-2 px-4 text-sm">
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ isLoadingHistory ? 'Loading...' : 'Refresh' }}
            </button>
          </div>

          <div v-if="isLoadingHistory" class="text-center py-8">
            <div class="loading-spinner mx-auto mb-4"></div>
            <p class="text-gray-600">Loading your simulation history...</p>
          </div>

          <div v-else-if="savedSimulations.length === 0" class="text-center py-8">
            <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <p class="text-gray-600 mb-2">No simulations saved yet</p>
            <p class="text-sm text-gray-500">Run a simulation to see it appear here</p>
          </div>

          <div v-else class="space-y-4">
            <div v-for="simulation in savedSimulations" :key="simulation.id" class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-gray-900">{{ simulation.name }}</h4>
                    <div class="flex items-center space-x-2">
                      <span v-if="simulation.isCompleted" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                        Completed
                      </span>
                      <span v-else class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Incomplete
                      </span>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span class="font-medium">Initial Value:</span><br>
                      ${{ (simulation.initialValue / 1000000).toFixed(1) }}M
                    </div>
                    <div>
                      <span class="font-medium">Years:</span><br>
                      {{ simulation.years }}
                    </div>
                    <div>
                      <span class="font-medium">Spending Rate:</span><br>
                      {{ (simulation.spendingRate * 100).toFixed(1) }}%
                    </div>
                    <div>
                      <span class="font-medium">Runs:</span><br>
                      {{ simulation.runCount }}
                    </div>
                  </div>
                  <div v-if="simulation.portfolio" class="mt-2 text-sm text-gray-600">
                    <span class="font-medium">Portfolio:</span> {{ simulation.portfolio.name }} 
                    ({{ simulation.portfolio.equityAllocation }}% Equity, {{ simulation.portfolio.bondAllocation }}% Bonds)
                  </div>
                  <div class="mt-2 text-xs text-gray-500">
                    Created: {{ new Date(simulation.createdAt).toLocaleDateString() }} • 
                    Updated: {{ new Date(simulation.updatedAt).toLocaleDateString() }}
                  </div>
                </div>
                <div class="ml-4">
                  <button 
                    @click="deleteSimulation(simulation.id)"
                    class="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors"
                    title="Delete simulation"
                  >
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

      <!-- Navigation -->
      <div class="flex justify-end">
        <RouterLink to="/allocation" class="btn-primary py-3 px-6 text-lg font-medium hover:shadow-lg transition-all">
          Next: Portfolio Allocation 
          <svg class="w-5 h-5 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
          </svg>
        </RouterLink>
      </div>
    </div>
  </main>
</template>
