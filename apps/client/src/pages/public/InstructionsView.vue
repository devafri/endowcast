<script setup lang="ts">
import { RouterLink } from 'vue-router';
import PageHero from '@/shared/components/ui/PageHero.vue';
import FeatureCard from '@/shared/components/ui/FeatureCard.vue';
import CTABand from '@/shared/components/ui/CTABand.vue';
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-800">
    <PageHero>
      <template #title>Platform Guide</template>
      <template #subtitle>Master the EndowCast platform with our comprehensive user guide</template>
      <template #controls>
        <div class="mt-6 flex items-center justify-center">
          <div class="flex items-center bg-white rounded-full px-4 py-2 shadow-md">
            <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <span class="text-gray-700 font-medium">User Documentation</span>
          </div>
        </div>
      </template>
    </PageHero>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FeatureCard className="mb-8">
        <div class="flex items-center mb-6">
          <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mr-4">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Getting Started</h2>
        </div>

        <div class="space-y-6">
          <div class="flex items-start">
            <div class="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mr-4 mt-1">
              <span class="text-blue-800 font-bold text-sm">1</span>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 mb-2">Configure Foundation Parameters</h3>
              <p class="text-gray-600">Begin in <strong>Settings</strong> to establish your endowment's baseline: initial value, spending policy rate, management fees, and operating expenses. Optionally customize asset class return assumptions to reflect your institution's outlook.</p>
            </div>
          </div>

          <div class="flex items-start">
            <div class="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mr-4 mt-1">
              <span class="text-blue-800 font-bold text-sm">2</span>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 mb-2">Design Strategic Allocation</h3>
              <p class="text-gray-600">Navigate to <strong>Allocation</strong> to define your portfolio weights across asset classes. Set investment policy limits and target allocations that align with your institution's risk tolerance and return objectives.</p>
            </div>
          </div>

          <div class="flex items-start">
            <div class="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mr-4 mt-1">
              <span class="text-blue-800 font-bold text-sm">3</span>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 mb-2">Execute Monte Carlo Analysis</h3>
              <p class="text-gray-600">Proceed to <strong>Results</strong> and launch the simulation engine. Apply optional stress tests to model market disruptions and evaluate your strategy's resilience across thousands of scenarios.</p>
            </div>
          </div>
        </div>
      </FeatureCard>

      <FeatureCard className="mb-8">
        <div class="flex items-center mb-6">
          <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
            <svg class="w-5 h-5 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z"></path></svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Interpreting Your Results</h2>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="space-y-6">
            <div class="bg-green-50 rounded-lg p-4 border border-green-200">
              <div class="flex items-center mb-3">
                <svg class="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <h3 class="font-semibold text-green-900">Executive Summary Cards</h3>
              </div>
              <ul class="space-y-2 text-green-800 text-sm">
                <li><strong>Median Value:</strong> Most probable endowment value at horizon</li>
                <li><strong>Probability of Loss:</strong> Risk of falling below initial corpus</li>
                <li><strong>Annualized Return:</strong> Compound growth rate (median scenario)</li>
              </ul>
            </div>

            <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div class="flex items-center mb-3">
                <svg class="w-5 h-5 text-blue-800 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <h3 class="font-semibold text-blue-900">Projection Visualization</h3>
              </div>
              <ul class="space-y-2 text-blue-800 text-sm">
                <li><strong>Median Trajectory:</strong> Central tendency growth path</li>
                <li><strong>Confidence Bands:</strong> Middle 50% outcome range</li>
                <li><strong>Sample Paths:</strong> Individual scenario illustrations</li>
                <li><strong>Corpus Preservation:</strong> Real purchasing power maintenance</li>
              </ul>
            </div>
          </div>

          <div class="space-y-6">
            <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div class="flex items-center mb-3">
                <svg class="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                <h3 class="font-semibold text-purple-900">Statistical Analysis</h3>
              </div>
              <p class="text-purple-800 text-sm">Comprehensive percentile distributions for final values, returns, and volatility metrics enable rigorous risk assessment.</p>
            </div>

            <div class="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div class="flex items-center mb-3">
                <svg class="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10z"></path></svg>
                <h3 class="font-semibold text-orange-900">Year-by-Year Data</h3>
              </div>
              <p class="text-orange-800 text-sm">Detailed annual breakdown tracking market values, distributions, and spending policy adjustments over time.</p>
            </div>
          </div>
        </div>
      </FeatureCard>

      <FeatureCard className="mb-8">
        <div class="flex items-center mb-6">
          <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center mr-4">
            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Advanced Features</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold text-gray-900 mb-2 flex items-center"><svg class="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path></svg>Custom Market Assumptions</h3>
            <p class="text-gray-600 text-sm">Override default return and volatility assumptions to test alternative market scenarios or incorporate proprietary research insights.</p>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold text-gray-900 mb-2 flex items-center"><svg class="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path></svg>Reproducibility & Sharing</h3>
            <p class="text-gray-600 text-sm">Use random seeds for consistent results and shareable links for seamless collaboration with investment committee members.</p>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold text-gray-900 mb-2 flex items-center"><svg class="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Scenario Stress Testing</h3>
            <p class="text-gray-600 text-sm">Apply market shock scenarios to evaluate portfolio resilience during equity crashes, inflation spikes, or prolonged bear markets.</p>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold text-gray-900 mb-2 flex items-center"><svg class="w-4 h-4 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>Policy Compliance</h3>
            <p class="text-gray-600 text-sm">Automatic enforcement of investment policy limits ensures realistic simulations that respect institutional governance constraints.</p>
          </div>
        </div>
      </FeatureCard>

      <CTABand>
        <template #title>Ready to Begin?</template>
        <template #subtitle>Start building your endowment projection model now</template>
        <template #actions>
          <RouterLink to="/settings" class="bg-white text-blue-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center">Configure Settings
            <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
          </RouterLink>
        </template>
      </CTABand>
    </div>
  </main>
</template>
