<template>
  <div class="enhanced-risk-analysis bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold text-gray-900">Enhanced Risk Analysis</h3>
      <div class="flex space-x-2">
        <button 
          @click="activeTab = 'metrics'"
          :class="[
            'px-3 py-1 rounded-md text-sm font-medium',
            activeTab === 'metrics' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-500 hover:text-gray-700'
          ]"
        >
          Risk Metrics
        </button>
        <button 
          @click="activeTab = 'insights'"
          :class="[
            'px-3 py-1 rounded-md text-sm font-medium',
            activeTab === 'insights' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-500 hover:text-gray-700'
          ]"
        >
          Narrative Insights
        </button>
      </div>
    </div>

    <!-- Risk Metrics Tab -->
    <div v-if="activeTab === 'metrics'" class="space-y-6">
      <!-- Tail Risk Section -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-red-50 rounded-lg p-4">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="h-5 w-5 bg-red-400 rounded-full flex items-center justify-center">
                <span class="text-white text-xs font-bold">!</span>
              </div>
            </div>
            <div class="ml-3">
              <h4 class="text-sm font-medium text-red-800">CVaR (95%)</h4>
              <p class="text-lg font-semibold text-red-900">{{ formatMoney(riskMetrics.cvar95) }}</p>
              <p class="text-xs text-red-600">Expected loss in worst 5% scenarios</p>
            </div>
          </div>
        </div>

        <div class="bg-orange-50 rounded-lg p-4">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="h-5 w-5 bg-orange-400 rounded-full flex items-center justify-center">
                <span class="text-white text-xs font-bold">⚠</span>
              </div>
            </div>
            <div class="ml-3">
              <h4 class="text-sm font-medium text-orange-800">Max Drawdown</h4>
              <p class="text-lg font-semibold text-orange-900">{{ formatPercent(riskMetrics.maxDrawdown) }}</p>
              <p class="text-xs text-orange-600">Peak-to-trough decline</p>
            </div>
          </div>
        </div>

        <div class="bg-yellow-50 rounded-lg p-4">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="h-5 w-5 bg-yellow-400 rounded-full flex items-center justify-center">
                <span class="text-white text-xs font-bold">⏰</span>
              </div>
            </div>
            <div class="ml-3">
              <h4 class="text-sm font-medium text-yellow-800">Principal Loss Risk</h4>
              <p class="text-lg font-semibold text-yellow-900">{{ formatPercent(riskMetrics.principalLossProb) }}</p>
              <p class="text-xs text-yellow-600">Probability over {{ years }} years</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed Risk Metrics -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Tail Risk Distribution -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="text-sm font-medium text-gray-800 mb-3">Tail Risk Distribution</h4>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Worst 1% outcome:</span>
              <span class="font-medium text-red-600">{{ formatMoney(riskMetrics.tailRiskMetrics.worst1Pct) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Worst 5% outcome:</span>
              <span class="font-medium text-orange-600">{{ formatMoney(riskMetrics.tailRiskMetrics.worst5Pct) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Worst 10% outcome:</span>
              <span class="font-medium text-yellow-600">{{ formatMoney(riskMetrics.tailRiskMetrics.worst10Pct) }}</span>
            </div>
          </div>
        </div>

        <!-- Drawdown Analysis -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h4 class="text-sm font-medium text-gray-800 mb-3">Drawdown Analysis</h4>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Average drawdown:</span>
              <span class="font-medium">{{ formatPercent(riskMetrics.drawdownAnalysis.avgDrawdown) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Recovery time:</span>
              <span class="font-medium">{{ riskMetrics.drawdownAnalysis.drawdownRecoveryTime.toFixed(1) }} years</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">Max drawdown year:</span>
              <span class="font-medium">Year {{ riskMetrics.drawdownAnalysis.maxDrawdownYear }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sustainability Metrics -->
      <div class="bg-blue-50 rounded-lg p-4">
        <h4 class="text-sm font-medium text-blue-800 mb-2">Sustainability Analysis</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span class="text-sm text-blue-600">Expected depletion horizon:</span>
            <p class="text-lg font-semibold text-blue-900">
              {{ riskMetrics.sustainabilityHorizon > years ? 'Beyond forecast period' : `Year ${riskMetrics.sustainabilityHorizon.toFixed(0)}` }}
            </p>
          </div>
          <div>
            <span class="text-sm text-blue-600">CVaR (99% confidence):</span>
            <p class="text-lg font-semibold text-blue-900">{{ formatMoney(riskMetrics.cvar99) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Narrative Insights Tab -->
    <div v-if="activeTab === 'insights'" class="space-y-4">
      <div 
        v-for="insight in narrativeInsights" 
        :key="insight.title"
        :class="[
          'border-l-4 p-4 rounded-r-lg',
          insight.type === 'risk' && insight.priority === 'high' 
            ? 'border-red-500 bg-red-50' 
            : insight.type === 'risk' && insight.priority === 'medium'
            ? 'border-orange-500 bg-orange-50'
            : insight.type === 'opportunity'
            ? 'border-green-500 bg-green-50'
            : 'border-blue-500 bg-blue-50'
        ]"
      >
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <div 
              v-if="insight.type === 'risk'" 
              :class="[
                'h-5 w-5 rounded-full flex items-center justify-center',
                insight.priority === 'high' ? 'bg-red-500' : 'bg-orange-500'
              ]"
            >
              <span class="text-white text-xs font-bold">!</span>
            </div>
            <div 
              v-else-if="insight.type === 'opportunity'" 
              class="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center"
            >
              <span class="text-white text-xs font-bold">✓</span>
            </div>
            <div 
              v-else 
              class="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center"
            >
              <span class="text-white text-xs font-bold">i</span>
            </div>
          </div>
          <div class="ml-3 flex-1">
            <h4 :class="[
              'text-sm font-medium',
              insight.type === 'risk' && insight.priority === 'high' 
                ? 'text-red-800' 
                : insight.type === 'risk' && insight.priority === 'medium'
                ? 'text-orange-800'
                : insight.type === 'opportunity'
                ? 'text-green-800'
                : 'text-blue-800'
            ]">
              {{ insight.title }}
            </h4>
            <p :class="[
              'mt-1 text-sm',
              insight.type === 'risk' && insight.priority === 'high' 
                ? 'text-red-700' 
                : insight.type === 'risk' && insight.priority === 'medium'
                ? 'text-orange-700'
                : insight.type === 'opportunity'
                ? 'text-green-700'
                : 'text-blue-700'
            ]">
              {{ insight.description }}
            </p>
            
            <!-- Action Items -->
            <div v-if="insight.actionItems?.length" class="mt-3">
              <p :class="[
                'text-xs font-medium mb-2',
                insight.type === 'risk' && insight.priority === 'high' 
                  ? 'text-red-800' 
                  : insight.type === 'risk' && insight.priority === 'medium'
                  ? 'text-orange-800'
                  : 'text-blue-800'
              ]">
                Recommended Actions:
              </p>
              <ul class="list-disc list-inside space-y-1">
                <li 
                  v-for="action in insight.actionItems" 
                  :key="action"
                  :class="[
                    'text-xs',
                    insight.type === 'risk' && insight.priority === 'high' 
                      ? 'text-red-600' 
                      : insight.type === 'risk' && insight.priority === 'medium'
                      ? 'text-orange-600'
                      : 'text-blue-600'
                  ]"
                >
                  {{ action }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- No insights message -->
      <div v-if="!narrativeInsights.length" class="text-center py-8 text-gray-500">
        <div class="h-8 w-8 mx-auto mb-2 bg-gray-400 rounded-full flex items-center justify-center">
          <span class="text-white text-sm font-bold">i</span>
        </div>
        <p>No specific insights generated for this simulation.</p>
        <p class="text-sm">This typically indicates a well-balanced portfolio with moderate risk.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { RiskMetrics, NarrativeInsight, SimulationOutputs, Inputs } from '../../lib/monteCarlo';

interface Props {
  riskMetrics: RiskMetrics;
  narrativeInsights: NarrativeInsight[];
  results: SimulationOutputs;
  inputs: Inputs;
}

const props = defineProps<Props>();
const activeTab = ref<'metrics' | 'insights'>('metrics');

const years = props.results.simulations[0]?.length ?? 10;

function formatMoney(num: number): string {
  if (!isFinite(num)) return '-';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatPercent(num: number): string {
  if (!isFinite(num)) return '-';
  return `${(num * 100).toFixed(1)}%`;
}
</script>
