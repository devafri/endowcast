<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useSimulationStore } from '../../simulation/stores/simulation';
import { useAuthStore } from '../../auth/stores/auth';
import { assetClasses } from '../../simulation/lib/monteCarlo';
import type { TabConfig } from '../types/SettingsTypes';
import { 
  useSettingsValidation,
  useSettingsAccess,
  useAssetOverrides,
  useStressTesting,
  useBenchmarkConfig
} from '../composables';
import { 
  TabNavigation,
  UpgradeBanner,
  SettingsOnboardingHelper,
  PageHeader
} from '../components/ui';
import {
  BasicParametersTab,
  SpendingPolicyTab,
  StressTestingTab,
  AssetClassesTab,
  AdvancedTab,
  BenchmarksTab
} from '../components/tabs';

const sim = useSimulationStore();
const auth = useAuthStore();
const activeTab = ref('basic');
const showOnboardingTip = ref(true);

const tabs: TabConfig[] = [
  { id: 'basic', label: 'Basic Parameters', icon: '📊', feature: 'basic' },
  { id: 'spending', label: 'Spending & Policy', icon: '💰', feature: 'stress' },
  { id: 'stress', label: 'Stress Testing', icon: '⚠️', feature: 'stress' },
  { id: 'assets', label: 'Asset Classes', icon: '📈', feature: 'advanced' },
  { id: 'advanced', label: 'Advanced', icon: '⚙️', feature: 'advanced' },
  { id: 'benchmarks', label: 'Benchmarks', icon: '🎯', feature: 'advanced' }
];

// Use composables
const validation = useSettingsValidation(sim.inputs);
const access = useSettingsAccess(tabs, auth);
const assetOverrides = useAssetOverrides(sim.options);
const stressTesting = useStressTesting(sim.options);
const benchmarkConfig = useBenchmarkConfig(sim.options);

// Tab management
const switchToTab = (tabId: string) => {
  if (access.canAccessTab(tabId)) {
    activeTab.value = tabId;
  }
};

// Expose validation methods for template
const { 
  hasFinancialErrors, 
  isFinancialSectionComplete,
  hasValidationErrors,
  hasRequiredFieldsComputed 
} = validation;

// Expose access methods for template
const { 
  availableTabs, 
  restrictedTabs, 
  isTrialUser, 
  canAccessTab 
} = access;

// Create proper data structures for components
const stressConfig = computed(() => ({
  equityShocks: (sim.options as any).stressTest?.equityShocks || [],
  cpiShifts: (sim.options as any).stressTest?.cpiShifts || []
}));

// Default correlation matrix from the CorrelationMatrix component
const getDefaultCorrelationMatrix = (): number[][] => [
  [1.00, 0.75, 0.20, 0.25, 0.30, 0.25, 0.05],
  [0.75, 1.00, 0.15, 0.40, 0.35, 0.20, 0.05],
  [0.20, 0.15, 1.00, 0.30, 0.10, 0.10, 0.05],
  [0.25, 0.40, 0.30, 1.00, 0.15, 0.10, 0.05],
  [0.30, 0.35, 0.10, 0.15, 1.00, 0.20, 0.05],
  [0.25, 0.20, 0.10, 0.10, 0.20, 1.00, 0.05],
  [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 1.00],
];

const correlationMatrix = ref((sim.options as any).correlationMatrix || getDefaultCorrelationMatrix());

const assetOverrideData = computed(() => (sim.options as any).assetOverrides || {});
</script>

<template>
  <main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <PageHeader 
        title="Configuration Settings"
        description="Define your endowment's fundamental parameters and modeling assumptions"
        :show-step-indicator="true"
        :step-number="2"
        step-label="Settings & Assumptions"
      />

      <!-- Tab Navigation with Upgrade Banner -->
      <TabNavigation 
        :tabs="tabs"
        :active-tab="activeTab"
        :can-access-tab="canAccessTab"
        @tab-change="switchToTab"
      >
        <template #after-navigation>
          <UpgradeBanner 
            :show="isTrialUser && restrictedTabs.length > 0"
          />
        </template>
      </TabNavigation>

      <!-- Onboarding Helper -->
      <SettingsOnboardingHelper 
        v-if="showOnboardingTip"
        show-dismiss
        @dismiss="showOnboardingTip = false"
      />

      <!-- Tab Content -->
      <div class="space-y-6">
        <!-- Basic Parameters Tab -->
        <BasicParametersTab
          v-show="activeTab === 'basic'"
          :inputs="sim.inputs"
          :options="sim.options as any"
          @update:inputs="(inputs: any) => Object.assign(sim.inputs, inputs)"
          @update:options="(options: any) => Object.assign(sim.options, options)"
        />

        <!-- Spending & Policy Tab -->
        <SpendingPolicyTab
          v-show="activeTab === 'spending'"
          :can-access-tab="canAccessTab('spending')"
        />

        <!-- Placeholder for other tabs - to be implemented -->
        <!-- Stress Testing Tab -->
        <StressTestingTab
          v-show="activeTab === 'stress'"
          :can-access-tab="canAccessTab('stress')"
          :stress-config="stressConfig"
          :asset-classes="assetClasses as any"
          :max-years="sim.options.years || 10"
          @update:stress-config="(config: any) => {
            if (!(sim.options as any).stressTest) {
              (sim.options as any).stressTest = {};
            }
            Object.assign((sim.options as any).stressTest, config);
          }"
          @add-equity-shock="stressTesting.addEquityShockHandler"
          @remove-equity-shock="stressTesting.removeEquityShockHandler"
          @add-cpi-shock="stressTesting.addCpiShockHandler"
          @remove-cpi-shock="stressTesting.removeCpiShockHandler"
        />

        <!-- Asset Classes Tab -->
        <AssetClassesTab
          v-show="activeTab === 'assets'"
          :can-access-tab="canAccessTab('assets')"
          :asset-classes="assetClasses as any"
          :asset-overrides="assetOverrideData"
          @set-override-mean-pct="(assetKey: string, event: Event) => assetOverrides.setOverrideMean(assetKey, event)"
          @set-override-sd-pct="(assetKey: string, event: Event) => assetOverrides.setOverrideStdDev(assetKey, event)"
          @get-override-mean-pct="(assetKey: string) => assetOverrides.getOverrideMean(assetKey)"
          @get-override-sd-pct="(assetKey: string) => assetOverrides.getOverrideStdDev(assetKey)"
        />

        <!-- Advanced Tab -->
        <AdvancedTab
          v-show="activeTab === 'advanced'"
          :can-access-tab="canAccessTab('advanced')"
          :options="sim.options as any"
          :correlation-matrix="correlationMatrix"
          @update:options="(options: any) => Object.assign(sim.options, options)"
          @update:correlation-matrix="(matrix: number[][]) => correlationMatrix = matrix"
          @copy-share-link="() => {
            // Copy functionality would be implemented here
          }"
        />

        <!-- Benchmarks Tab -->
        <BenchmarksTab
          v-show="activeTab === 'benchmarks'"
          :can-access-tab="canAccessTab('benchmarks')"
          :benchmark-config="(sim.options.benchmark as any) || { enabled: false }"
          :asset-classes="assetClasses as any"
          @update:benchmark-config="(config: any) => {
            if (!sim.options.benchmark) {
              (sim.options as any).benchmark = {};
            }
            Object.assign((sim.options as any).benchmark, config);
          }"
          @normalize-benchmark-weights="benchmarkConfig.normalizeBenchmarkWeightsHandler"
        />
      </div>

      <!-- Navigation -->
      <div class="flex justify-between items-center mt-8">
        <!-- Form Validation Summary -->
        <div v-if="hasValidationErrors" class="flex items-center text-amber-600">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.982 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <span class="text-sm font-medium">Please correct the highlighted fields</span>
        </div>
        <div v-else-if="hasRequiredFieldsComputed" class="flex items-center text-green-600">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span class="text-sm font-medium">All required fields completed</span>
        </div>
        <div></div>

        <RouterLink 
          to="/allocation" 
          :class="[
            'py-3 px-6 text-lg font-medium rounded-lg transition-all duration-200 inline-flex items-center',
            hasValidationErrors 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'btn-primary hover:shadow-lg hover:scale-105'
          ]"
          :style="{ pointerEvents: hasValidationErrors ? 'none' : 'auto' }"
        >
          Next: Portfolio Allocation 
          <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
          </svg>
        </RouterLink>
      </div>
    </div>
  </main>
</template>
