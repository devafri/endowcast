<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useScenarioHistory } from '../composables/useScenarioHistory'

// Use the scenario history composable
const {
  // State
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
  
  // Computed
  filteredAndSortedScenarios,
  selectedScenarios,
  
  // Methods
  loadScenarios,
  deleteScenario,
  duplicateScenario,
  toggleExpanded,
  toggleComparisonMode,
  toggleScenarioSelection,
  clearFilters,
  formatMoney,
  formatPercent,
  getResultsSummary,
  parseGrantTargets,
  hasNonZeroGrantTargets
} = useScenarioHistory()
</script>

<template>
  <main class="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Scenario History</h1>
        <p class="text-gray-600 mt-2">Browse and manage your organization's modeling scenarios</p>
      </div>
      <div class="flex space-x-3">
        <RouterLink to="/simulation/compare" class="btn-secondary">
          📊 Compare Scenarios
        </RouterLink>
        <RouterLink to="/results" class="btn-primary">
          ➕ New Scenario
        </RouterLink>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Search -->
        <div class="lg:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search scenarios, descriptions, tags..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>

        <!-- Status filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select v-model="filterStatus" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All scenarios</option>
            <option value="completed">Completed only</option>
            <option value="draft">Draft only</option>
          </select>
        </div>

        <!-- Comparison Mode Toggle -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mode</label>
          <button 
            @click="toggleComparisonMode" 
            :class="[
              'w-full px-3 py-2 rounded-md border text-sm font-medium transition-colors',
              comparisonMode 
                ? 'bg-blue-100 text-blue-800 border-blue-300' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            ]"
          >
            {{ comparisonMode ? 'Exit Compare' : 'Compare Mode' }}
          </button>
        </div>

        <!-- Sort -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
          <select v-model="sortBy" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="updated">Last updated</option>
            <option value="created">Date created</option>
            <option value="name">Name</option>
            <option value="initialValue">Initial value</option>
          </select>
        </div>
      </div>

      <!-- Filter actions -->
      <div class="flex items-center justify-between mt-4">
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-600">
            {{ filteredAndSortedScenarios.length }} scenario{{ filteredAndSortedScenarios.length !== 1 ? 's' : '' }}
            <span v-if="comparisonMode && selectedForComparison.size > 0" class="ml-2 text-blue-600">
              • {{ selectedForComparison.size }} selected for comparison
            </span>
          </span>
          <button @click="clearFilters" class="text-sm text-blue-600 hover:text-blue-800">Clear filters</button>
        </div>
        
        <div class="flex items-center space-x-2">
          <button 
            v-if="comparisonMode && selectedForComparison.size >= 2"
            @click="$router.push('/simulation/compare')"
            class="btn-primary-sm"
          >
            View Comparison ({{ selectedForComparison.size }})
          </button>
          <button @click="loadScenarios" :disabled="isLoading" class="btn-secondary-sm">
            {{ isLoading ? 'Loading...' : 'Refresh' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="card p-12 text-center">
      <div class="loading-spinner mx-auto mb-4"></div>
      <p class="text-gray-600">Loading your scenario history...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card p-12 text-center">
      <div class="text-red-600 text-4xl mb-4">⚠️</div>
      <h3 class="text-lg font-medium mb-2 text-gray-900">Error Loading Scenarios</h3>
      <p class="text-sm text-gray-600 mb-6">{{ error }}</p>
      <button @click="loadScenarios" class="btn-primary">Try Again</button>
    </div>

    <!-- Scenario Grid -->
    <div v-else-if="filteredAndSortedScenarios.length > 0" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <div 
        v-for="scenario in filteredAndSortedScenarios" 
        :key="scenario.id" 
        class="card p-6 hover:shadow-md transition-shadow relative"
        :class="[
          comparisonMode && selectedForComparison.has(scenario.id) ? 'ring-2 ring-blue-500 border-blue-500' : '',
          comparisonMode ? 'cursor-pointer' : ''
        ]"
        @click="comparisonMode ? toggleScenarioSelection(scenario.id) : null"
      >
        <!-- Comparison Checkbox -->
        <div v-if="comparisonMode" class="absolute top-4 right-4" @click.stop>
          <input 
            type="checkbox" 
            :id="`compare-${scenario.id}`"
            :checked="selectedForComparison.has(scenario.id)"
            @change="toggleScenarioSelection(scenario.id)"
            :disabled="!selectedForComparison.has(scenario.id) && selectedForComparison.size >= 4"
            class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          >
        </div>

        <!-- Header -->
        <div class="flex items-start justify-between mb-4" :class="comparisonMode ? 'pr-8' : ''">
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-1">
              <h3 class="font-semibold text-gray-900">{{ scenario.name }}</h3>
              <span 
                v-if="!scenario.isCompleted" 
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
              >
                Draft
              </span>
            </div>
            <p class="text-sm text-gray-600">{{ scenario.description || 'No description available' }}</p>
          </div>
          
          <!-- Actions dropdown (only when not in comparison mode) -->
          <div v-if="!comparisonMode" class="relative">
            <button 
              @click="toggleExpanded(scenario.id)"
              class="text-gray-400 hover:text-gray-600 p-1 rounded"
              :class="expandedScenario === scenario.id ? 'text-blue-600' : ''"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Key metrics preview -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div class="text-sm text-gray-500">Initial Value</div>
            <div class="font-semibold text-gray-900">{{ formatMoney(scenario.initialValue) }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Time Horizon</div>
            <div class="font-semibold text-gray-900">{{ scenario.years }} year{{ scenario.years !== 1 ? 's' : '' }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Spending Rate</div>
            <div class="font-semibold text-gray-900">{{ formatPercent(scenario.spendingRate) }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Status</div>
            <div class="font-semibold" :class="scenario.isCompleted ? 'text-green-600' : 'text-yellow-600'">
              {{ scenario.isCompleted ? 'Completed' : 'Draft' }}
            </div>
          </div>
        </div>

        <!-- Results Preview (if completed) -->
        <div v-if="scenario.isCompleted && getResultsSummary(scenario)" class="mb-4 p-3 bg-gray-50 rounded-lg">
          <div class="text-xs font-medium text-gray-600 mb-2">Performance Snapshot</div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div v-if="getResultsSummary(scenario)?.medianFinalValue">
              <span class="text-gray-600">Final Value:</span>
              <span class="font-semibold text-green-600 ml-1">{{ formatMoney(getResultsSummary(scenario)!.medianFinalValue!) }}</span>
            </div>
            <div v-if="getResultsSummary(scenario)?.annualizedReturn">
              <span class="text-gray-600">Return:</span>
              <span class="font-semibold text-blue-600 ml-1">{{ formatPercent(getResultsSummary(scenario)!.annualizedReturn!) }}</span>
            </div>
          </div>
        </div>

        <!-- Expanded Details -->
        <div v-if="expandedScenario === scenario.id && !comparisonMode" class="mt-4 pt-4 border-t border-gray-200 space-y-4">
          <!-- Portfolio Summary -->
          <div v-if="scenario.portfolio">
            <div class="text-sm font-medium text-gray-900 mb-2">Portfolio Allocation</div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div v-if="Number(scenario.portfolio.publicEquity)">
                Public Equity: <span class="font-semibold">{{ Number(scenario.portfolio.publicEquity) }}%</span>
              </div>
              <div v-if="Number(scenario.portfolio.privateEquity)">
                Private Equity: <span class="font-semibold">{{ Number(scenario.portfolio.privateEquity) }}%</span>
              </div>
              <div v-if="Number(scenario.portfolio.publicFixedIncome)">
                Fixed Income: <span class="font-semibold">{{ Number(scenario.portfolio.publicFixedIncome) }}%</span>
              </div>
              <div v-if="Number(scenario.portfolio.realAssets)">
                Real Assets: <span class="font-semibold">{{ Number(scenario.portfolio.realAssets) }}%</span>
              </div>
            </div>
          </div>

          <!-- Full Results (if completed) -->
          <div v-if="scenario.isCompleted && getResultsSummary(scenario)" class="space-y-2">
            <div class="text-sm font-medium text-gray-900">Detailed Results</div>
            <div class="grid grid-cols-1 gap-2 text-xs">
              <div v-if="getResultsSummary(scenario)?.maxDrawdown">
                Max Drawdown: <span class="font-semibold text-red-600">{{ formatPercent(getResultsSummary(scenario)!.maxDrawdown!) }}</span>
              </div>
              <div v-if="getResultsSummary(scenario)?.sharpeRatio">
                Sharpe Ratio: <span class="font-semibold">{{ getResultsSummary(scenario)!.sharpeRatio!.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- Metadata -->
          <div class="text-xs text-gray-500 space-y-1">
            <div>Created: {{ new Date(scenario.createdAt).toLocaleDateString() }}</div>
            <div>Updated: {{ new Date(scenario.updatedAt).toLocaleDateString() }}</div>
            <div>ID: <span class="font-mono">{{ scenario.id.slice(-8) }}</span></div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div>{{ new Date(scenario.updatedAt).toLocaleDateString() }}</div>
          <div>{{ scenario.runCount || 0 }} run{{ (scenario.runCount || 0) !== 1 ? 's' : '' }}</div>
        </div>

        <!-- Actions -->
        <div v-if="!comparisonMode" class="flex space-x-2">
          <RouterLink :to="{ name: 'ResultsById', params: { scenarioId: scenario.id } }" class="btn-primary-sm flex-1 text-center">
            {{ scenario.isCompleted ? 'View Results' : 'Continue' }}
          </RouterLink>
          <button @click.stop="duplicateScenario(scenario)" class="btn-secondary-sm flex-1">
            Duplicate
          </button>
          <button 
            @click.stop="deleteScenario(scenario.id)" 
            class="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
            title="Delete scenario"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="card p-12 text-center">
      <div class="text-gray-500">
        <div class="text-6xl mb-4">📈</div>
        <h3 class="text-lg font-medium mb-2">No scenarios found</h3>
        <p class="text-sm mb-6">
          {{ searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters or create a new scenario.' : 'Get started by creating your first scenario.' }}
        </p>
        <RouterLink :to="{ name: 'Results' }" class="btn-primary">
          ➕ Create New Scenario
        </RouterLink>
      </div>
    </div>
  </main>
</template>

<style scoped>
.btn-primary {
  background-color: rgb(37 99 235);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
  display: inline-flex;
  align-items: center;
}

.btn-primary:hover {
  background-color: rgb(29 78 216);
}

.btn-primary-sm {
  background-color: rgb(37 99 235);
  color: white;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-size: 0.875rem;
}

.btn-primary-sm:hover {
  background-color: rgb(29 78 216);
}

.btn-secondary {
  background-color: white;
  color: rgb(75 85 99);
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid rgb(209 213 219);
  transition: background-color 0.2s;
  display: inline-flex;
  align-items: center;
}

.btn-secondary:hover {
  background-color: rgb(249 250 251);
}

.btn-secondary-sm {
  background-color: white;
  color: rgb(75 85 99);
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid rgb(209 213 219);
  transition: background-color 0.2s;
  display: inline-flex;
  align-items: center;
  font-size: 0.875rem;
}

.btn-secondary-sm:hover {
  background-color: rgb(249 250 251);
}

.card {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06);
  border: 1px solid rgb(229 231 235);
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 4px solid rgb(37 99 235);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
