<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
function start() { router.push('/settings'); }
</script>

<template>
  <!-- Hero Section -->
  <section class="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-20 lg:py-28">
    <div class="absolute inset-0 opacity-20">
      <div class="absolute inset-0" style="background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px);"></div>
    </div>
    
    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-4 sm:px-6 lg:px-8 relative">
              <div class="text-center z-10 relative">
          <div class="flex items-center justify-center mb-6">
            <div class="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center mr-4">
              <span class="text-blue-600 font-bold text-2xl">E</span>
            </div>
            <div>
              <h1 class="text-5xl font-bold text-white leading-tight">EndowCast</h1>
              <p class="text-blue-100 text-lg font-medium">Strategic Forecasting Platform</p>
            </div>
          </div>

        <!-- Key Metrics -->
        <div class="grid grid-cols-3 gap-6 mb-10 text-center lg:text-left">
          <div class="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-100">
            <div class="text-2xl font-bold text-blue-600">5,000</div>
            <div class="text-sm text-gray-600">Monte Carlo runs</div>
          </div>
          <div class="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-100">
            <div class="text-2xl font-bold text-green-600">< 2min</div>
            <div class="text-sm text-gray-600">Setup time</div>
          </div>
          <div class="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-100">
            <div class="text-2xl font-bold text-purple-600">10yr</div>
            <div class="text-sm text-gray-600">Projections</div>
          </div>
        </div>

        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
          <RouterLink to="/pricing" class="btn-primary py-4 px-8 text-lg font-semibold w-full sm:w-auto">
            View Pricing
            <svg class="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
          </RouterLink>
          <button @click="$router.push('/instructions')" class="bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-all py-4 px-8 text-lg w-full sm:w-auto rounded-lg font-medium">
            View Demo
          </button>
        </div>
        
        <!-- Trust indicators -->
        <div class="mt-12 flex items-center gap-6 text-sm text-blue-100 justify-center lg:justify-start">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span>Institutional-grade modeling</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Professional visualizations</span>
          </div>
        </div>
      </div>

      <!-- Dashboard Preview -->
      <div class="relative lg:ml-8">
        <!-- Floating elements for visual interest -->
        <div class="absolute -top-4 -left-4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div class="absolute -bottom-8 -right-4 w-72 h-72 bg-lime-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div class="relative bg-white rounded-2xl shadow-2xl overflow-hidden border">
          <!-- Mock browser bar -->
          <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div class="flex items-center gap-2">
              <div class="flex gap-2">
                <div class="w-3 h-3 rounded-full bg-red-400"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div class="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div class="flex-1 bg-white rounded-md px-3 py-1 mx-4 text-xs text-gray-500">
                endowcast.com/results
              </div>
            </div>
          </div>
          
          <!-- Mock dashboard content -->
          <div class="p-6 bg-gradient-to-br from-white to-gray-50">
            <!-- Header -->
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-lg font-semibold text-gray-900">Endowment Projections</h3>
              <div class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Simulation Complete
              </div>
            </div>
            
            <!-- Mini chart area -->
            <div class="mb-6">
              <div class="h-32 bg-gradient-to-r from-blue-50 to-lime-50 rounded-lg relative overflow-hidden">
                <!-- Simulated chart lines -->
                <svg class="w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="none">
                  <path d="M20,100 Q75,60 150,70 T280,50" stroke="#0EA5E9" stroke-width="3" fill="none" opacity="0.8"/>
                  <path d="M20,100 Q75,80 150,85 T280,75" stroke="#16A34A" stroke-width="2" fill="none" opacity="0.6"/>
                  <path d="M20,100 Q75,40 150,55 T280,25" stroke="#DC2626" stroke-width="2" fill="none" opacity="0.6"/>
                </svg>
                <div class="absolute top-3 left-3 text-xs text-gray-600">$75.2M median</div>
              </div>
            </div>
            
            <!-- Stats grid -->
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div class="bg-white p-3 rounded-lg border border-gray-100">
                <div class="text-xs text-gray-500 mb-1">Probability of Loss</div>
                <div class="text-lg font-bold text-gray-900">12.3%</div>
              </div>
              <div class="bg-white p-3 rounded-lg border border-gray-100">
                <div class="text-xs text-gray-500 mb-1">Annual Return</div>
                <div class="text-lg font-bold text-green-600">6.8%</div>
              </div>
            </div>
            
            <!-- Mini buttons -->
            <div class="flex gap-2">
              <div class="px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">Export PDF</div>
              <div class="px-3 py-1 bg-gray-50 text-gray-700 rounded text-xs font-medium">Share Link</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">Everything you need for strategic planning</h2>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto">
          Comprehensive endowment modeling with advanced stress testing, policy analysis, and beautiful visualizations.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Feature 1 -->
        <div class="text-center p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-4">Advanced Monte Carlo</h3>
          <p class="text-gray-600">Run thousands of simulations with correlated asset returns, CPI modeling, and custom spending policies.</p>
        </div>

        <!-- Feature 2 -->
        <div class="text-center p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
          <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-4">Stress Testing</h3>
          <p class="text-gray-600">Model market crashes, inflation spikes, and economic downturns to test portfolio resilience.</p>
        </div>

        <!-- Feature 3 -->
        <div class="text-center p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
          <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-4">Instant Sharing</h3>
          <p class="text-gray-600">Generate shareable links for scenarios, export professional reports, and collaborate seamlessly.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-gray-900 text-white py-12">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div class="col-span-1 md:col-span-2">
          <h3 class="text-xl font-bold mb-4">EndowCast</h3>
          <p class="text-gray-400 mb-4">
            Professional endowment modeling and Monte Carlo simulation platform for institutional investors.
          </p>
        </div>
        
        <div>
          <h4 class="font-semibold mb-4">Product</h4>
          <ul class="space-y-2 text-gray-400">
            <li><router-link to="/instructions" class="hover:text-white transition-colors">How it Works</router-link></li>
            <li><router-link to="/pricing" class="hover:text-white transition-colors">Pricing</router-link></li>
          </ul>
        </div>
        
        <div>
          <h4 class="font-semibold mb-4">Legal</h4>
          <ul class="space-y-2 text-gray-400">
            <li><router-link to="/terms" class="hover:text-white transition-colors">Terms of Service</router-link></li>
            <li><router-link to="/privacy" class="hover:text-white transition-colors">Privacy Policy</router-link></li>
          </ul>
        </div>
      </div>
      
      <div class="border-t border-gray-800 pt-8">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <p class="text-gray-400 text-sm mb-4 md:mb-0">
            © {{ new Date().getFullYear() }} EndowCast. All rights reserved.
          </p>
          <p class="text-gray-400 text-sm">
            Contact: <RouterLink to="/contact" class="hover:text-white transition-colors">support@endowcast.com</RouterLink>
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>
