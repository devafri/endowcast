<template>
  <div class="space-y-6">
    <div v-if="!canAccessTab" class="relative">
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
        <!-- Asset Class Shocks -->
        <div class="bg-red-50 rounded-lg p-4">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-semibold text-gray-900">Asset Class Shocks</h4>
            <button type="button" @click="$emit('add-equity-shock')" class="btn-secondary py-1 px-3 text-sm hover:bg-gray-100 transition-colors">
              <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add Shock
            </button>
          </div>
          <div v-if="!stressConfig.equityShocks?.length" class="text-sm text-gray-600 italic">
            No asset class shocks configured. Click "Add Shock" to simulate market stress scenarios.
          </div>
          <div v-else class="space-y-3">
            <div v-for="(shock, index) in stressConfig.equityShocks" :key="index" class="flex items-center gap-3 bg-white rounded p-3">
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-700 mb-1">Asset Class</label>
                <select v-model="shock.assetKey" class="input-field w-full p-2 rounded-md" @change="$emit('update:stress-config', stressConfig)">
                  <option v-for="asset in assetClasses" :key="asset.key" :value="asset.key">
                    {{ asset.label }}
                  </option>
                </select>
              </div>
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-700 mb-1">Shock Impact (%)</label>
                <input 
                  type="number" 
                  v-model.number="shock.pct" 
                  step="1" 
                  min="-90" 
                  max="50" 
                  class="input-field w-full p-2 rounded-md" 
                  placeholder="e.g. -30"
                  @input="$emit('update:stress-config', stressConfig)"
                />
              </div>
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-700 mb-1">Year</label>
                <input 
                  type="number" 
                  v-model.number="shock.year" 
                  :min="1" 
                  :max="maxYears" 
                  class="input-field w-full p-2 rounded-md" 
                  placeholder="e.g. 2"
                  @input="$emit('update:stress-config', stressConfig)"
                />
              </div>
              <button type="button" @click="$emit('remove-equity-shock', index)" class="text-red-600 hover:text-red-800 p-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- CPI Inflation Shifts -->
        <div class="bg-amber-50 rounded-lg p-4">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-semibold text-gray-900">CPI Inflation Shifts</h4>
            <button type="button" @click="$emit('add-cpi-shock')" class="btn-secondary py-1 px-3 text-sm hover:bg-gray-100 transition-colors">
              <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add Shift
            </button>
          </div>
          <div v-if="!stressConfig.cpiShifts?.length" class="text-sm text-gray-600 italic">
            No CPI shifts configured. Click "Add Shift" to model inflation scenarios.
          </div>
          <div v-else class="space-y-3">
            <div v-for="(shift, index) in stressConfig.cpiShifts" :key="index" class="flex items-center gap-3 bg-white rounded p-3">
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-700 mb-1">Delta (%)</label>
                <input 
                  type="number" 
                  v-model.number="shift.deltaPct" 
                  step="0.5" 
                  min="-10" 
                  max="10" 
                  class="input-field w-full p-2 rounded-md" 
                  placeholder="e.g. 2.5"
                  @input="$emit('update:stress-config', stressConfig)"
                />
              </div>
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-700 mb-1">From Year</label>
                <input 
                  type="number" 
                  v-model.number="shift.from" 
                  :min="1" 
                  :max="maxYears" 
                  class="input-field w-full p-2 rounded-md" 
                  placeholder="e.g. 3"
                  @input="$emit('update:stress-config', stressConfig)"
                />
              </div>
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-700 mb-1">To Year</label>
                <input 
                  type="number" 
                  v-model.number="shift.to" 
                  :min="shift.from || 1" 
                  :max="maxYears" 
                  class="input-field w-full p-2 rounded-md" 
                  placeholder="e.g. 10"
                  @input="$emit('update:stress-config', stressConfig)"
                />
              </div>
              <button type="button" @click="$emit('remove-cpi-shock', index)" class="text-red-600 hover:text-red-800 p-1">
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
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { StressTestConfig } from '../../types/SettingsTypes';

interface AssetClass {
  key: string;
  label: string;
}

interface Props {
  canAccessTab: boolean;
  stressConfig: StressTestConfig;
  assetClasses: AssetClass[];
  maxYears: number;
}

interface Emits {
  (e: 'update:stress-config', config: StressTestConfig): void;
  (e: 'add-equity-shock'): void;
  (e: 'remove-equity-shock', index: number): void;
  (e: 'add-cpi-shock'): void;
  (e: 'remove-cpi-shock', index: number): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
