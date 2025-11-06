<template>
  <div class="space-y-6">
    <div v-if="!canAccessTab" class="relative">
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
          <div class="bg-white border border-slate-100 rounded-lg p-6">
          <div class="flex items-center mb-6">
            <div class="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center mr-3">
              <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Asset Class Assumptions</h3>
                <p class="text-sm text-slate-700">Customize expected returns and volatility</p>
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
                <input type="number" disabled class="input-field w-full p-2 rounded-md bg-gray-100 border border-slate-100" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Volatility (%)</label>
                <input type="number" disabled class="input-field w-full p-2 rounded-md bg-gray-100 border border-slate-100" />
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
            <input 
              type="number" 
              step="0.1" 
              :placeholder="(a.mean*100).toFixed(1)" 
              :value="getOverrideMeanPct(a.key, a.mean)" 
              @input="$emit('set-override-mean-pct', a.key, $event)" 
              class="input-field w-full p-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100" 
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Volatility (%)</label>
            <input 
              type="number" 
              step="0.1" 
              :placeholder="(a.sd*100).toFixed(1)" 
              :value="getOverrideSdPct(a.key, a.sd)" 
              @input="$emit('set-override-sd-pct', a.key, $event)" 
              class="input-field w-full p-2 rounded-md bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100" 
            />
          </div>
          <div class="flex justify-end md:justify-start">
            <div class="text-xs text-gray-500 italic">Annual metrics</div>
          </div>
        </div>
      </div>
      
      <div class="mt-4 flex justify-between items-center pt-4 border-t border-gray-200">
          <p class="text-xs text-slate-600">Leave blank to use default institutional assumptions</p>
        <button 
          type="button" 
          class="btn-secondary py-2 px-3 text-sm hover:bg-gray-100 transition-colors" 
          @click="$emit('reset-all-overrides')"
        >
          Reset All
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { AssetOverride } from '../../types/SettingsTypes';

interface AssetClass {
  key: string;
  label: string;
  mean: number;
  sd: number;
}

interface Props {
  canAccessTab: boolean;
  assetClasses: AssetClass[];
  assetOverrides: Record<string, AssetOverride>;
}

interface Emits {
  (e: 'set-override-mean-pct', assetKey: string, event: Event): void;
  (e: 'set-override-sd-pct', assetKey: string, event: Event): void;
  (e: 'reset-all-overrides'): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

// Helper functions for getting override values
function getOverrideMeanPct(assetKey: string, defaultMean: number): string {
  const override = props.assetOverrides[assetKey]?.mean;
  return override !== undefined ? (override * 100).toFixed(1) : '';
}

function getOverrideSdPct(assetKey: string, defaultSd: number): string {
  const override = props.assetOverrides[assetKey]?.sd;
  return override !== undefined ? (override * 100).toFixed(1) : '';
}
</script>
