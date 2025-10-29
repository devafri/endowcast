<template>
  <main class="mt-12">
    <section class="max-w-7xl mx-auto px-4 sm:px-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div class="space-y-6">
          <h1 class="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight">Institutional-Grade Endowment Analytics</h1>
          <p class="text-lg text-slate-600 max-w-2xl">Leverage sophisticated Monte Carlo simulations to fortify your endowment strategy and navigate market uncertainty with confidence.</p>

<div class="flex flex-col sm:flex-row gap-3">
  <!-- Primary Button -->
  <RouterLink
    to="/pricing"
    style="background-color: #0369a1; border-color: #0369a1;"
    class="inline-flex items-center justify-center rounded-lg px-6 py-3 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 hover:bg-sky-800"
  >
    Choose a plan
  </RouterLink>

  <!-- Secondary Button -->
  <RouterLink
    to="/instructions"
    style="border-color: #0c4a6e; color: #0c4a6e;"
    class="inline-flex items-center justify-center rounded-lg px-6 py-3 border bg-white font-medium shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-2 hover:bg-slate-50"
  >
    Explore Platform
  </RouterLink>
</div>
<div class="mt-6">
  <p class="text-sm text-slate-500 font-medium">Built for:</p>
  <div class="mt-3 flex flex-wrap gap-4 text-slate-400 text-sm">
    <span class="px-3 py-1 rounded-md border border-slate-200 bg-white">Private Foundations</span>
    <span class="px-3 py-1 rounded-md border border-slate-200 bg-white">University Endowments</span>
    <span class="px-3 py-1 rounded-md border border-slate-200 bg-white">Family Offices</span>
  </div>
</div>
        </div>

        <div>
          <div class="rounded-2xl p-6 glass border border-slate-200 shadow">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="font-semibold text-slate-800">Endowment projections</h3>
                <p class="text-sm text-slate-500">Median trajectory, uncertainty bands and probability of loss across scenarios.</p>
              </div>
              <div class="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">Simulation</div>
            </div>

            <div class="mt-6 h-44 rounded-md bg-white flex items-center justify-center border border-slate-100">
              <!-- Placeholder chart -->
              <svg class="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#DFF6FF"/>
                    <stop offset="100%" stop-color="#ffffff"/>
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#g)"></rect>
                <polyline fill="none" stroke="#38bdf8" stroke-width="3" points="0,160 80,120 160,110 240,90 320,70 400,82 480,60 560,40"></polyline>
                <polyline fill="none" stroke="#a855f7" stroke-width="3" points="0,160 80,100 160,90 240,75 320,60 400,62 480,35 560,20"></polyline>
              </svg>
            </div>

            <div class="mt-4 flex items-center gap-3">
              <div class="text-sm text-slate-600">Probability of loss</div>
              <div class="ml-auto text-sm font-semibold text-slate-800">12.3%</div>
            </div>

            <div class="mt-6 flex gap-3">
              <a class="inline-flex items-center rounded-md px-4 py-2 bg-slate-800 text-white text-sm" href="#">Export PDF</a>
              <a class="inline-flex items-center rounded-md px-4 py-2 border border-slate-200 text-sm" href="#">Share Link</a>
            </div>
          </div>

          <div class="flex items-stretch gap-4 text-sm text-slate-500 mt-4 landing-features">
            <div class="p-4 rounded-lg bg-white border border-slate-100 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div class="font-semibold text-sm">Stochastic Modeling Engine</div>
                <p class="text-xs text-slate-500 mt-2">Thousands of forward-looking scenario simulations.</p>
              </div>
            </div>
            <div class="p-4 rounded-lg bg-white border border-slate-100 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div class="font-semibold text-sm">Dynamic Assumptions</div>
                <p class="text-xs text-slate-500 mt-2">Customize market assumptions and spending policy scenarios.</p>
              </div>
            </div>
            <div class="p-4 rounded-lg bg-white border border-slate-100 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div class="font-semibold text-sm">Board-Ready Reporting</div>
                <p class="text-xs text-slate-500 mt-2">Clean exportable reports for committees and boards.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA band -->
    <section class="mt-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="rounded-2xl overflow-hidden bg-gradient-to-r from-sky-600 to-slate-800 text-white p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 class="text-2xl font-bold">Ready to optimize your endowment strategy?</h2>
            <p class="text-sm text-sky-100 mt-2">Start building your projection model — free trial available.</p>
          </div>
          <div class="flex gap-3">
            <RouterLink to="/pricing" class="px-5 py-3 rounded-md bg-white text-slate-800 font-semibold">Start Free</RouterLink>
            <RouterLink to="/instructions" class="px-5 py-3 rounded-md border border-white/30">Try Analyst Pro</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.glass {
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(6px);
}
</style>

<style scoped>
/* rely on flexbox stretch to equalize heights; no fixed min-height */
</style>
