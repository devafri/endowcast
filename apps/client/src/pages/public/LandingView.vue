<template>
  <main class="mt-12">
    <section class="max-w-7xl mx-auto px-4 sm:px-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div class="space-y-6">
          <h1 class="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight">Institutional-Grade Endowment Analytics</h1>
          <p class="text-lg text-slate-600 max-w-2xl">Leverage sophisticated Monte Carlo simulations to fortify your endowment strategy and navigate market uncertainty with confidence.</p>

          <div class="flex flex-col sm:flex-row gap-3">
            <RouterLink to="/pricing" class="inline-flex items-center justify-center rounded-md px-6 py-3 bg-gradient-to-r from-sky-500 to-sky-700 text-white font-semibold shadow">Choose a plan</RouterLink>
            <RouterLink to="/instructions" class="inline-flex items-center justify-center rounded-md px-6 py-3 border border-slate-200 text-slate-800">Explore Platform</RouterLink>
          </div>

          <div class="flex items-center gap-4 text-sm text-slate-500 mt-4">
            <span>Trusted by</span>
            <div class="flex gap-3 items-center">
              <div class="h-8 w-20 bg-slate-200 rounded-md flex items-center justify-center text-xs">Foundation A</div>
              <div class="h-8 w-20 bg-slate-200 rounded-md flex items-center justify-center text-xs">University B</div>
              <div class="h-8 w-20 bg-slate-200 rounded-md flex items-center justify-center text-xs">Endowment C</div>
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

          <div class="flex items-center gap-4 text-sm text-slate-500 mt-4">
            <div class="p-4 rounded-lg bg-white border border-slate-100 shadow-sm">
              <div class="font-semibold text-sm">Stochastic Modeling Engine</div>
              <p class="text-xs text-slate-500 mt-2">Thousands of forward-looking scenario simulations.</p>
            </div>
            <div class="p-4 rounded-lg bg-white border border-slate-100 shadow-sm">
              <div class="font-semibold text-sm">Dynamic Assumptions</div>
              <p class="text-xs text-slate-500 mt-2">Customize market assumptions and spending policy scenarios.</p>
            </div>
            <div class="p-4 rounded-lg bg-white border border-slate-100 shadow-sm">
              <div class="font-semibold text-sm">Board-Ready Reporting</div>
              <p class="text-xs text-slate-500 mt-2">Clean exportable reports for committees and boards.</p>
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
