<script setup lang="ts">
import { ref, reactive, onBeforeUnmount, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { RouterLink } from 'vue-router';
import TheHeader from '../../../shared/components/layout/TheHeader.vue';
import PageHeader from '../../../shared/components/layout/PageHeader.vue';
import InputCard from '../components/inputs/InputCard.vue';
import PortfolioWeights from '../components/inputs/PortfolioWeights.vue';
import GrantTargets from '../components/inputs/GrantTargets.vue';
import SummaryCards from '../components/results/SummaryCards.vue';
import SimulationSummary from '../components/results/SimulationSummary.vue';
import StatisticalSummary from '../components/results/StatisticalSummary.vue';
import EndowmentValueChart from '../components/results/charts/EndowmentValueChart.vue';
import ResultsDataTable from '../components/results/ResultsDataTable.vue';
import EnhancedRiskAnalysis from '../components/results/EnhancedRiskAnalysis.vue';
import { runMonteCarlo, type EngineOptions, type SimulationOutputs, assetClasses } from '../lib/monteCarlo';
import { calculateRiskMetrics } from '../lib/analytics';
import { generateNarrativeInsights } from '../lib/insights';
import { useAuthStore } from '@/features/auth/stores/auth';
import { apiService } from '@/shared/services/api';

const authStore = useAuthStore();

// Reactive state for all simulation inputs
const inputs = reactive({
  initialEndowment: 50000000,
  spendingPolicyRate: 5,
  investmentExpenseRate: 1,
  initialOperatingExpense: 1000000,
  initialGrant: 1500000,
  // Align with vanilla defaults and ranges
  portfolioWeights: {
    publicEquity: 50,
    privateEquity: 15,
    publicFixedIncome: 18,
    privateCredit: 4,
    realAssets: 6,
    diversifying: 7,
    cashShortTerm: 0,
  },
  grantTargets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
});

// Allocation policy limits for each asset (user-defined)
const allocationPolicy = reactive<Record<string, { min: number; max: number; default: number; label: string }>>({
  publicEquity: { label: 'Public Equity', min: 50, max: 70, default: 50 },
  privateEquity: { label: 'Private Equity', min: 5, max: 25, default: 15 },
  publicFixedIncome: { label: 'Public Fixed Income', min: 5, max: 30, default: 18 },
  privateCredit: { label: 'Private Credit', min: 0, max: 10, default: 4 },
  realAssets: { label: 'Real Assets', min: 0, max: 20, default: 6 },
  diversifying: { label: 'Diversifying Strategies', min: 0, max: 20, default: 7 },
  cashShortTerm: { label: 'Cash/Short-Term', min: 0, max: 10, default: 0 },
});

const allocationCategories = computed(() => {
  return Object.keys(allocationPolicy).map(k => ({ key: k, label: allocationPolicy[k].label, min: allocationPolicy[k].min, max: allocationPolicy[k].max, default: allocationPolicy[k].default }));
});

// Advanced options
const options = reactive<EngineOptions>({
  seed: undefined,
  spendingPolicy: { type: 'simple', cpiLinked: false },
  rebalancing: { bandPct: 0, frequency: 'annual' },
  stress: {
  equityShocks: [],
  cpiShifts: [],
  },
  assets: { overrides: {} },
  corpus: { enabled: false, initialValue: 246900000 }
});

// State for simulation results
const results = ref<any>(null);
const displayMode = ref<'nominal' | 'real'>('nominal');
const isLoading = ref(false);
const errorMsg = ref<string | null>(null);

// Scenario management
const showSaveModal = ref(false);
const scenarioForm = reactive({
  name: '',
  description: '',
  tags: '',
  isPublic: true
});

function saveScenario() {
  showSaveModal.value = true;
  // Pre-fill with descriptive name
  const spending = inputs.spendingPolicyRate;
  const equity = inputs.portfolioWeights.publicEquity + inputs.portfolioWeights.privateEquity;
  scenarioForm.name = `${spending}% Spending, ${equity}% Equity`;
  scenarioForm.description = '';
  scenarioForm.tags = '';
  scenarioForm.isPublic = true;
}

function confirmSaveScenario() {
  const scenario = {
    name: scenarioForm.name,
    description: scenarioForm.description,
    tags: scenarioForm.tags.split(',').map(t => t.trim()).filter(Boolean),
    isPublic: scenarioForm.isPublic,
    inputs: { ...inputs },
    options: { ...options },
    results: results.value ? {
      medianFinalValue: results.value.analytics?.medianFinalValue,
      medianAnnualizedReturn: results.value.analytics?.medianCagr,
      sustainabilityProb: results.value.analytics?.sustainabilityProb,
      maxDrawdown: results.value.analytics?.maxDrawdown
    } : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // TODO: Save to API/localStorage
  console.log('Saving scenario:', scenario);
  
  showSaveModal.value = false;
  // Reset form
  scenarioForm.name = '';
  scenarioForm.description = '';
  scenarioForm.tags = '';
}

function loadScenario(scenarioData: any) {
  // Load inputs
  Object.assign(inputs, scenarioData.inputs);
  
  // Load options
  Object.assign(options, scenarioData.options);
  
  // Clear results to force re-run
  results.value = null;
}

let worker: Worker | null = null;
onBeforeUnmount(() => { if (worker) { worker.terminate(); worker = null; } });

// Helpers for asset overrides (UI uses percent; engine expects fractions)
function ensureOverride(key: string) {
  if (!options.assets) (options as any).assets = { overrides: {} };
  if (!options.assets!.overrides) (options.assets as any).overrides = {};
  if (!(options.assets!.overrides as any)[key]) (options.assets!.overrides as any)[key] = {};
}
function getOverrideMeanPct(key: string, defMean: number): number | undefined {
  const val = (options.assets?.overrides as any)?.[key]?.mean;
  return typeof val === 'number' ? val * 100 : undefined;
}
function setOverrideMeanPct(key: string, val: any) {
  const num = Number(val?.target ? val.target.value : val);
  if (!isFinite(num) && val !== 0 && val !== '0') {
    if ((options.assets?.overrides as any)?.[key]) delete (options.assets!.overrides as any)[key].mean;
    return;
  }
  ensureOverride(key);
  // clamp
  const min = -100;
  const max = 100;
  const clamped = Math.max(min, Math.min(max, Number(num)));
  (options.assets!.overrides as any)[key].mean = clamped / 100;
}
function getOverrideSdPct(key: string, defSd: number): number | undefined {
  const val = (options.assets?.overrides as any)?.[key]?.sd;
  return typeof val === 'number' ? val * 100 : undefined;
}
function setOverrideSdPct(key: string, val: any) {
  const num = Number(val?.target ? val.target.value : val);
  if (!isFinite(num) && val !== 0 && val !== '0') {
    if ((options.assets?.overrides as any)?.[key]) delete (options.assets!.overrides as any)[key].sd;
    return;
  }
  ensureOverride(key);
  // clamp
  const min = 0;
  const max = 200;
  const clamped = Math.max(min, Math.min(max, Number(num)));
  (options.assets!.overrides as any)[key].sd = clamped / 100;
}

function normalizeOptions(): EngineOptions {
  const sp = options.spendingPolicy ?? {};
  // Convert percent inputs to fractions if provided as whole percent values
  const floorYoY = (sp as any).floorYoY;
  const capYoY = (sp as any).capYoY;
  const norm: EngineOptions = {
    seed: options.seed,
    rebalancing: { ...options.rebalancing },
    spendingPolicy: {
      type: sp.type,
      cpiLinked: sp.cpiLinked,
      floorYoY: typeof floorYoY === 'number' && !Number.isNaN(floorYoY) ? floorYoY / 100 : undefined,
      capYoY: typeof capYoY === 'number' && !Number.isNaN(capYoY) ? capYoY / 100 : undefined,
    },
    stress: {
      equityShocks: (options.stress?.equityShocks ?? []).filter(s => typeof s.pct === 'number' && typeof s.year === 'number'),
      cpiShifts: (options.stress?.cpiShifts ?? []).filter(s => typeof s.deltaPct === 'number' && typeof s.from === 'number' && typeof s.to === 'number'),
  },
  assets: { overrides: options.assets?.overrides ?? {} },
  corpus: { enabled: options.corpus?.enabled !== false, initialValue: options.corpus?.initialValue }
  };
  return norm;
}

const router = useRouter();

async function runSimulation() {
  // Check if user can run simulation
  if (!authStore.canRunSimulation) {
    const limit = authStore.currentPlanLimits.simulations === -1 ? 'unlimited' : authStore.currentPlanLimits.simulations;
    errorMsg.value = `You have reached your simulation limit (${limit}). Please upgrade your plan to run more simulations.`;
    return;
  }

  errorMsg.value = null;
  isLoading.value = true;
  const payload = JSON.parse(JSON.stringify(inputs));
  // Guard: sanitize equityShocks years to within 1..10
  if (Array.isArray(options.stress?.equityShocks)) {
    for (const sh of options.stress!.equityShocks!) {
      if (typeof sh.year === 'number') {
        if (sh.year < 1) sh.year = 1 as any;
        if (sh.year > 10) sh.year = 10 as any;
      }
    }
  }

  let simulationId: string | null = null;

  try {
    // First, create the simulation record in the database
    if (authStore.isAuthenticated) {
      const simulationData = {
        name: `Simulation ${new Date().toLocaleString()}`,
        years: payload.years || 10,
        startYear: payload.startYear || new Date().getFullYear(),
        initialValue: payload.initialEndowment,
        spendingRate: payload.spendingPolicyRate / 100, // Convert percentage to decimal
        spendingGrowth: 0, // Default value
        equityReturn: 0.07, // Default assumption
        equityVolatility: 0.16, // Default assumption  
        bondReturn: 0.04, // Default assumption
        bondVolatility: 0.05, // Default assumption
        correlation: 0.1, // Default assumption
        equityShock: options.stress?.equityShocks?.length ? JSON.stringify(options.stress.equityShocks) : null,
        cpiShift: options.stress?.cpiShifts?.length ? JSON.stringify(options.stress.cpiShifts) : null,
        grantTargets: payload.grantTargets?.length ? JSON.stringify(payload.grantTargets) : null,
        portfolio: {
          name: `Portfolio ${new Date().toLocaleString()}`,
          equityAllocation: payload.portfolioWeights.publicEquity + payload.portfolioWeights.privateEquity,
          bondAllocation: payload.portfolioWeights.publicFixedIncome + payload.portfolioWeights.privateCredit,
          alternativeAllocation: payload.portfolioWeights.realAssets + payload.portfolioWeights.diversifying,
          cashAllocation: payload.portfolioWeights.cashShortTerm,
          description: 'Portfolio allocation from simulation'
        }
      };

      const createResponse = await apiService.createSimulation(simulationData);
      simulationId = createResponse.simulation.id;
    }

    // Use Web Worker to offload heavy compute
    if (!worker) {
      worker = new Worker(new URL('../lib/simWorker.ts', import.meta.url), { type: 'module' });
    }
  const normOpts = normalizeOptions();
    // Deep-clone options to strip Vue Proxy references before sending to the worker
    const plainOpts = JSON.parse(JSON.stringify(normOpts));
    const out = await new Promise<SimulationOutputs>((resolve, reject) => {
      const onMsg = (ev: MessageEvent) => {
        const data = ev.data;
        if (data?.ok) { resolve(data.data); } else { reject(new Error(data?.error ?? 'Worker error')); }
        worker?.removeEventListener('message', onMsg);
        worker?.removeEventListener('error', onErr);
      };
      const onErr = (e: ErrorEvent) => {
        reject(e.error ?? new Error(e.message || 'Worker crashed'));
        worker?.removeEventListener('message', onMsg);
        worker?.removeEventListener('error', onErr);
      };
      worker!.addEventListener('message', onMsg);
      worker!.addEventListener('error', onErr);
      worker!.postMessage({ inputs: payload, opts: plainOpts });
    });
  // Summaries
    const lastValues = (out.simulations as number[][]).map((sim: number[]) => sim[sim.length - 1]);
    const initial = payload.initialEndowment;
    const medianFinal = [...lastValues].sort((a:number,b:number)=>a-b)[Math.floor(lastValues.length/2)];
    const lossProb = lastValues.filter((v:number) => v < initial).length / lastValues.length;
    // Median annualized portfolio return (geometric mean of raw portfolio returns, not impacted by cash flows)
    const years = (out.simulations[0]?.length ?? 10) as number;
    const perSimGeo = (out.portfolioReturns ?? []).map((rets: number[]) => {
      if (!rets?.length) return NaN;
      let prod = 1;
      for (const r of rets) prod *= (1 + r);
      return Math.pow(prod, 1 / rets.length) - 1;
    }).filter((x: number) => isFinite(x));
    const sortedGeo = perSimGeo.sort((a: number,b: number)=>a-b);
    const medianCagr = sortedGeo.length ? sortedGeo[Math.floor(sortedGeo.length/2)] : 0;

    // Stress summary (for badges)
    const eqCount = normOpts.stress?.equityShocks?.length ?? 0;
    const cpiCount = normOpts.stress?.cpiShifts?.length ?? 0;
    const stressApplied = eqCount + cpiCount > 0;
    const stressSummary = stressApplied ? `Equity shocks: ${eqCount}${cpiCount ? `, CPI shifts: ${cpiCount}` : ''}` : '';

    // Calculate enhanced risk metrics
    const riskMetrics = calculateRiskMetrics(
      out.simulations,
      initial,
      out.portfolioReturns,
      out.benchmarks,
      out.spendingPolicy,
      initial,
      0.02,
    );
    
    // Generate narrative insights
    const narrativeInsights = generateNarrativeInsights(out, payload, riskMetrics);

    const simulationResults = {
      ...out,
      stress: { applied: stressApplied, summary: stressSummary, counts: { equity: eqCount, cpi: cpiCount } },
      summary: {
        medianFinalValue: medianFinal,
        probabilityOfLoss: lossProb,
        annualizedReturn: medianCagr * 100,
      },
      riskMetrics,
      narrativeInsights,
      display: { mode: displayMode.value },
    };

    results.value = simulationResults;

    // Save the simulation results to the database
    if (authStore.isAuthenticated && simulationId) {
      await apiService.saveSimulationResults(simulationId, {
        simulations: out.simulations,
        portfolioReturns: out.portfolioReturns,
        spendingPolicy: out.spendingPolicy,
        summary: simulationResults.summary,
        stress: simulationResults.stress
      });
    }

    // Increment simulation usage after successful simulation
    authStore.incrementSimulationUsage();

    // If we have results, navigate to the consolidated Results page so users can view/share
    if (results.value) {
      // If the server created a simulation record earlier, we may have an id on results
      const scenarioId = (results.value && (results.value.id || results.value.simulationId)) || null;
  if (scenarioId) router.push({ name: 'ResultsById', params: { scenarioId } });
  else router.push({ name: 'Results' });
    }
    
  } catch (err: any) {
    console.error('Simulation failed', err);
    errorMsg.value = err?.message || String(err) || 'Simulation failed';
    
    // If we created a simulation record but the computation failed, we should clean it up
    if (simulationId && authStore.isAuthenticated) {
      try {
        await apiService.deleteSimulation(simulationId);
      } catch (cleanupErr) {
        console.error('Failed to cleanup simulation record:', cleanupErr);
      }
    }
  } finally {
    isLoading.value = false;
  }
}

// Scenario share/load helpers
function encodeScenario() {
  const state = { inputs, options };
  const json = JSON.stringify(state);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  const url = new URL(window.location.href);
  url.searchParams.set('s', b64);
  return url.toString();
}
async function copyShareLink() {
  const link = encodeScenario();
  try { await navigator.clipboard.writeText(link); } catch {}
}
function loadFromURL() {
  const url = new URL(window.location.href);
  const s = url.searchParams.get('s');
  if (!s) return;
  try {
    const json = decodeURIComponent(escape(atob(s)));
    const obj = JSON.parse(json);
    if (obj?.inputs) Object.assign(inputs, obj.inputs);
    if (obj?.options) {
      Object.assign(options, obj.options);
      // Normalize stress shape for backward compatibility
      const st: any = (options as any).stress || {};
      const equityShocks = Array.isArray(st.equityShocks) ? st.equityShocks : [];
      const cpiShifts = Array.isArray(st.cpiShifts) ? st.cpiShifts : [];
      if (typeof st.equityShockPct === 'number' && typeof st.equityShockYear === 'number') {
        equityShocks.push({ pct: st.equityShockPct, year: st.equityShockYear });
      }
      if (typeof st.cpiShiftPct === 'number' && Array.isArray(st.cpiShiftYears) && st.cpiShiftYears.length === 2) {
        cpiShifts.push({ deltaPct: st.cpiShiftPct, from: st.cpiShiftYears[0], to: st.cpiShiftYears[1] });
      }
      (options as any).stress = { equityShocks, cpiShifts };
    }
  } catch {}
}
onMounted(() => { loadFromURL(); });
</script>

<template>
  <div class="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-4 py-2 text-center">
    This consolidated page is being split. Use the top nav: Settings → Allocation → Results.
  </div>
  <main class="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
    <!-- Page Header -->
    <div class="mb-10 flex items-center justify-between">
      <div class="text-center flex-1">
        <h1 class="text-3xl sm:text-4xl font-bold text-text-primary">Strategic Endowment Forecast</h1>
        <p class="text-text-secondary mt-2 max-w-3xl mx-auto">Modeling a decade of growth and spending to ensure the foundation’s long‑term financial health and mission fulfillment.</p>
      </div>
      <div class="flex space-x-3">
        <RouterLink to="/simulation/history" class="btn-secondary">📊 History</RouterLink>
        <button @click="saveScenario" :disabled="!results" class="btn-primary" :class="{ 'opacity-50 cursor-not-allowed': !results }">💾 Save</button>
      </div>
    </div>
    <div class="card p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4 section-title">Model Parameters</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="text-sm font-medium block mb-2">Asset Class Assumptions</label>
          <div class="space-y-3">
            <div v-for="a in assetClasses" :key="a.key" class="grid grid-cols-4 gap-3 items-end">
              <div>
                <label class="text-xs text-text-secondary">{{ a.label }}</label>
                <div class="text-xs text-text-secondary">Default μ {{ (a.mean*100).toFixed(1) }}% / σ {{ (a.sd*100).toFixed(1) }}%</div>
              </div>
              <div>
                <label class="text-xs text-text-secondary">Mean (%)</label>
                <input type="number" step="0.1" :placeholder="(a.mean*100).toFixed(1)" :value="getOverrideMeanPct(a.key, a.mean)" @input="setOverrideMeanPct(a.key, $event)" class="input-field w-full p-2 rounded-md" />
              </div>
              <div>
                <label class="text-xs text-text-secondary">Vol (%)</label>
                <input type="number" step="0.1" :placeholder="(a.sd*100).toFixed(1)" :value="getOverrideSdPct(a.key, a.sd)" @input="setOverrideSdPct(a.key, $event)" class="input-field w-full p-2 rounded-md" />
              </div>
              
            </div>
          </div>
          <div class="mt-3">
            <button type="button" class="btn-secondary py-1 px-2 text-xs" @click="options.assets!.overrides = {}">Reset Overrides</button>
          </div>
        </div>
        <div>
          <label class="text-sm font-medium block mb-2">Corpus Settings</label>
          <div class="flex items-center mb-3">
            <input type="checkbox" v-model="(options.corpus as any).enabled" class="mr-2" />
            <span class="text-sm">Enable Corpus (CPI growth)</span>
          </div>
          <div>
            <label class="text-xs text-text-secondary">Initial Corpus Value (optional)</label>
            <div class="flex items-center">
              <span class="text-xl font-medium text-text-secondary mr-2">$</span>
              <input type="number" v-model.number="(options.corpus as any).initialValue" class="input-field w-full p-2 rounded-md" placeholder="246900000" />
            </div>
            <p class="text-xs text-text-secondary mt-2">If disabled, corpus line and stats are hidden.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Section: responsive one-row (wide) or two-rows (medium) grid -->
    <div class="inputs-grid mb-6">
      <div class="card p-6">
        <h2 class="text-lg font-semibold mb-4 section-title">Initial Endowment</h2>
        <div class="flex items-center">
          <span class="text-xl font-medium text-text-secondary mr-2">$</span>
          <input type="number" v-model="inputs.initialEndowment" class="input-field w-full text-xl p-3 rounded-md" />
        </div>
      </div>
      <div class="card p-6">
        <h2 class="text-lg font-semibold mb-4 section-title">Spending Policy Rate (%)</h2>
        <div class="flex items-center">
      <input type="number" v-model.number="inputs.spendingPolicyRate" step="0.5" min="0" max="10" class="input-field w-full text-xl p-3 rounded-md" />
          <span class="text-xl font-medium text-text-secondary ml-2">%</span>
        </div>
      </div>
      <div class="card p-6">
        <h2 class="text-lg font-semibold mb-4 section-title">Investment Expense (%)</h2>
        <div class="flex items-center">
      <input type="number" v-model.number="inputs.investmentExpenseRate" step="0.1" min="0" max="5" class="input-field w-full text-xl p-3 rounded-md" />
          <span class="text-xl font-medium text-text-secondary ml-2">%</span>
        </div>
      </div>
      <div class="card p-6">
        <h2 class="text-lg font-semibold mb-4 section-title">Initial Operating Expense</h2>
        <div class="flex items-center">
          <span class="text-xl font-medium text-text-secondary mr-2">$</span>
          <input type="number" v-model.number="inputs.initialOperatingExpense" min="0" step="50000" class="input-field w-full text-xl p-3 rounded-md" />
        </div>
        <p class="text-xs text-text-secondary mt-2 italic">Grows annually by CPI. Leave blank to auto-calculate based on spending rate.</p>
      </div>
      <div class="card p-6">
        <h2 class="text-lg font-semibold mb-4 section-title">Initial Grant Amount</h2>
        <div class="flex items-center">
          <span class="text-xl font-medium text-text-secondary mr-2">$</span>
          <input type="number" v-model="inputs.initialGrant" class="input-field w-full text-xl p-3 rounded-md" />
        </div>
        <p class="text-xs text-text-secondary mt-2 italic">For Year 1. Subsequent years are based on the spending policy.</p>
      </div>
    </div>
    <div class="card p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4 section-title">Portfolio Allocation</h2>
      <PortfolioWeights v-model="inputs.portfolioWeights" :categories="allocationCategories" />
    </div>
    <div class="card p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4 section-title">Allocation Policy Limits</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="k in Object.keys(allocationPolicy)" :key="k" class="space-y-2">
          <div class="text-sm font-medium">{{ allocationPolicy[k].label }}</div>
          <div class="grid grid-cols-3 gap-2 items-end">
            <div>
              <label class="text-xs text-text-secondary">Min (%)</label>
              <input type="number" step="1" min="0" max="100" v-model.number="allocationPolicy[k].min" class="input-field w-full p-2 rounded-md" />
            </div>
            <div>
              <label class="text-xs text-text-secondary">Max (%)</label>
              <input type="number" step="1" min="0" max="100" v-model.number="allocationPolicy[k].max" class="input-field w-full p-2 rounded-md" />
            </div>
            <div>
              <label class="text-xs text-text-secondary">Default (%)</label>
              <input type="number" step="1" min="0" max="100" v-model.number="allocationPolicy[k].default" class="input-field w-full p-2 rounded-md" />
            </div>
          </div>
        </div>
      </div>
      <p class="text-xs text-text-secondary mt-3">Weights will be clamped to these limits and presets/defaults use these values.</p>
    </div>
    <div class="card p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4 section-title">Advanced Settings</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label class="text-sm font-medium">Spending Policy</label>
          <select v-model="options.spendingPolicy!.type" class="input-field w-full p-2 rounded-md mt-1">
            <option value="simple">Simple (current MV)</option>
            <option value="avgMV3">Average MV (3-year)</option>
            <option value="avgMV5">Average MV (5-year)</option>
          </select>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-secondary">YoY Floor</label>
              <input type="number" step="0.5" min="-50" max="50" v-model.number="(options.spendingPolicy as any).floorYoY" class="input-field w-full p-2 rounded-md" placeholder="%" />
            </div>
            <div>
              <label class="text-xs text-text-secondary">YoY Cap</label>
              <input type="number" step="0.5" min="-50" max="200" v-model.number="(options.spendingPolicy as any).capYoY" class="input-field w-full p-2 rounded-md" placeholder="%" />
            </div>
          </div>
          <label class="inline-flex items-center mt-3 text-sm">
            <input type="checkbox" v-model="(options.spendingPolicy as any).cpiLinked" class="mr-2" /> CPI-linked floor/cap
          </label>
        </div>
        <div>
          <label class="text-sm font-medium">Rebalancing</label>
          <div class="mt-1 grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-secondary">Band (%)</label>
              <input type="number" step="1" min="0" max="25" v-model.number="options.rebalancing!.bandPct" class="input-field w-full p-2 rounded-md" />
            </div>
            <div>
              <label class="text-xs text-text-secondary">Frequency</label>
              <select v-model="options.rebalancing!.frequency" class="input-field w-full p-2 rounded-md">
                <option value="annual">Annual</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
        </div>
        <div>
          <label class="text-sm font-medium">Random Seed (optional)</label>
          <input type="number" v-model.number="options.seed" class="input-field w-full p-2 rounded-md mt-1" placeholder="e.g. 12345" />
          <p class="text-xs text-text-secondary mt-2">Use a seed for reproducible simulations.</p>
          <div class="mt-4">
            <button type="button" class="btn-secondary py-2 px-3 text-sm" @click="copyShareLink">Copy shareable link</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4 section-title">Stress Tests</h2>
      <div class="space-y-6">
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium">Equity Shocks</label>
            <div class="space-x-2">
              <button type="button" class="btn-secondary py-1 px-2 text-xs" @click="options.stress!.equityShocks!.push({ pct: -25, year: 2 })">Preset: -25% @ Y2</button>
              <button type="button" class="btn-secondary py-1 px-2 text-xs" @click="options.stress!.equityShocks!.push({ pct: -35, year: 1 })">Preset: -35% @ Y1</button>
            </div>
          </div>
          <div class="space-y-3">
            <div v-for="(sh, idx) in options.stress!.equityShocks" :key="'eq-'+idx" class="grid grid-cols-3 gap-3 items-end">
              <div>
                <label class="text-xs text-text-secondary">Shock (%)</label>
                <input type="number" step="1" min="-90" max="50" v-model.number="sh.pct" class="input-field w-full p-2 rounded-md" />
              </div>
              <div>
                <label class="text-xs text-text-secondary">Year (1-10)</label>
                <input type="number" step="1" min="1" max="10" v-model.number="sh.year" class="input-field w-full p-2 rounded-md" />
              </div>
              <div class="flex items-center space-x-2">
                <select v-model="sh.assetKey" class="input-field w-full p-2 rounded-md">
                  <option :value="undefined">Public Equity</option>
                  <option value="publicEquity">Public Equity</option>
                  <option value="privateEquity">Private Equity</option>
                  <option value="publicFixedIncome">Public Fixed Income</option>
                  <option value="privateCredit">Private Credit</option>
                  <option value="realAssets">Real Assets</option>
                  <option value="diversifying">Diversifying</option>
                  <option value="cashShortTerm">Cash / Short-term</option>
                </select>
                <button type="button" class="btn-secondary py-2 px-3 text-xs" @click="options.stress!.equityShocks!.splice(idx,1)">Remove</button>
              </div>
            </div>
          </div>
          <div class="mt-2">
            <button type="button" class="btn-secondary py-1 px-2 text-xs" @click="options.stress!.equityShocks!.push({ pct: -10, year: 1 })">Add Shock</button>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium">CPI Regime Shifts</label>
            <div class="space-x-2">
              <button type="button" class="btn-secondary py-1 px-2 text-xs" @click="options.stress!.cpiShifts!.push({ deltaPct: 2, from: 2, to: 5 })">Preset: +2pp Y2–Y5</button>
              <button type="button" class="btn-secondary py-1 px-2 text-xs" @click="options.stress!.cpiShifts!.push({ deltaPct: 3, from: 1, to: 3 })">Preset: +3pp Y1–Y3</button>
            </div>
          </div>
          <div class="space-y-3">
            <div v-for="(cs, idx) in options.stress!.cpiShifts" :key="'cpi-'+idx" class="grid grid-cols-4 gap-3 items-end">
              <div>
                <label class="text-xs text-text-secondary">Delta (pp)</label>
                <input type="number" step="0.5" min="-5" max="10" v-model.number="cs.deltaPct" class="input-field w-full p-2 rounded-md" />
              </div>
              <div>
                <label class="text-xs text-text-secondary">From</label>
                <input type="number" step="1" min="1" max="10" v-model.number="cs.from" class="input-field w-full p-2 rounded-md" />
              </div>
              <div>
                <label class="text-xs text-text-secondary">To</label>
                <input type="number" step="1" min="1" max="10" v-model.number="cs.to" class="input-field w-full p-2 rounded-md" />
              </div>
              <div>
                <button type="button" class="btn-secondary py-2 px-3 text-xs w-full" @click="options.stress!.cpiShifts!.splice(idx,1)">Remove</button>
              </div>
            </div>
          </div>
          <div class="mt-2">
            <button type="button" class="btn-secondary py-1 px-2 text-xs" @click="options.stress!.cpiShifts!.push({ deltaPct: 1, from: 1, to: 1 })">Add CPI Shift</button>
          </div>
        </div>

        <div class="flex items-end justify-end">
          <button type="button" class="btn-secondary py-2 px-3 text-sm" @click="options.stress = { equityShocks: [], cpiShifts: [] }">Reset Stress</button>
        </div>
      </div>
    </div>
    <div class="card p-6 mb-6">
      <h2 class="text-sm font-semibold mb-6 section-title">Target Grant Amounts</h2>
      <GrantTargets v-model="inputs.grantTargets" />
    </div>

  <!-- Section Separator -->
  <div class="section-separator" role="separator" aria-hidden="true"></div>

    <!-- Action Button -->
    <div class="flex justify-center mt-4">
      <button 
        @click="runSimulation" 
        :disabled="isLoading || !authStore.canRunSimulation" 
        class="btn-primary text-lg font-semibold py-3 px-8 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div v-if="isLoading" class="loading-spinner-small mr-3"></div>
        <span v-if="!authStore.canRunSimulation">
          Simulation Limit Reached ({{ authStore.remainingSimulations }}/{{ authStore.currentPlanLimits.simulations === -1 ? 'unlimited' : authStore.currentPlanLimits.simulations }})
        </span>
        <span v-else>
          {{ isLoading ? 'Processing...' : 'Run Simulation' }}
        </span>
      </button>
    </div>
    <p v-if="errorMsg" class="text-red-600 text-sm text-center mt-2">{{ errorMsg }}</p>
    
    <!-- Simulation count info -->
    <div v-if="authStore.isAuthenticated && authStore.user" class="text-center mt-2">
      <p class="text-sm text-gray-600">
        Simulations remaining: {{ authStore.remainingSimulations }}/{{ authStore.currentPlanLimits.simulations === -1 ? 'unlimited' : authStore.currentPlanLimits.simulations }}
        <span v-if="authStore.subscription?.planType === 'FREE'" class="ml-2">
          <RouterLink to="/pricing" class="text-blue-600 hover:text-blue-700 underline">Upgrade for more</RouterLink>
        </span>
      </p>
    </div>

    <!-- Results Section (conditionally rendered) -->
    <div v-if="results" class="space-y-8 pt-8 border-t border-border">
      <div class="flex items-center justify-end">
        <label class="text-sm mr-2">Display:</label>
        <select v-model="results.display.mode" class="input-field py-1 px-2 text-sm">
          <option value="nominal">Nominal</option>
          <option value="real">Real</option>
        </select>
      </div>
      <SummaryCards :results="results" />
      <SimulationSummary :results="results" />
      <StatisticalSummary :results="results" />
      
      <!-- Enhanced Risk Analysis -->
      <EnhancedRiskAnalysis 
        v-if="results.riskMetrics && results.narrativeInsights"
        :riskMetrics="results.riskMetrics"
        :narrativeInsights="results.narrativeInsights"
        :results="results"
        :inputs="inputs"
      />
      
  <SimulationChart :results="results" />
      <ResultsDataTable :results="results" />
    </div>
  </main>

  <!-- Save Scenario Modal -->
  <div v-if="showSaveModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <h3 class="text-lg font-semibold mb-4">Save Scenario</h3>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Scenario Name *</label>
          <input 
            v-model="scenarioForm.name"
            type="text" 
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Conservative Growth Strategy"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea 
            v-model="scenarioForm.description"
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Brief description of this scenario..."
          ></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <input 
            v-model="scenarioForm.tags"
            type="text" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="growth, conservative, stress-test (comma separated)"
          >
        </div>
        
        <div class="flex items-center">
          <input 
            v-model="scenarioForm.isPublic"
            type="checkbox" 
            id="is-public"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          >
          <label for="is-public" class="ml-2 block text-sm text-gray-700">
            Share with organization members
          </label>
        </div>
      </div>
      
      <div class="flex justify-end space-x-3 mt-6">
        <button @click="showSaveModal = false" class="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
          Cancel
        </button>
        <button @click="confirmSaveScenario" :disabled="!scenarioForm.name.trim()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          Save Scenario
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-primary {
  background-color: rgb(37 99 235);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}
.btn-primary:hover {
  background-color: rgb(29 78 216);
}
.btn-secondary {
  background-color: white;
  color: rgb(55 65 81);
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid rgb(209 213 219);
  transition: background-color 0.2s;
}
.btn-secondary:hover {
  background-color: rgb(249 250 251);
}
</style>