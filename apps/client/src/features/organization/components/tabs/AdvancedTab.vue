<template>
  <div class="space-y-6">
    <div v-if="!canAccessTab" class="relative">
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
        <div class="bg-white border border-slate-100 rounded-lg p-6">
          <div class="flex items-center mb-6">
            <div class="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Advanced Settings</h3>
              <p class="text-sm text-slate-700">Fine-tune spending policies and portfolio management</p>
            </div>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="space-y-4">
        <div class="bg-blue-50 rounded-lg p-4">
          <h4 class="text-sm font-semibold text-gray-900 mb-3">Advanced Spending Rules</h4>
          <div class="space-y-2 text-xs text-slate-600">
                  <div>• Multi-year averaging</div>
                  <div>• Annual change limits</div>
                  <div>• Inflation adjustments</div>
                </div>
              </div>
            </div>
            
            <div class="space-y-4">
              <div class="bg-green-50 rounded-lg p-4">
                <h4 class="text-sm font-semibold text-gray-900 mb-3">Rebalancing Settings</h4>
                <div class="space-y-2 text-xs text-slate-600">
                  <div>• Tolerance bands</div>
                  <div>• Rebalancing frequency</div>
                  <div>• Transaction costs</div>
                </div>
              </div>
            </div>
            
            <div class="space-y-4">
              <div class="bg-orange-50 rounded-lg p-4">
                <h4 class="text-sm font-semibold text-gray-900 mb-3">Correlation Matrix</h4>
                <div class="space-y-2 text-xs text-slate-600">
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
        <!-- Spending Policy Settings -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-900 mb-2">Spending Policy Method</label>
            <select 
              :value="props.options.spendingPolicy?.type || 'simple'" 
              @change="updateNestedOption(['spendingPolicy', 'type'], ($event.target as HTMLSelectElement).value)" 
              class="input-field w-full p-3 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
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
                <input 
                  type="number" 
                  step="0.5" 
                  min="-50" 
                  max="50" 
                  v-model.number="options.spendingPolicy!.floorYoY" 
                  @input="$emit('update:options', options)"
                  class="input-field w-full p-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100" 
                  placeholder="e.g. -5" 
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Cap (max %)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  min="-50" 
                  max="200" 
                  v-model.number="options.spendingPolicy!.capYoY" 
                  @input="$emit('update:options', options)"
                  class="input-field w-full p-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100" 
                  placeholder="e.g. 10" 
                />
              </div>
            </div>
            <label class="inline-flex items-center mt-3 text-sm cursor-pointer hover:text-blue-700">
              <input 
                type="checkbox" 
                :checked="props.options.spendingPolicy?.cpiLinked || false"
                @change="updateNestedOption(['spendingPolicy', 'cpiLinked'], ($event.target as HTMLInputElement).checked)"
                class="mr-2 text-blue-600" 
              /> 
              Adjust limits for inflation (CPI)
            </label>
          </div>
        </div>
        
        <!-- Portfolio Rebalancing -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-900 mb-2">Portfolio Rebalancing</label>
            <div class="bg-green-50 rounded-lg p-4 space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Tolerance Band (%)</label>
                <input 
                  type="number" 
                  step="1" 
                  min="0" 
                  max="25" 
                  v-model.number="options.rebalancing!.bandPct" 
                  @input="$emit('update:options', options)"
                  class="input-field w-full p-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100" 
                  placeholder="e.g. 5" 
                />
                <p class="text-xs text-gray-500 mt-1">Trigger rebalancing when allocations drift beyond this threshold</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
                <select 
                  :value="props.options.rebalancing?.frequency || 'annual'" 
                  @change="updateNestedOption(['rebalancing', 'frequency'], ($event.target as HTMLSelectElement).value)" 
                  class="input-field w-full p-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="annual">Annual Review</option>
                  <option value="never">Never (Buy & Hold)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Corpus & Reproducibility -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-900 mb-2">Corpus & Reproducibility</label>
            <div class="bg-orange-50 rounded-lg p-4 space-y-3">
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  :checked="props.options.corpus?.enabled || false"
                  @change="updateNestedOption(['corpus', 'enabled'], ($event.target as HTMLInputElement).checked)"
                  class="mr-3 text-orange-600" 
                />
                <div>
                  <label class="text-sm font-medium text-gray-900">Enable Corpus Tracking</label>
                  <p class="text-xs text-gray-600">Track inflation-adjusted benchmark</p>
                </div>
              </div>
              
              <div v-if="options.corpus!.enabled">
                <label class="block text-xs font-medium text-gray-700 mb-1">Initial Corpus Value</label>
                <input 
                  type="number" 
                  v-model.number="options.corpus!.initialValue" 
                  @input="$emit('update:options', options)"
                  class="input-field w-full p-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100" 
                  placeholder="246900000" 
                  step="1000000" 
                  min="0" 
                />
              </div>
            </div>
            
            <div class="bg-yellow-50 rounded-lg p-4 space-y-3">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Random Seed (optional)</label>
                <input 
                  type="number" 
                  v-model.number="options.seed" 
                  @input="$emit('update:options', options)"
                  class="input-field w-full p-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100" 
                  placeholder="e.g. 12345" 
                />
                <p class="text-xs text-gray-500 mt-1">Use same seed for identical results across runs</p>
              </div>
              <div class="pt-2">
                <button type="button" class="btn-secondary py-2 px-3 text-sm w-full hover:bg-gray-100 transition-colors" @click="$emit('copy-share-link')">
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
        <CorrelationMatrix :model-value="correlationMatrix" @update:model-value="$emit('update:correlation-matrix', $event)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import CorrelationMatrix from '../../../simulation/components/inputs/CorrelationMatrix.vue';
import type { SimulationOptions } from '../../types/SettingsTypes';

interface Props {
  canAccessTab: boolean;
  options: SimulationOptions;
  correlationMatrix: number[][];
}

interface Emits {
  (e: 'update:options', options: SimulationOptions): void;
  (e: 'update:correlation-matrix', matrix: number[][]): void;
  (e: 'copy-share-link'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Create computed properties for two-way binding with props
const updateOptions = (updates: Partial<SimulationOptions>) => {
  emit('update:options', { ...props.options, ...updates });
};

// Helper function to update nested options
const updateNestedOption = (path: string[], value: any) => {
  const newOptions = JSON.parse(JSON.stringify(props.options));
  let current = newOptions;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) current[path[i]] = {};
    current = current[path[i]];
  }
  current[path[path.length - 1]] = value;
  emit('update:options', newOptions);
};
</script>
