<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { apiService } from '@/services/api';

const authStore = useAuthStore();
const savedSimulations = ref<any[]>([]);
const isLoadingHistory = ref(false);
const expandedSimulation = ref<string | null>(null);

async function loadSimulationHistory() {
  if (!authStore.isAuthenticated) {
    console.log('User not authenticated, skipping simulation history load');
    return;
  }
  
  try {
    isLoadingHistory.value = true;
    console.log('Loading simulation history...');
    console.log('Auth token:', authStore.user?.email);
    
    const response = await apiService.getSimulations();
    console.log('Simulation history response:', response);
    savedSimulations.value = response.simulations || [];
    console.log('Saved simulations count:', savedSimulations.value.length);
    
    // Debug: Log the first simulation data structure
    if (savedSimulations.value.length > 0) {
      console.log('First simulation data:', savedSimulations.value[0]);
      console.log('First simulation portfolio:', savedSimulations.value[0].portfolio);
      
      // Check what asset class assumption fields are available
      const sim = savedSimulations.value[0];
      console.log('Asset class assumptions available:', {
        equityReturn: sim.equityReturn,
        equityVolatility: sim.equityVolatility,
        bondReturn: sim.bondReturn,
        bondVolatility: sim.bondVolatility,
        publicEquityReturn: sim.publicEquityReturn,
        publicEquityVolatility: sim.publicEquityVolatility,
        privateEquityReturn: sim.privateEquityReturn,
        privateEquityVolatility: sim.privateEquityVolatility,
        realAssetsReturn: sim.realAssetsReturn,
        realAssetsVolatility: sim.realAssetsVolatility,
        diversifyingReturn: sim.diversifyingReturn,
        diversifyingVolatility: sim.diversifyingVolatility
      });
    }
  } catch (error: any) {
    console.error('Failed to load simulation history:', error);
    console.error('Error details:', error.status, error.message, error.data);
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

function toggleExpanded(simulationId: string) {
  expandedSimulation.value = expandedSimulation.value === simulationId ? null : simulationId;
  console.log('Toggled expanded for simulation:', simulationId);
  console.log('Current expanded simulation:', expandedSimulation.value);
}

function formatMoney(num: number): string {
  // Handle null, undefined, or non-numeric values
  if (num == null || typeof num !== 'number' || !isFinite(num)) return '-';
  
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatPercent(num: number): string {
  // Handle null, undefined, or non-numeric values
  if (num == null || typeof num !== 'number' || !isFinite(num)) return '-';
  return `${(num * 100).toFixed(1)}%`;
}

function getResultsSummary(simulation: any) {
  if (!simulation.results) return null;
  
  // Parse results data - this would depend on how results are structured
  try {
    const results = typeof simulation.results === 'string' 
      ? JSON.parse(simulation.results) 
      : simulation.results;
    
    // Handle annualized return - check if it needs to be divided by 100
    let annualizedReturn = results.summary?.annualizedReturn || null;
    if (annualizedReturn && annualizedReturn > 1) {
      annualizedReturn = annualizedReturn / 100; // Convert from percentage to decimal
    }
    
    return {
      medianFinalValue: results.summary?.medianFinalValue || null,
      annualizedReturn,
      maxDrawdown: results.summary?.maxDrawdown || null,
      sharpeRatio: results.summary?.sharpeRatio || null,
      probabilityOfLoss: results.summary?.probabilityOfLoss || null,
      realValuePreservation: results.summary?.realValuePreservation || null,
    };
  } catch (e) {
    return null;
  }
}

function parseGrantTargets(grantTargetsJson: string) {
  try {
    return JSON.parse(grantTargetsJson);
  } catch (e) {
    return [];
  }
}

function hasNonZeroGrantTargets(grantTargetsJson: string) {
  try {
    const targets = JSON.parse(grantTargetsJson);
    return Array.isArray(targets) && targets.some((amount: any) => Number(amount) > 0);
  } catch (e) {
    return false;
  }
}

function calculateDefaultGrant(simulation: any, year: number) {
  // If simulation has completed results, use the actual projected data
  if (simulation.results) {
    try {
      const results = typeof simulation.results === 'string' 
        ? JSON.parse(simulation.results) 
        : simulation.results;
      
      // Use median grants from actual simulation results
      if (results.grants && results.grants.length > 0) {
        const yearIndex = year - 1; // Convert to 0-based index
        if (yearIndex < results.grants[0].length) {
          // Get grants for this year from all simulation paths
          const grantsThisYear = results.grants.map((path: number[]) => path[yearIndex] || 0);
          // Return median grant amount
          const sortedGrants = grantsThisYear.sort((a: number, b: number) => a - b);
          return sortedGrants[Math.floor(sortedGrants.length / 2)];
        }
      }
      
      // Fallback: if no grants data, calculate from endowment values and spending
      if (results.simulations && results.operatingExpenses && results.simulations.length > 0) {
        const yearIndex = year - 1;
        if (yearIndex < results.simulations[0].length) {
          const endowmentValues = results.simulations.map((path: number[]) => path[yearIndex] || 0);
          const operatingExpenses = results.operatingExpenses.map((path: number[]) => path[yearIndex] || 0);
          
          const medianEndowment = endowmentValues.sort((a: number, b: number) => a - b)[Math.floor(endowmentValues.length / 2)];
          const medianOpEx = operatingExpenses.sort((a: number, b: number) => a - b)[Math.floor(operatingExpenses.length / 2)];
          
          const spendingRate = Number(simulation.spendingRate) || 0.05;
          const totalSpending = medianEndowment * spendingRate;
          
          return Math.max(0, totalSpending - medianOpEx);
        }
      }
    } catch (e) {
      console.warn('Error parsing simulation results:', e);
    }
  }
  
  // Fallback for simulations without results: use the old estimation method
  // This is a simplified approximation and shouldn't be used for completed simulations
  const initialValue = Number(simulation.initialValue) || 0;
  const spendingRate = Number(simulation.spendingRate) || 0.05;
  const initialOperatingExpense = Number(simulation.initialOperatingExpense) || 0;
  
  // Very rough approximation: assume endowment declines over time due to spending
  const netGrowthRate = 0.02; // Assume 7% return - 5% spending = 2% net growth
  const inflationRate = 0.025;
  
  const approximateEndowmentValue = initialValue * Math.pow(1 + netGrowthRate, year - 1);
  const totalSpending = approximateEndowmentValue * spendingRate;
  const operatingExpensesThisYear = initialOperatingExpense * Math.pow(1 + inflationRate, year - 1);
  
  return Math.max(0, totalSpending - operatingExpensesThisYear);
}

onMounted(() => {
  console.log('HistoryView mounted');
  console.log('User authenticated:', authStore.isAuthenticated);
  console.log('User info:', authStore.user);
  loadSimulationHistory();
});
</script>

<template>
  <main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Simulation History</h1>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          View and manage your saved endowment simulations
        </p>
      </div>

      <!-- History Content -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center">
            <div class="w-8 h-8 rounded-md bg-purple-100 flex items-center justify-center mr-3">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900">Your Simulations</h2>
              <p class="text-sm text-gray-600">{{ savedSimulations.length }} simulation{{ savedSimulations.length !== 1 ? 's' : '' }} saved</p>
            </div>
          </div>
          <button @click="loadSimulationHistory" :disabled="isLoadingHistory" class="btn-secondary py-2 px-4 text-sm">
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            {{ isLoadingHistory ? 'Loading...' : 'Refresh' }}
          </button>
        </div>

        <div v-if="isLoadingHistory" class="text-center py-12">
          <div class="loading-spinner mx-auto mb-4"></div>
          <p class="text-gray-600">Loading your simulation history...</p>
        </div>

        <div v-else-if="savedSimulations.length === 0" class="text-center py-12">
          <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">No simulations yet</h3>
          <p class="text-gray-600 mb-6">Get started by creating your first endowment simulation</p>
          <RouterLink to="/simulation" class="btn-primary py-3 px-6 text-lg font-medium">
            <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Create Your First Simulation
          </RouterLink>
        </div>

        <div v-else class="space-y-6">
          <div v-for="simulation in savedSimulations" :key="simulation.id" class="mb-6 border border-gray-200 rounded-lg overflow-hidden">
            <!-- Simulation Header -->
            <div class="bg-white p-6 border-b border-gray-100">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-xl font-semibold text-gray-900 mb-1">{{ simulation.name }}</h3>
                  <div class="flex items-center space-x-4 text-sm text-gray-600">
                    <span class="flex items-center">
                      <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      {{ simulation.isCompleted ? 'Completed' : 'Draft' }}
                    </span>
                    <span>{{ new Date(simulation.updatedAt).toLocaleDateString() }}</span>
                    <span>{{ simulation.runCount || 0 }} run{{ (simulation.runCount || 0) !== 1 ? 's' : '' }}</span>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button 
                    @click="toggleExpanded(simulation.id)"
                    class="btn-secondary py-2 px-4 text-sm"
                  >
                    {{ expandedSimulation === simulation.id ? 'Hide Details' : 'View Details' }}
                  </button>
                  <button 
                    @click="deleteSimulation(simulation.id)" 
                    class="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                    title="Delete simulation"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Quick Summary Cards -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div class="text-sm font-medium text-slate-600 mb-1">Initial Value</div>
                  <div class="text-xl font-semibold text-slate-900">
                    {{ formatMoney(Number(simulation.initialValue) || 0) }}
                  </div>
                </div>
                <div class="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div class="text-sm font-medium text-slate-600 mb-1">Time Horizon</div>
                  <div class="text-xl font-semibold text-slate-900">
                    {{ simulation.years }} year{{ simulation.years !== 1 ? 's' : '' }}
                  </div>
                </div>
                <div class="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div class="text-sm font-medium text-slate-600 mb-1">Spending Rate</div>
                  <div class="text-xl font-semibold text-slate-900">
                    {{ formatPercent(Number(simulation.spendingRate) || 0) }}
                  </div>
                </div>
                <div class="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div class="text-sm font-medium text-slate-600 mb-1">Monte Carlo Runs</div>
                  <div class="text-xl font-semibold text-slate-900">
                    {{ simulation.runCount?.toLocaleString() || 'N/A' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Expanded Details Section -->
            <div v-if="expandedSimulation === simulation.id" class="bg-gray-50 p-6 space-y-6">
              <!-- Portfolio Allocation -->
              <div v-if="simulation.portfolio" class="bg-white rounded-lg p-6 border border-gray-100">
                <div class="flex items-center mb-4">
                  <svg class="w-5 h-5 text-blue-800 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <h4 class="text-lg font-semibold text-gray-900">Portfolio Allocation</h4>
                </div>
                
                <!-- Asset Class Breakdown -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div v-if="simulation.portfolio.publicEquity" class="text-sm">
                    <span class="text-blue-800 font-medium">Public Equity:</span>
                    <span class="font-semibold text-gray-900 ml-1">{{ Number(simulation.portfolio.publicEquity) }}%</span>
                  </div>
                  <div v-if="simulation.portfolio.privateEquity" class="text-sm">
                    <span class="text-blue-800 font-medium">Private Equity:</span>
                    <span class="font-semibold text-gray-900 ml-1">{{ Number(simulation.portfolio.privateEquity) }}%</span>
                  </div>
                  <div v-if="simulation.portfolio.publicFixedIncome" class="text-sm">
                    <span class="text-blue-800 font-medium">Fixed Income:</span>
                    <span class="font-semibold text-gray-900 ml-1">{{ Number(simulation.portfolio.publicFixedIncome) }}%</span>
                  </div>
                  <div v-if="simulation.portfolio.privateCredit" class="text-sm">
                    <span class="text-blue-800 font-medium">Private Credit:</span>
                    <span class="font-semibold text-gray-900 ml-1">{{ Number(simulation.portfolio.privateCredit) }}%</span>
                  </div>
                  <div v-if="simulation.portfolio.realAssets" class="text-sm">
                    <span class="text-blue-800 font-medium">Real Assets:</span>
                    <span class="font-semibold text-gray-900 ml-1">{{ Number(simulation.portfolio.realAssets) }}%</span>
                  </div>
                  <div v-if="simulation.portfolio.diversifying" class="text-sm">
                    <span class="text-blue-800 font-medium">Diversifying:</span>
                    <span class="font-semibold text-gray-900 ml-1">{{ Number(simulation.portfolio.diversifying) }}%</span>
                  </div>
                  <div v-if="simulation.portfolio.cashShortTerm" class="text-sm">
                    <span class="text-blue-800 font-medium">Cash/Short-Term:</span>
                    <span class="font-semibold text-gray-900 ml-1">{{ Number(simulation.portfolio.cashShortTerm) }}%</span>
                  </div>
                </div>

                <!-- Portfolio Risk Metrics -->
                <div v-if="simulation.portfolio.expectedReturn || simulation.portfolio.expectedVolatility" class="pt-4 border-t border-gray-100">
                  <div class="grid grid-cols-3 gap-4 text-sm">
                    <div v-if="simulation.portfolio.expectedReturn">
                      <span class="text-gray-600">Expected Return:</span>
                      <span class="font-semibold text-gray-900 ml-1">{{ formatPercent(Number(simulation.portfolio.expectedReturn) || 0) }}</span>
                    </div>
                    <div v-if="simulation.portfolio.expectedVolatility">
                      <span class="text-gray-600">Expected Volatility:</span>
                      <span class="font-semibold text-gray-900 ml-1">{{ formatPercent(Number(simulation.portfolio.expectedVolatility) || 0) }}</span>
                    </div>
                    <div v-if="simulation.portfolio.sharpeRatio">
                      <span class="text-gray-600">Sharpe Ratio:</span>
                      <span class="font-semibold text-gray-900 ml-1">{{ (Number(simulation.portfolio.sharpeRatio) || 0).toFixed(2) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Simulation Parameters -->
              <div class="bg-white rounded-lg p-6 border border-gray-100">
                <div class="flex items-center mb-4">
                  <svg class="w-5 h-5 text-blue-800 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <h4 class="text-lg font-semibold text-gray-900">Simulation Parameters</h4>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                  <!-- Left Column: General Parameters -->
                  <div class="space-y-3">
                    <h5 class="text-sm font-semibold text-gray-900 mb-3">General Parameters</h5>
                    <div class="text-sm">
                      <span class="text-gray-600">Start Year:</span>
                      <span class="font-semibold text-gray-900 ml-1">{{ simulation.startYear }}</span>
                    </div>
                    <div class="text-sm">
                      <span class="text-gray-600">Spending Growth:</span>
                      <span class="font-semibold text-gray-900 ml-1">{{ formatPercent(Number(simulation.spendingGrowth) || 0) }}</span>
                    </div>
                    <div class="text-sm">
                      <span class="text-gray-600">Correlation:</span>
                      <span class="font-semibold text-gray-900 ml-1">{{ (Number(simulation.correlation) || 0).toFixed(2) }}</span>
                    </div>
                  </div>

                  <!-- Right Column: Asset Class Table -->
                  <div>
                    <h5 class="text-sm font-semibold text-gray-900 mb-3">Asset Class Assumptions</h5>
                    <div class="overflow-hidden border border-gray-200 rounded-md">
                      <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-slate-50">
                          <tr>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Class</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volatility</th>
                          </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                          <tr v-if="simulation.portfolio && simulation.portfolio.publicEquity" class="hover:bg-gray-50">
                            <td class="px-3 py-2 text-sm text-gray-900">Public Equity</td>
                            <td class="px-3 py-2 text-sm font-semibold text-blue-800">{{ 
                              simulation.publicEquityReturn !== undefined ? formatPercent(Number(simulation.publicEquityReturn)) :
                              simulation.equityReturn !== undefined ? formatPercent(Number(simulation.equityReturn)) : 'N/A' 
                            }}</td>
                            <td class="px-3 py-2 text-sm font-semibold text-gray-600">{{ 
                              simulation.publicEquityVolatility !== undefined ? formatPercent(Number(simulation.publicEquityVolatility)) :
                              simulation.equityVolatility !== undefined ? formatPercent(Number(simulation.equityVolatility)) : 'N/A' 
                            }}</td>
                          </tr>
                          <tr v-if="simulation.portfolio && simulation.portfolio.privateEquity" class="hover:bg-gray-50">
                            <td class="px-3 py-2 text-sm text-gray-900">Private Equity</td>
                            <td class="px-3 py-2 text-sm font-semibold text-blue-800">{{ 
                              simulation.privateEquityReturn !== undefined ? formatPercent(Number(simulation.privateEquityReturn)) : 'N/A' 
                            }}</td>
                            <td class="px-3 py-2 text-sm font-semibold text-gray-600">{{ 
                              simulation.privateEquityVolatility !== undefined ? formatPercent(Number(simulation.privateEquityVolatility)) : 'N/A' 
                            }}</td>
                          </tr>
                          <tr v-if="simulation.portfolio && simulation.portfolio.publicFixedIncome" class="hover:bg-gray-50">
                            <td class="px-3 py-2 text-sm text-gray-900">Fixed Income</td>
                            <td class="px-3 py-2 text-sm font-semibold text-blue-800">{{ 
                              simulation.publicFixedIncomeReturn !== undefined ? formatPercent(Number(simulation.publicFixedIncomeReturn)) :
                              simulation.bondReturn !== undefined ? formatPercent(Number(simulation.bondReturn)) : 'N/A' 
                            }}</td>
                            <td class="px-3 py-2 text-sm font-semibold text-gray-600">{{ 
                              simulation.publicFixedIncomeVolatility !== undefined ? formatPercent(Number(simulation.publicFixedIncomeVolatility)) :
                              simulation.bondVolatility !== undefined ? formatPercent(Number(simulation.bondVolatility)) : 'N/A' 
                            }}</td>
                          </tr>
                          <tr v-if="simulation.portfolio && simulation.portfolio.privateCredit" class="hover:bg-gray-50">
                            <td class="px-3 py-2 text-sm text-gray-900">Private Credit</td>
                            <td class="px-3 py-2 text-sm font-semibold text-blue-800">{{ 
                              simulation.privateCreditReturn !== undefined ? formatPercent(Number(simulation.privateCreditReturn)) : 'N/A' 
                            }}</td>
                            <td class="px-3 py-2 text-sm font-semibold text-gray-600">{{ 
                              simulation.privateCreditVolatility !== undefined ? formatPercent(Number(simulation.privateCreditVolatility)) : 'N/A' 
                            }}</td>
                          </tr>
                          <tr v-if="simulation.portfolio && simulation.portfolio.realAssets" class="hover:bg-gray-50">
                            <td class="px-3 py-2 text-sm text-gray-900">Real Assets</td>
                            <td class="px-3 py-2 text-sm font-semibold text-blue-800">{{ 
                              simulation.realAssetsReturn !== undefined ? formatPercent(Number(simulation.realAssetsReturn)) : 'N/A' 
                            }}</td>
                            <td class="px-3 py-2 text-sm font-semibold text-gray-600">{{ 
                              simulation.realAssetsVolatility !== undefined ? formatPercent(Number(simulation.realAssetsVolatility)) : 'N/A' 
                            }}</td>
                          </tr>
                          <tr v-if="simulation.portfolio && simulation.portfolio.diversifying" class="hover:bg-gray-50">
                            <td class="px-3 py-2 text-sm text-gray-900">Diversifying</td>
                            <td class="px-3 py-2 text-sm font-semibold text-blue-800">{{ 
                              simulation.diversifyingReturn !== undefined ? formatPercent(Number(simulation.diversifyingReturn)) : 'N/A' 
                            }}</td>
                            <td class="px-3 py-2 text-sm font-semibold text-gray-600">{{ 
                              simulation.diversifyingVolatility !== undefined ? formatPercent(Number(simulation.diversifyingVolatility)) : 'N/A' 
                            }}</td>
                          </tr>
                          <tr v-if="simulation.portfolio && simulation.portfolio.cashShortTerm" class="hover:bg-gray-50">
                            <td class="px-3 py-2 text-sm text-gray-900">Cash/Short-Term</td>
                            <td class="px-3 py-2 text-sm font-semibold text-blue-800">{{ 
                              simulation.cashShortTermReturn !== undefined ? formatPercent(Number(simulation.cashShortTermReturn)) : 'N/A' 
                            }}</td>
                            <td class="px-3 py-2 text-sm font-semibold text-gray-600">{{ 
                              simulation.cashShortTermVolatility !== undefined ? formatPercent(Number(simulation.cashShortTermVolatility)) : 'N/A' 
                            }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <!-- Benchmark Information -->
                <div v-if="simulation.benchmarkType" class="mb-4 pt-4 border-t border-gray-100">
                  <h5 class="text-sm font-semibold text-gray-900 mb-2">Benchmark Configuration</h5>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div class="text-sm">
                      <span class="text-gray-600">Benchmark Type:</span>
                      <span class="font-semibold text-blue-800 ml-1">
                        {{ simulation.benchmarkType === 'cpi_plus' ? 'CPI + Fixed %' : 
                           simulation.benchmarkType === 'fixed_return' ? 'Fixed Return' : 
                           simulation.benchmarkType === 'asset_class' ? 'Asset Class Tracking' :
                           simulation.benchmarkType === 'blended_portfolio' ? 'Blended Portfolio' : 
                           simulation.benchmarkType }}
                      </span>
                    </div>
                    <div v-if="simulation.benchmarkValue !== null && simulation.benchmarkValue !== undefined" class="text-sm">
                      <span class="text-gray-600">Benchmark Value:</span>
                      <span class="font-semibold text-gray-900 ml-1">{{ formatPercent(Number(simulation.benchmarkValue) || 0) }}</span>
                    </div>
                    <div v-if="simulation.benchmarkAssetClass" class="text-sm">
                      <span class="text-gray-600">Tracked Asset:</span>
                      <span class="font-semibold text-gray-900 ml-1">{{ simulation.benchmarkAssetClass }}</span>
                    </div>
                  </div>
                </div>

                <!-- Grant Targets -->
                <div class="mb-4 pt-4 border-t border-gray-100">
                  <h5 class="text-sm font-semibold text-gray-900 mb-2">Grant Distribution Targets</h5>
                  <div v-if="simulation.grantTargets && hasNonZeroGrantTargets(simulation.grantTargets)" class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div v-for="(amount, year) in parseGrantTargets(simulation.grantTargets)" :key="year" class="text-sm bg-slate-50 rounded p-2">
                      <span class="text-gray-600">Year {{ Number(year) + 1 }}:</span>
                      <span class="font-semibold text-gray-900 ml-1">{{ formatMoney(Number(amount) || 0) }}</span>
                    </div>
                  </div>
                  <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div v-for="year in simulation.years" :key="year" class="text-sm bg-slate-50 rounded p-2">
                      <span class="text-gray-600">Year {{ year }}:</span>
                      <span class="font-semibold text-gray-900 ml-1">
                        {{ formatMoney(calculateDefaultGrant(simulation, year)) }}
                      </span>
                    </div>
                  </div>
                  <p v-if="!simulation.grantTargets || !hasNonZeroGrantTargets(simulation.grantTargets)" class="text-xs text-gray-500 mt-2 italic">
                    {{ simulation.results ? 'Based on actual simulation results (median values)' : 'Estimated based on initial parameters' }}
                  </p>
                </div>

                <!-- Stress Testing -->
                <div v-if="simulation.equityShock || simulation.cpiShift" class="pt-4 border-t border-gray-100">
                  <h5 class="text-sm font-semibold text-gray-900 mb-2">Stress Testing Scenarios</h5>
                  <div class="grid grid-cols-2 gap-4">
                    <div v-if="simulation.equityShock" class="text-sm">
                      <span class="text-gray-600">Equity Shock:</span>
                      <span class="font-semibold text-red-600 ml-1">{{ formatPercent(Number(simulation.equityShock) || 0) }}</span>
                    </div>
                    <div v-if="simulation.cpiShift" class="text-sm">
                      <span class="text-gray-600">CPI Shift:</span>
                      <span class="font-semibold text-orange-600 ml-1">{{ formatPercent(Number(simulation.cpiShift) || 0) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Results Summary (if available) -->
              <div v-if="getResultsSummary(simulation)" class="bg-white rounded-lg p-6 border border-gray-100">
                <div class="flex items-center mb-4">
                  <svg class="w-5 h-5 text-blue-800 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <h4 class="text-lg font-semibold text-gray-900">Performance Summary</h4>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div v-if="getResultsSummary(simulation)?.medianFinalValue" class="text-sm">
                    <span class="text-gray-600">Final Value:</span>
                    <span class="font-semibold text-green-600 ml-1">{{ formatMoney(getResultsSummary(simulation)!.medianFinalValue!) }}</span>
                  </div>
                  <div v-if="getResultsSummary(simulation)?.annualizedReturn" class="text-sm">
                    <span class="text-gray-600">Annualized Return:</span>
                    <span class="font-semibold text-blue-800 ml-1">{{ formatPercent(getResultsSummary(simulation)!.annualizedReturn!) }}</span>
                  </div>
                  <div v-if="getResultsSummary(simulation)?.maxDrawdown" class="text-sm">
                    <span class="text-gray-600">Max Drawdown:</span>
                    <span class="font-semibold text-red-600 ml-1">{{ formatPercent(getResultsSummary(simulation)!.maxDrawdown!) }}</span>
                  </div>
                  <div v-if="getResultsSummary(simulation)?.sharpeRatio" class="text-sm">
                    <span class="text-gray-600">Sharpe Ratio:</span>
                    <span class="font-semibold text-gray-900 ml-1">{{ getResultsSummary(simulation)!.sharpeRatio!.toFixed(2) }}</span>
                  </div>
                  <div v-if="getResultsSummary(simulation)?.probabilityOfLoss" class="text-sm">
                    <span class="text-gray-600">Prob. of Loss:</span>
                    <span class="font-semibold text-orange-600 ml-1">{{ formatPercent(getResultsSummary(simulation)!.probabilityOfLoss!) }}</span>
                  </div>
                  <div v-if="getResultsSummary(simulation)?.realValuePreservation" class="text-sm">
                    <span class="text-gray-600">Real Preservation:</span>
                    <span class="font-semibold text-green-600 ml-1">{{ formatPercent(getResultsSummary(simulation)!.realValuePreservation!) }}</span>
                  </div>
                </div>
              </div>

              <!-- Metadata -->
              <div class="bg-white rounded-lg p-4 border border-gray-100">
                <div class="flex items-center justify-between text-xs text-gray-500">
                  <div class="flex items-center space-x-4">
                    <span>
                      <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      Created {{ new Date(simulation.createdAt).toLocaleDateString() }}
                    </span>
                    <span>
                      <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      Updated {{ new Date(simulation.updatedAt).toLocaleDateString() }}
                    </span>
                  </div>
                  <div class="text-right">
                    <span class="text-gray-400">ID:</span> 
                    <span class="font-mono">{{ simulation.id.slice(-8) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="mt-8 text-center">
        <RouterLink to="/simulation" class="btn-primary py-3 px-6 text-lg font-medium mr-4">
          <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Create New Simulation
        </RouterLink>
        <RouterLink to="/settings" class="btn-secondary py-3 px-6 text-lg font-medium">
          <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          Settings
        </RouterLink>
      </div>
    </div>
  </main>
</template>
