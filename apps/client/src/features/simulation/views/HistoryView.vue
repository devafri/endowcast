<script setup lang="ts">
import { ref } from 'vue';
import { useScenarioHistory } from '@/features/simulation/composables/useScenarioHistory';
import SimulationResults from '../components/results/layouts/SimulationResults.vue';

// Use shared composable to ensure data comes from the database via apiService
const {
  // state
  scenarios,
  isLoading,
  error,
  expandedScenario,
  searchQuery,
  filterStatus,
  sortBy,
  sortDirection,
  comparisonMode,
  selectedForComparison,
  // computed
  filteredAndSortedScenarios,
  visibleScenarios,
  selectedScenarios,
  // methods
  loadScenarios,
  loadMore,
  goToPage,
  nextPage,
  prevPage,
  deleteScenario,
  loadScenarioDetails,
  toggleExpanded,
  toggleComparisonMode,
  toggleScenarioSelection,
  clearFilters,
  formatMoney,
  formatPercent,
  getResultsSummary,
  hasMore,
  hasMoreClient,
  page,
  totalPages,
  serverPagination,
} = useScenarioHistory();

// Local-only UI state
const showComparisonModal = ref(false);

function openComparisonModal() {
  if (selectedForComparison.value.size >= 2) {
    showComparisonModal.value = true;
  }
}

function handleToggleExpand(simulation: any) {
  const isExpanding = expandedScenario.value !== simulation.id;
  toggleExpanded(simulation.id);
  // Always refresh full details when expanding to ensure complete results for SimulationResults
  if (isExpanding) {
    loadScenarioDetails(simulation.id);
  }
}
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
        <!-- Error Banner -->
        <div v-if="error" class="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start justify-between">
          <div class="flex items-start">
            <svg class="w-5 h-5 mr-2 mt-0.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.07 19h13.86A2.07 2.07 0 0021 16.93L13.93 4.62a2.07 2.07 0 00-3.86 0L3 16.93A2.07 2.07 0 005.07 19z" />
            </svg>
            <span>{{ error }}</span>
          </div>
          <button @click="loadScenarios(true)" class="btn-secondary py-1 px-3 text-xs">Retry</button>
        </div>
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center">
            <div class="w-8 h-8 rounded-md bg-purple-100 flex items-center justify-center mr-3">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900">Your Simulations</h2>
              <p class="text-sm text-gray-600">
                {{ filteredAndSortedScenarios.length }} of {{ scenarios.length }} simulation{{ scenarios.length !== 1 ? 's' : '' }}
                <span v-if="comparisonMode && selectedForComparison.size > 0" class="ml-2">
                  • {{ selectedForComparison.size }} selected for comparison
                </span>
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button 
              @click="toggleComparisonMode" 
              :class="[
                'btn-secondary py-2 px-4 text-sm',
                comparisonMode ? 'bg-blue-100 text-blue-800 border-blue-300' : ''
              ]"
              :aria-pressed="comparisonMode ? 'true' : 'false'"
            >
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
              </svg>
              {{ comparisonMode ? 'Exit Compare' : 'Compare' }}
            </button>
            <button 
              v-if="comparisonMode && selectedForComparison.size >= 2"
              @click="openComparisonModal"
              class="btn-primary py-2 px-4 text-sm"
            >
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
              </svg>
              View Comparison ({{ selectedForComparison.size }})
            </button>
            <button @click="loadScenarios(true)" :disabled="isLoading" class="btn-secondary py-2 px-4 text-sm">
              <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ isLoading ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
        </div>

        <!-- Comparison Mode Info -->
        <div v-if="comparisonMode" class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h4 class="text-sm font-semibold text-blue-900 mb-1">Comparison Mode Active</h4>
              <p class="text-sm text-blue-800">
                Select up to 4 simulations by clicking their checkboxes or cards. 
                You need at least 2 simulations selected to view a side-by-side comparison.
                <span v-if="selectedForComparison.size >= 4" class="font-medium"> (Maximum reached)</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Search and Filter Controls -->
        <div v-if="!isLoading && scenarios.length > 0" class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Search -->
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">Search Simulations</label>
              <div class="relative">
                <input 
                  v-model="searchQuery"
                  type="text" 
                  placeholder="Search by name, ID, or portfolio..." 
                  class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>

            <!-- Status Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select v-model="filterStatus" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All Simulations</option>
                <option value="completed">Completed Only</option>
                <option value="draft">Draft Only</option>
              </select>
            </div>

            <!-- Sort Options -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <div class="flex space-x-2">
                <select v-model="sortBy" class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="updated">Last Updated</option>
                  <option value="created">Date Created</option>
                  <option value="name">Name</option>
                  <option value="initialValue">Initial Value</option>
                </select>
                <button 
                  @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'"
                  class="p-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                  :title="sortDirection === 'asc' ? 'Sort Descending' : 'Sort Ascending'"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Clear Filters -->
          <div v-if="searchQuery || filterStatus !== 'all' || sortBy !== 'updated' || sortDirection !== 'desc'" class="mt-4 flex justify-between items-center">
            <span class="text-sm text-gray-600">
              {{ filteredAndSortedScenarios.length }} simulation{{ filteredAndSortedScenarios.length !== 1 ? 's' : '' }} found
            </span>
            <button @click="clearFilters" class="text-sm text-blue-600 hover:text-blue-800">
              Clear all filters
            </button>
          </div>
        </div>

        <div v-if="isLoading" class="text-center py-12">
          <div class="loading-spinner mx-auto mb-4"></div>
          <p class="text-gray-600">Loading your simulation history...</p>
        </div>

        <div v-else-if="scenarios.length === 0" class="text-center py-12">
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

        <!-- No Results from Filters -->
        <div v-else-if="filteredAndSortedScenarios.length === 0" class="text-center py-12">
          <div class="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">No simulations match your filters</h3>
          <p class="text-gray-600 mb-4">Try adjusting your search or filter criteria</p>
          <button @click="clearFilters" class="btn-secondary py-2 px-4">
            Clear all filters
          </button>
        </div>

        <div v-else class="space-y-6">
          <div v-for="simulation in visibleScenarios" :key="simulation.id" class="mb-6 border border-gray-200 rounded-lg overflow-hidden"
               :class="[
                 comparisonMode && selectedForComparison.has(simulation.id) ? 'ring-2 ring-blue-500 border-blue-500' : '',
                 comparisonMode ? 'cursor-pointer hover:border-blue-300' : ''
               ]"
               @click="comparisonMode ? toggleScenarioSelection(simulation.id) : null"
          >
            <!-- Simulation Header -->
            <div class="bg-white p-6 border-b border-gray-100">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center">
                  <!-- Comparison Checkbox -->
                  <div v-if="comparisonMode" class="mr-4" @click.stop>
                    <input 
                      type="checkbox" 
                      :id="`compare-${simulation.id}`"
                      :checked="selectedForComparison.has(simulation.id)"
                      @change="toggleScenarioSelection(simulation.id)"
                      :disabled="!selectedForComparison.has(simulation.id) && selectedForComparison.size >= 4"
                      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    >
                    <label :for="`compare-${simulation.id}`" class="sr-only">Select for comparison</label>
                  </div>
                  
                  <div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-1">{{ simulation.name }}</h3>
                    <div class="flex items-center space-x-4 text-sm text-gray-600">
                      <span class="flex items-center">
                        <div :class="['w-2 h-2 rounded-full mr-2', simulation.isCompleted ? 'bg-green-500' : 'bg-yellow-500']"></div>
                        {{ simulation.isCompleted ? 'Completed' : 'Draft' }}
                      </span>
                      <span>{{ new Date(simulation.updatedAt).toLocaleDateString() }}</span>
                      <span>{{ simulation.runCount || 0 }} run{{ (simulation.runCount || 0) !== 1 ? 's' : '' }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button 
                    @click="handleToggleExpand(simulation)"
                    class="btn-secondary py-2 px-4 text-sm"
                  >
                    {{ expandedScenario === simulation.id ? 'Hide Details' : 'View Details' }}
                  </button>
                  <button 
                    @click="deleteScenario(simulation.id)" 
                    class="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                    title="Delete simulation"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>

              
            </div>

            <!-- Expanded Details Section (SimulationResults only) -->
            <div v-if="expandedScenario === simulation.id" class="bg-gray-50 p-6">
              <div v-if="simulation.results" class="bg-white rounded-lg p-6 border border-gray-100">
                <div class="flex items-center mb-4">
                  <svg class="w-5 h-5 text-green-700 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <h4 class="text-lg font-semibold text-gray-900">Simulation Results</h4>
                </div>
                <SimulationResults :results="typeof simulation.results === 'string' ? JSON.parse(simulation.results) : simulation.results" />
              </div>
            </div>
          </div>

          <!-- Load more -->
          <!-- Pagination Controls -->
          <div class="flex items-center justify-between pt-3">
            <div class="text-sm text-gray-600">
              Page {{ page }}<span v-if="!serverPagination && Number.isFinite(totalPages)"> of {{ totalPages }}</span>
            </div>
            <div class="space-x-2">
              <button @click="prevPage" :disabled="isLoading || page <= 1" class="btn-secondary py-2 px-4 text-sm">Previous</button>
              <button v-if="serverPagination" @click="nextPage" :disabled="isLoading || !hasMore" class="btn-secondary py-2 px-4 text-sm">Next</button>
              <button v-else @click="nextPage" :disabled="isLoading || page >= totalPages" class="btn-secondary py-2 px-4 text-sm">Next</button>
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

    <!-- Comparison Modal -->
    <div v-if="showComparisonModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" @click="showComparisonModal = false">
      <div class="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden" @click.stop>
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 class="text-2xl font-semibold text-gray-900">Simulation Comparison</h2>
          <button @click="showComparisonModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div class="grid gap-6" :class="{
            'grid-cols-1': selectedScenarios.length <= 1,
            'grid-cols-2': selectedScenarios.length === 2,
            'grid-cols-3': selectedScenarios.length === 3,
            'grid-cols-4': selectedScenarios.length >= 4
          }">
            <div v-for="simulation in selectedScenarios" :key="simulation.id" class="border border-gray-200 rounded-lg p-4">
              <!-- Simulation Header -->
              <div class="mb-4 pb-4 border-b border-gray-100">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ simulation.name }}</h3>
                <div class="flex items-center space-x-4 text-sm text-gray-600">
                  <span class="flex items-center">
                    <div :class="['w-2 h-2 rounded-full mr-2', simulation.isCompleted ? 'bg-green-500' : 'bg-yellow-500']"></div>
                    {{ simulation.isCompleted ? 'Completed' : 'Draft' }}
                  </span>
                  <span>{{ new Date(simulation.updatedAt).toLocaleDateString() }}</span>
                </div>
              </div>

              <!-- Key Metrics -->
              <div class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-slate-50 rounded p-3">
                    <div class="text-xs font-medium text-slate-600 mb-1">Initial Value</div>
                    <div class="text-lg font-semibold text-slate-900">
                      {{ formatMoney(Number(simulation.initialValue) || 0) }}
                    </div>
                  </div>
                  <div class="bg-slate-50 rounded p-3">
                    <div class="text-xs font-medium text-slate-600 mb-1">Time Horizon</div>
                    <div class="text-lg font-semibold text-slate-900">
                      {{ simulation.years }} years
                    </div>
                  </div>
                  <div class="bg-slate-50 rounded p-3">
                    <div class="text-xs font-medium text-slate-600 mb-1">Spending Rate</div>
                    <div class="text-lg font-semibold text-slate-900">
                      {{ formatPercent(Number(simulation.spendingRate) || 0) }}
                    </div>
                  </div>
                  <div class="bg-slate-50 rounded p-3">
                    <div class="text-xs font-medium text-slate-600 mb-1">Runs</div>
                    <div class="text-lg font-semibold text-slate-900">
                      {{ simulation.runCount?.toLocaleString() || 'N/A' }}
                    </div>
                  </div>
                </div>

                <!-- Portfolio Allocation -->
                <div v-if="simulation.portfolio">
                  <h4 class="text-sm font-semibold text-gray-900 mb-2">Portfolio Allocation</h4>
                  <div class="space-y-1 text-xs">
                    <div v-if="simulation.portfolio.publicEquity" class="flex justify-between">
                      <span>Public Equity</span>
                      <span class="font-semibold">{{ Number(simulation.portfolio.publicEquity) }}%</span>
                    </div>
                    <div v-if="simulation.portfolio.privateEquity" class="flex justify-between">
                      <span>Private Equity</span>
                      <span class="font-semibold">{{ Number(simulation.portfolio.privateEquity) }}%</span>
                    </div>
                    <div v-if="simulation.portfolio.publicFixedIncome" class="flex justify-between">
                      <span>Fixed Income</span>
                      <span class="font-semibold">{{ Number(simulation.portfolio.publicFixedIncome) }}%</span>
                    </div>
                    <div v-if="simulation.portfolio.privateCredit" class="flex justify-between">
                      <span>Private Credit</span>
                      <span class="font-semibold">{{ Number(simulation.portfolio.privateCredit) }}%</span>
                    </div>
                    <div v-if="simulation.portfolio.realAssets" class="flex justify-between">
                      <span>Real Assets</span>
                      <span class="font-semibold">{{ Number(simulation.portfolio.realAssets) }}%</span>
                    </div>
                    <div v-if="simulation.portfolio.diversifying" class="flex justify-between">
                      <span>Diversifying</span>
                      <span class="font-semibold">{{ Number(simulation.portfolio.diversifying) }}%</span>
                    </div>
                    <div v-if="simulation.portfolio.cashShortTerm" class="flex justify-between">
                      <span>Cash/Short-Term</span>
                      <span class="font-semibold">{{ Number(simulation.portfolio.cashShortTerm) }}%</span>
                    </div>
                  </div>
                </div>

                <!-- Results Summary -->
                <div v-if="getResultsSummary(simulation)" class="pt-3 border-t border-gray-100">
                  <h4 class="text-sm font-semibold text-gray-900 mb-2">Performance Summary</h4>
                  <div class="space-y-1 text-xs">
                    <div v-if="getResultsSummary(simulation)?.medianFinalValue" class="flex justify-between">
                      <span>Final Value</span>
                      <span class="font-semibold text-green-600">{{ formatMoney(getResultsSummary(simulation)!.medianFinalValue!) }}</span>
                    </div>
                    <div v-if="getResultsSummary(simulation)?.annualizedReturn" class="flex justify-between">
                      <span>Annualized Return</span>
                      <span class="font-semibold text-blue-800">{{ formatPercent(getResultsSummary(simulation)!.annualizedReturn!) }}</span>
                    </div>
                    <div v-if="getResultsSummary(simulation)?.maxDrawdown" class="flex justify-between">
                      <span>Max Drawdown</span>
                      <span class="font-semibold text-red-600">{{ formatPercent(getResultsSummary(simulation)!.maxDrawdown!) }}</span>
                    </div>
                    <div v-if="getResultsSummary(simulation)?.sharpeRatio" class="flex justify-between">
                      <span>Sharpe Ratio</span>
                      <span class="font-semibold">{{ getResultsSummary(simulation)!.sharpeRatio!.toFixed(2) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Comparison Actions -->
            <div class="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
            <div class="text-sm text-gray-600">
              Comparing {{ selectedScenarios.length }} simulation{{ selectedScenarios.length !== 1 ? 's' : '' }}
            </div>
            <div class="flex space-x-3">
              <button @click="showComparisonModal = false" class="btn-secondary py-2 px-4">
                Close
              </button>
              <button class="btn-primary py-2 px-4" disabled title="Export feature coming soon">
                Export Comparison
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
