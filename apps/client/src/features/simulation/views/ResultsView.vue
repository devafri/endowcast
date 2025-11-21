<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSimulationStore } from '../../simulation/stores/simulation';
import { useAuthStore } from '@/features/auth/stores/auth';
import { useExport } from '../composables/useExport';
import { useComparison } from '../composables/useComparison';
import SimulationResults from '../components/results/layouts/SimulationResults.vue';

const route = useRoute();
const router = useRouter();
const sim = useSimulationStore();
const authStore = useAuthStore();
const { 
  isExporting, 
  exportProgress, 
  isExportingPng, 
  isExportingPdf, 
  pngProgress, 
  pdfProgress, 
  exportElement 
} = useExport();

const { addCurrentScenario, scenarios } = useComparison();

// Reference to the results container for export
const resultsContainer = ref<HTMLElement | null>(null);

// Mark results as ready for export once data is loaded
function markExportReady() {
  nextTick(() => {
    if (resultsContainer.value && sim.results) {
      // Check if data arrays exist
      const hasSimulations = Array.isArray((sim.results as any).simulations) && (sim.results as any).simulations.length > 0;
      console.log('🔍 markExportReady called:', {
        hasContainer: !!resultsContainer.value,
        hasResults: !!sim.results,
        hasSimulations,
        simulationsLength: (sim.results as any).simulations?.length || 0,
        resultsId: sim.results.id
      });
      if (hasSimulations) {
        resultsContainer.value.setAttribute('data-export-ready', 'true');
        console.log('✅ Export ready: data fully loaded');
      } else {
        console.warn('⚠️ Export NOT ready: simulations array missing or empty');
      }
    } else {
      console.warn('⚠️ Export NOT ready: missing container or results', {
        hasContainer: !!resultsContainer.value,
        hasResults: !!sim.results
      });
    }
  });
}

function run() { 
  // Await the store run so we can react after completion if needed
  sim.runSimulation().then((res:any) => {
    if (res) {
      // If the run produced results with an id, ensure the URL contains scenarioId (path param)
      const scenarioId = (res && (res.id || res.simulationId)) || null;
      if (scenarioId) {
        // Use push instead of replace to ensure proper history navigation
        // Then the watcher below will automatically load the scenario
        if (route.params.scenarioId === scenarioId) {
             console.log('Route already contains correct scenarioId. Skipping route push.');
             return;
        }
        router.push({ name: 'ResultsById', params: { scenarioId } });
      }
    }
  }).catch((e:any)=>{
    // runSimulation already sets error message; no-op here
    console.error('Run from ResultsView failed:', e);
  });
}

// Share link state
const isCopying = ref(false);
const copySuccess = ref(false);
const shareUrl = ref('');

// Comparison state
const addingToComparison = ref(false);
const addedToComparison = ref(false);

// Check if current simulation is already in comparison
const isInComparison = computed(() => {
  if (!sim.results) return false;
  return scenarios.value.some(s => s.simulationId === sim.results?.id);
});

// Add to comparison function
function handleAddToComparison() {
  if (!sim.results || isInComparison.value) return;
  
  addingToComparison.value = true;
  try {
    const name = `Scenario ${scenarios.value.length + 1}`;
    addCurrentScenario(name);
    addedToComparison.value = true;
    setTimeout(() => {
      addedToComparison.value = false;
    }, 3000);
  } catch (error) {
    console.error('Error adding to comparison:', error);
    alert('Failed to add scenario to comparison');
  } finally {
    addingToComparison.value = false;
  }
}

function goToComparison() {
  router.push('/comparison');
}

// Export functions
async function handleExport(format: 'png' | 'pdf') {
  if (!resultsContainer.value || !sim.results) return;
  
  try {
    const filename = `endowcast-${sim.results.id || 'results'}-${new Date().toISOString().split('T')[0]}`;
    await exportElement(resultsContainer.value, {
      filename,
      format,
      quality: 0.95,
      scale: 2
    });
  } catch (error) {
    console.error('Export error:', error);
    alert('Failed to export results. Please try again.');
  }
}

async function handleCopyLink() {
  if (!sim.results) return;
  isCopying.value = true;
  copySuccess.value = false;
  try {
    // Try to create a short share link via the API. If the endpoint doesn't exist
    // we'll fall back to copying the current full URL.
    const payload = {
      payloadType: 'results',
      payloadRef: (sim.results && (sim.results.id || sim.results.simulationId)) || null,
      // default expiry (days) can be handled server-side
      expiresInDays: 30
    };

    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      // Server may return either { url } or { token }
      if (data.url) shareUrl.value = data.url;
      else if (data.token) shareUrl.value = `${window.location.origin}/s/${data.token}`;
      else shareUrl.value = window.location.href;
    } else {
      // fallback: use current page
      shareUrl.value = window.location.href;
    }

    // copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl.value);
      copySuccess.value = true;
    } catch (err) {
      // last resort: select and prompt copy
      console.warn('Clipboard API failed, falling back to prompt', err);
       
      window.prompt('Copy this link', shareUrl.value);
      copySuccess.value = true;
    }
  } catch (err) {
    console.error('Failed to create share link, falling back to current URL', err);
    shareUrl.value = window.location.href;
    try { await navigator.clipboard.writeText(shareUrl.value); copySuccess.value = true; } catch(e){ /* ignore */ }
  } finally {
    isCopying.value = false;
    setTimeout(() => (copySuccess.value = false), 2500);
  }
}

// Track if component is mounted to prevent state updates after unmount
let isMounted = false;
let cleanupTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Watch for route changes and load scenario when scenarioId param changes
watch(() => route.params.scenarioId as string | undefined, async (newScenarioId) => {
  if (newScenarioId && isMounted) {
    // for this ID, do not load it again. This handles the initial route push.
    if (sim.results && sim.results.id === newScenarioId) {
        console.log('Store already has results for this ID. Skipping loadScenario.');
        markExportReady();
        return;
    }
    try {
      await sim.loadScenario(newScenarioId);
      markExportReady();
    } catch (error) {
      console.error('Error loading scenario from route:', error);
    }
  }
});

// Watch for results changes to mark as ready
watch(() => sim.results, (newResults) => {
  if (newResults) {
    markExportReady();
  }
}, { deep: true });

// Check for scenarioId query parameter and load scenario on mount
onMounted(async () => {
  isMounted = true;
  try {
    // If a scenarioId is provided in the path, load that saved scenario.
    const pathId = route.params.scenarioId as string | undefined;
    const queryId = route.query.scenarioId as string | undefined;
    const scenarioId = pathId || queryId;

    if (scenarioId && isMounted) {
      //Check before calling loadScenario on mount as well.
      if (sim.results && sim.results.id === scenarioId) return;
      await sim.loadScenario(scenarioId);
      markExportReady();
      // If the id came from query, replace URL with canonical path route
      if (!pathId && queryId) {
        router.replace({ name: 'ResultsById', params: { scenarioId } });
      }
      return;
    }

    // If no id was provided, but there's in-memory results (user ran simulation), prefer that
    if (!scenarioId && sim.results) {
      markExportReady();
      // Don't schedule cleanup on mount - keep arrays for chart rendering
      return;
    }
  } catch (error) {
    console.error('Error loading scenario:', error);
  }
});

// Schedule cleanup of large arrays only when leaving the page
function scheduleMemoryCleanup() {
  if (!sim.results) return;
  
  // Clear only after a very long delay (30 seconds) or when user leaves the page
  // This gives plenty of time for all charts and tables to render
  if (cleanupTimeoutId) clearTimeout(cleanupTimeoutId);
  cleanupTimeoutId = setTimeout(() => {
    if (sim.results && isMounted) {
      // Clear the large simulation arrays to free memory
      (sim.results as any).simulations = [];
      (sim.results as any).portfolioReturns = [];
      (sim.results as any).benchmarks = [];
      (sim.results as any).corpusPaths = [];
      (sim.results as any).spendingPolicy = [];
      console.log('✅ Memory cleanup: cleared large simulation arrays after 30 seconds');
    }
  }, 30000);
}

onUnmounted(() => {
  isMounted = false;
  // Clean up timeout if user leaves before it executes
  if (cleanupTimeoutId) {
    clearTimeout(cleanupTimeoutId);
  }
  // Clear arrays immediately when leaving the page
  if (sim.results) {
    (sim.results as any).simulations = [];
    (sim.results as any).portfolioReturns = [];
    (sim.results as any).benchmarks = [];
    (sim.results as any).corpusPaths = [];
    (sim.results as any).spendingPolicy = [];
  }
});
</script>

<template>
  <main class="min-h-screen bg-slate-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2">Monte Carlo Analysis</h1>
        <p class="text-lg text-slate-700 leading-7 max-w-2xl mx-auto">
          Run sophisticated simulations to evaluate your endowment's long-term sustainability
        </p>
        <div class="mt-6 flex items-center justify-center">
          <div class="flex items-center bg-white rounded-full px-4 py-2 shadow-sm">
            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span class="text-blue-600 font-semibold text-sm">4</span>
            </div>
            <span class="text-slate-700 font-medium">Results & Analysis</span>
          </div>
        </div>
      </div>

      <!-- Simulation Launch Card -->
      <div class="card p-8 mb-8 text-center hover:shadow-lg transition-shadow">
        <div class="flex items-center justify-center mb-6">
          <div class="w-12 h-12 rounded-lg bg-gradient-to-br from-sky-700 to-indigo-600 flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Execute Simulation</h2>
            <p class="text-gray-600">Generate thousands of scenarios to test your endowment strategy</p>
          </div>
        </div>
        
        <button 
          @click="run" 
          :disabled="sim.isLoading || !authStore.canRunSimulation" 
          class="bg-sky-700 text-white text-lg font-bold rounded-lg shadow-md
    py-3 px-8 
    flex items-center justify-center mx-auto 
    
    /* Hover/Transition Effects */
    transition-all duration-300 transform 
    hover:bg-blue-800 hover:shadow-xl hover:scale-103
    
    /* Disabled Styles (Keep these!) */
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <div v-if="sim.isLoading" class="loading-spinner-small mr-3"></div>
          <svg v-else-if="authStore.canRunSimulation" class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-10-4h.01M19 10h.01M15 21v-1a2 2 0 00-2-2h-2a2 2 0 00-2 2v1"></path>
          </svg>
          <span v-if="!authStore.canRunSimulation">
            Simulation Limit Reached ({{ authStore.remainingSimulations }}/{{ authStore.usageStats?.monthlyLimit === -1 ? 'unlimited' : (authStore.usageStats?.monthlyLimit ?? authStore.currentPlanLimits.simulations) }})
          </span>
          <span v-else>
            {{ sim.isLoading ? 'Running Analysis...' : 'Run Monte Carlo Analysis' }}
          </span>
        </button>
        
        <!-- Simulation count info -->
        <div v-if="authStore.isAuthenticated && authStore.user" class="mt-4">
          <p class="text-sm text-gray-600 text-center">
            Simulations remaining: {{ authStore.remainingSimulations }}/{{ authStore.usageStats?.monthlyLimit === -1 ? 'unlimited' : (authStore.usageStats?.monthlyLimit ?? authStore.currentPlanLimits.simulations) }}
            <span v-if="authStore.subscription?.planType === 'FREE'" class="ml-2">
              <RouterLink to="/pricing" class="text-blue-600 hover:text-blue-700 underline">Upgrade for more</RouterLink>
            </span>
          </p>
        </div>
        
        <div v-if="sim.isLoading" class="mt-6">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <div class="flex items-center text-blue-800">
              <svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm font-medium">Processing thousands of market scenarios...</span>
            </div>
          </div>
        </div>
        
        <div v-if="sim.errorMsg" class="mt-6">
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
            <div class="flex items-center text-red-800">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
              </svg>
              <span class="text-sm font-medium">{{ sim.errorMsg }}</span>
            </div>
          </div>
        </div>
        
        <p class="text-sm text-gray-500 mt-6 max-w-lg mx-auto">
          Our advanced Monte Carlo engine will model market volatility, inflation, and policy constraints to provide comprehensive endowment projections.
        </p>
      </div>

      <!-- Results Section -->
      <div v-if="sim.results" class="space-y-8">
        <!-- Results Header -->
        <div class="text-center pt-8 border-t border-gray-200">
          <div class="flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h2 class="text-3xl font-bold text-gray-900">Simulation Results</h2>
          </div>
          <p class="text-gray-600 max-w-xl mx-auto">
            Comprehensive analysis based on thousands of market scenarios over your investment horizon
          </p>
        </div>

        <!-- Exportable Results Container -->
        <div ref="resultsContainer" data-export-target data-export-ready="false">
          <SimulationResults :results="sim.results" />
        </div>

        <!-- Export & Share Options -->
        <div class="card p-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Share & Export Analysis</h3>
              <p class="text-gray-600 text-sm">Save results for presentations or share with stakeholders</p>
            </div>
            <div class="flex items-center flex-wrap gap-3">
              <!-- Add to Comparison Button -->
              <button
                @click="handleAddToComparison"
                :disabled="addingToComparison || isInComparison"
                class="inline-flex items-center gap-2 py-2.5 px-5 text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md shadow-sm"
                :title="isInComparison ? 'Already in comparison' : 'Add to scenario comparison'"
              >
                <svg v-if="!addingToComparison && !addedToComparison" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <svg v-else-if="addingToComparison" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <svg v-else-if="addedToComparison" class="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" clip-rule="evenodd"/>
                </svg>
                <span v-if="isInComparison">In Comparison</span>
                <span v-else-if="addedToComparison">Added!</span>
                <span v-else>Add to Comparison</span>
              </button>

              <!-- Go to Comparison Button (shown when scenarios exist) -->
              <button
                v-if="scenarios.length > 0"
                @click="goToComparison"
                class="inline-flex items-center gap-2 py-2.5 px-5 text-sm font-medium bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 transition-colors rounded-md shadow-sm"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>View Comparison ({{ scenarios.length }})</span>
              </button>

              <!-- Export PDF Button -->
              <button
                @click="handleExport('pdf')"
                :disabled="isExportingPng || isExportingPdf"
                class="inline-flex items-center gap-2 py-2.5 px-5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md shadow-sm"
              >
                <svg v-if="!isExportingPdf" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                <svg v-else class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>{{ isExportingPdf ? `Exporting... ${pdfProgress}%` : 'Export PDF' }}</span>
              </button>

              <!-- Export PNG Button -->
              <button
                @click="handleExport('png')"
                :disabled="isExportingPng || isExportingPdf"
                class="inline-flex items-center gap-2 py-2.5 px-5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md shadow-sm"
              >
                <svg v-if="!isExportingPng" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <svg v-else class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>{{ isExportingPng ? `Exporting... ${pngProgress}%` : 'Export PNG' }}</span>
              </button>

              <!-- Copy Link Button -->
              <button
                @click="handleCopyLink"
                :disabled="isCopying || isExportingPng || isExportingPdf"
                class="inline-flex items-center gap-2 py-2.5 px-5 text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md shadow-sm"
                aria-live="polite"
              >
                <svg v-if="!isCopying && !copySuccess" class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                </svg>
                <svg v-else-if="isCopying" class="w-4 h-4 inline animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <svg v-else-if="copySuccess" class="w-4 h-4 inline text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" clip-rule="evenodd"/></svg>
                <span>
                  <span v-if="isCopying">Creating link...</span>
                  <span v-else-if="copySuccess">Copied!</span>
                  <span v-else>Copy Link</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex justify-between items-center mt-8 pt-8 border-t border-gray-200">
        <RouterLink to="/allocation" class="btn-secondary py-3 px-6 text-lg font-medium hover:shadow-md transition-all">
          <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
          </svg>
          Back: Allocation
        </RouterLink>
        
        <RouterLink to="/instructions" class="text-gray-600 hover:text-gray-900 transition-colors flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Need Help?
        </RouterLink>
      </div>
    </div>
  </main>
</template>
