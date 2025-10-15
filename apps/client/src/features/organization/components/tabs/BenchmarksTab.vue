<template>
  <div class="space-y-6">
    <div v-if="!canAccessTab" class="relative">
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
        <div class="bg-white border border-slate-100 rounded-lg p-6">
          <div class="flex items-center mb-6">
            <div class="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Benchmark Settings</h3>
              <p class="text-sm text-slate-700">Configure performance benchmarks</p>
            </div>
          </div>
          
            <div class="bg-purple-50 rounded-lg p-4 space-y-4">
            <div class="flex items-center">
              <input type="checkbox" disabled class="mr-3 text-purple-600" />
              <div>
                <label class="text-sm font-medium text-gray-900">Enable Benchmark Comparison</label>
                <p class="text-xs text-slate-700">Show benchmark in simulation charts</p>
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
          <input 
            type="checkbox" 
            v-model="benchmarkConfig.enabled" 
            @change="$emit('update:benchmark-config', benchmarkConfig)"
            class="mr-3 text-purple-600" 
          />
          <div>
            <label class="text-sm font-medium text-gray-900">Enable Benchmark Comparison</label>
            <p class="text-xs text-gray-600">Show benchmark line in simulation charts</p>
          </div>
        </div>
        
        <div v-if="benchmarkConfig.enabled" class="space-y-4 pt-3 border-t border-purple-200">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Benchmark Type</label>
            <select 
              v-model="benchmarkConfig.type" 
              @change="$emit('update:benchmark-config', benchmarkConfig)"
              class="input-field w-full p-3 rounded-md"
            >
              <option value="cpi_plus">CPI + Fixed Return</option>
              <option value="fixed">Fixed Annual Return</option>
              <option value="asset_class">Single Asset Class</option>
              <option value="blended">Blended Portfolio</option>
            </select>
          </div>
          
          <!-- CPI Plus Configuration -->
          <div v-if="benchmarkConfig.type === 'cpi_plus'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Additional Return above CPI (%)</label>
              <input 
                type="number" 
                v-model.number="benchmarkConfig.value" 
                @input="$emit('update:benchmark-config', benchmarkConfig)"
                class="input-field w-full p-3 rounded-md" 
                placeholder="6" 
                step="0.1" 
                min="-5" 
                max="15" 
              />
              <p class="text-xs text-gray-500 mt-1">Example: 6% means CPI + 6% annual return</p>
            </div>
          </div>
          
          <!-- Fixed Return Configuration -->
          <div v-if="benchmarkConfig.type === 'fixed'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Fixed Annual Return (%)</label>
              <input 
                type="number" 
                v-model.number="benchmarkConfig.value" 
                @input="$emit('update:benchmark-config', benchmarkConfig)"
                class="input-field w-full p-3 rounded-md" 
                placeholder="6" 
                step="0.1" 
                min="-10" 
                max="20" 
              />
              <p class="text-xs text-gray-500 mt-1">Fixed return regardless of inflation</p>
            </div>
          </div>
          
          <!-- Asset Class Configuration -->
          <div v-if="benchmarkConfig.type === 'asset_class'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Asset Class to Track</label>
              <select 
                v-model="benchmarkConfig.assetKey" 
                @change="$emit('update:benchmark-config', benchmarkConfig)"
                class="input-field w-full p-3 rounded-md"
              >
                <option v-for="asset in assetClasses" :key="asset.key" :value="asset.key">
                  {{ asset.label }}
                </option>
              </select>
              <p class="text-xs text-gray-500 mt-1">Benchmark follows the performance of this asset class</p>
            </div>
          </div>
          
          <!-- Blended Portfolio Configuration -->
          <div v-if="benchmarkConfig.type === 'blended'" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Benchmark Portfolio Weights</label>
              <div class="grid grid-cols-2 gap-3">
                <div v-for="asset in assetClasses" :key="asset.key" class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">{{ asset.label }} (%)</label>
                  <input 
                    type="number" 
                    v-model.number="benchmarkConfig.blended![asset.key]" 
                    @input="$emit('update:benchmark-config', benchmarkConfig)"
                    class="input-field w-full p-2 rounded-md" 
                    placeholder="0" 
                    step="1" 
                    min="0" 
                    max="100" 
                  />
                </div>
              </div>
              <div class="mt-2">
                <span class="text-xs text-gray-500">
                  Total: {{ blendedPortfolioTotal }}%
                </span>
                <button 
                  type="button" 
                  class="ml-4 px-3 py-1 text-xs bg-purple-100 text-purple-800 hover:bg-purple-200 hover:text-purple-900 rounded-md transition-colors font-medium" 
                  @click="$emit('normalize-benchmark-weights')"
                >
                  Normalize to 100%
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">Define a custom benchmark portfolio allocation</p>
            </div>
          </div>
          
          <!-- Custom Label -->
          <div class="space-y-3 pt-3 border-t border-purple-200">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Custom Label (optional)</label>
              <input 
                type="text" 
                v-model="benchmarkConfig.label" 
                @input="$emit('update:benchmark-config', benchmarkConfig)"
                class="input-field w-full p-3 rounded-md" 
                placeholder="Leave blank for auto-generated label" 
              />
              <p class="text-xs text-gray-500 mt-1">Custom name to display in charts and legends</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { BenchmarkConfig } from '../../types/SettingsTypes';

interface AssetClass {
  key: string;
  label: string;
}

interface Props {
  canAccessTab: boolean;
  benchmarkConfig: BenchmarkConfig;
  assetClasses: AssetClass[];
}

interface Emits {
  (e: 'update:benchmark-config', config: BenchmarkConfig): void;
  (e: 'normalize-benchmark-weights'): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

// Computed property for blended portfolio total
const blendedPortfolioTotal = computed(() => {
  if (!props.benchmarkConfig.blended) return 0;
  return Object.values(props.benchmarkConfig.blended).reduce((sum, val) => sum + (Number(val) || 0), 0);
});
</script>
