<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="relative text-center py-20 md:py-28 lg:py-32 bg-midnight-blue text-white overflow-hidden">
      <div class="absolute inset-0 bg-abstract-pattern"></div>
      <div class="relative z-10 container mx-auto px-6">
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight text-shadow-md">
          Institutional-Grade Endowment Analytics
        </h1>
        <p class="text-lg md:text-xl text-light-slate max-w-3xl mx-auto mb-10">
          Leverage sophisticated Monte Carlo simulations to fortify your endowment's strategy and navigate market uncertainty with confidence.
        </p>
        <div class="flex justify-center items-center space-x-6">
          <RouterLink to="/pricing" class="btn btn-hero" aria-label="Choose a plan — plans start at $49 per month">
            Choose a plan
          </RouterLink>
          <RouterLink to="/instructions" class="btn btn-hero">
            Explore Platform
          </RouterLink>
        </div>
        <div class="mt-3 text-sm text-muted-subtle max-w-md mx-auto">
          Try a 30‑day free trial (limited features). Full features available on paid plans starting at <strong class="muted-strong">$49/mo</strong>.
        </div>
      </div>
    </section>

    <!-- Introduction/Problem Section -->
    <section class="py-20 md:py-28 bg-white">
      <div class="container mx-auto px-6">
        <div class="grid md:grid-cols-2 gap-24 items-stretch">
          <div class="prose prose-lg max-w-none text-slate-gray h-full flex flex-col justify-between pr-6">
            <h2 class="text-3xl font-bold text-midnight-blue mb-6">The Fiduciary's Dilemma</h2>
            <p>
              Endowment management requires a delicate equilibrium between current fiscal demands and long-term preservation of capital. Conventional deterministic modeling often fails to adequately represent the spectrum of market possibilities, exposing fiduciaries to unforeseen volatility and risk.
            </p>
            <ul class="mt-6 space-y-4 text-slate-gray list-disc list-inside pl-0">
              <li>Is our spending policy structured for long-term sustainability?</li>
              <li>What is the quantifiable risk of our portfolio breaching critical thresholds?</li>
              <li>How will various asset allocation strategies perform under rigorous, stochastic analysis?</li>
            </ul>
          </div>
          <div class="p-2 bg-white rounded-2xl shadow-2xl border border-gray-200 flex items-center">
            <img src="@/assets/images/chart-placeholder.svg" alt="Endowment projection analysis chart" class="w-full h-auto rounded-xl">
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-20 md:py-28 bg-light">
      <div class="container mx-auto px-6">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-midnight-blue">A Platform Built for Institutional Rigor</h2>
          <p class="text-lg text-slate-gray max-w-2xl mx-auto mt-4">
            Core features designed for the analytical demands of professional asset managers and fiduciaries.
          </p>
        </div>
        <div class="grid md:grid-cols-3 gap-8">
          <!-- Feature 1 -->
          <div class="feature-card">
            <div class="icon-wrapper">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            </div>
            <h3 class="text-xl font-bold mb-2">Stochastic Modeling Engine</h3>
            <p>Execute thousands of forward-looking simulations to generate a complete probability distribution of potential outcomes.</p>
          </div>
          
          <!-- Feature 2 -->
          <div class="feature-card">
            <div class="icon-wrapper">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <h3 class="text-xl font-bold mb-2">Dynamic Assumption Sets</h3>
            <p>Model and compare scenarios by adjusting capital market assumptions, spending policies, inflation, and other key variables.</p>
          </div>

          <!-- Feature 3 -->
          <div class="feature-card">
            <div class="icon-wrapper">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg>
            </div>
            <h3 class="text-xl font-bold mb-2">Board-Ready Reporting</h3>
            <p>Generate clear, concise, and intuitive data visualizations and reports suitable for presentation to investment committees and boards.</p>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import '@/assets/LandingView.css';
</script>

<style scoped>
/* Add component-specific styles here if needed */
.bg-midnight-blue {
  background-color: var(--midnight-blue);
}
.text-light-slate {
  color: var(--light-slate);
}
.text-shadow-md {
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.bg-light {
  background-color: var(--bg-light);
}
.text-midnight-blue {
  color: var(--midnight-blue);
}
.text-slate-gray {
  color: var(--slate-gray);
}
.bg-accent-blue {
  background-color: var(--corporate-blue);
}
</style>
