<script setup lang="ts">
import { computed } from 'vue';
import { useSimulationStore } from '../stores/simulation';
import PortfolioWeights from '../components/inputs/PortfolioWeights.vue';

const sim = useSimulationStore();

const allocationCategories = computed(() => {
  return Object.keys(sim.allocationPolicy).map(k => ({
    key: k,
    label: sim.allocationPolicy[k].label,
    min: sim.allocationPolicy[k].min,
    max: sim.allocationPolicy[k].max,
    default: sim.allocationPolicy[k].default,
  }));
});
</script>

<template>
  <main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
    <div class="max-w-4xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Portfolio Allocation</h1>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          Define your strategic asset allocation and policy constraints
        </p>
        <div class="mt-6 flex items-center justify-center">
          <div class="flex items-center bg-white rounded-full px-4 py-2 shadow-md">
            <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mr-3">
              <span class="text-blue-800 font-semibold text-sm">3</span>
            </div>
            <span class="text-gray-700 font-medium">Asset Allocation Strategy</span>
          </div>
        </div>
      </div>

      <!-- Portfolio Allocation -->
      <div class="card p-6 mb-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-6">
          <div class="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center mr-3">
            <svg class="w-4 h-4 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path>
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Target Asset Allocation</h2>
            <p class="text-sm text-gray-600">Set your strategic portfolio weights across asset classes</p>
          </div>
        </div>
        <PortfolioWeights v-model="sim.inputs.portfolioWeights" :categories="allocationCategories" />
      </div>

      <!-- Allocation Policy Limits -->
      <div class="card p-6 mb-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-6">
          <div class="w-6 h-6 rounded-md bg-yellow-100 flex items-center justify-center mr-3">
            <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Investment Policy Limits</h2>
            <p class="text-sm text-gray-600">Define minimum and maximum allocation constraints by asset class</p>
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div v-for="k in Object.keys(sim.allocationPolicy)" :key="k" class="bg-gray-50 rounded-lg p-4">
            <div class="text-base font-semibold text-gray-900 mb-3">{{ sim.allocationPolicy[k].label }}</div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Minimum (%)</label>
                <input type="number" step="1" min="0" max="100" v-model.number="sim.allocationPolicy[k].min" class="input-field w-full p-2 rounded-md text-center" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Maximum (%)</label>
                <input type="number" step="1" min="0" max="100" v-model.number="sim.allocationPolicy[k].max" class="input-field w-full p-2 rounded-md text-center" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Default (%)</label>
                <input type="number" step="1" min="0" max="100" v-model.number="sim.allocationPolicy[k].default" class="input-field w-full p-2 rounded-md text-center" />
              </div>
            </div>
          </div>
        </div>
        <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>
            <div>
              <p class="text-sm font-medium text-blue-900">Policy Guidelines</p>
              <p class="text-xs text-blue-800 mt-1">Target allocations will be automatically constrained within these policy limits. Default values are used for preset allocation strategies and rebalancing targets.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex justify-between items-center">
        <RouterLink to="/settings" class="btn-secondary py-3 px-6 text-lg font-medium hover:shadow-md transition-all">
          <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
          </svg>
          Back: Settings
        </RouterLink>
        <RouterLink to="/results" class="btn-primary py-3 px-6 text-lg font-medium hover:shadow-lg transition-all">
          Run Monte Carlo Analysis
          <svg class="w-5 h-5 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
          </svg>
        </RouterLink>
      </div>
    </div>
  </main>
</template>
