import { defineStore } from 'pinia';
import { reactive, ref, watch } from 'vue';
import type { EngineOptions, SimulationOutputs } from '../lib/monteCarlo'; // Types only - simulation now runs on backend
import { useAuthStore } from '../../auth/stores/auth';
import { apiService } from '@/shared/services/api';

// --- 7-FACTOR CONSTANTS ---

// 1. Asset Assumption Defaults (Returns and Volatilities)
const ASSET_ASSUMPTIONS = {
    publicEquity: { mu: 0.08, sigma: 0.15 },
    privateEquity: { mu: 0.12, sigma: 0.22 },
    publicFixedIncome: { mu: 0.03, sigma: 0.04 },
    privateCredit: { mu: 0.07, sigma: 0.10 },
    realAssets: { mu: 0.05, sigma: 0.09 },
    diversifying: { mu: 0.05, sigma: 0.08 },
    cashShortTerm: { mu: 0.015, sigma: 0.005 },
};

// 2. 7x7 Correlation Matrix (Order must match ASSET_CLASSES in backend service)
// [PE, PEq, PFI, PCr, RA, DS, C/ST]
const CORRELATION_MATRIX = [
    [1.0, 0.7, 0.3, 0.4, 0.4, 0.2, 0.1],
    [0.7, 1.0, 0.2, 0.5, 0.6, 0.3, 0.1],
    [0.3, 0.2, 1.0, 0.5, 0.1, 0.1, 0.2],
    [0.4, 0.5, 0.5, 1.0, 0.3, 0.2, 0.1],
    [0.4, 0.6, 0.1, 0.3, 1.0, 0.4, 0.1],
    [0.2, 0.3, 0.1, 0.2, 0.4, 1.0, 0.1],
    [0.1, 0.1, 0.2, 0.1, 0.1, 0.1, 1.0],
];

// --- END 7-FACTOR CONSTANTS ---


// REFACTORED: These are no longer used since simulation computation moved to backend
// Keeping imports for potential fallback/reference purposes
// import { perSimulationWorstCuts, summarizeWorstCuts } from '../utils/spendingCuts';
// import { medoidByFinalValue, nearestToPointwiseMedian, pointwiseMedian } from '../utils/representativePath';

export const useSimulationStore = defineStore('simulation', () => {
  const inputs = reactive({
    initialEndowment: 50000000,
    // Risk-free rate (percent). Used for Sharpe/Sortino calculations and benchmarking.
    riskFreeRate: 2,
    spendingPolicyRate: 5,
    investmentExpenseRate: 1,
    initialOperatingExpense: 1000000,
    initialGrant: 1500000,
    portfolioWeights: {
      publicEquity: 50,
      privateEquity: 15,
      publicFixedIncome: 18,
      privateCredit: 4,
      realAssets: 6,
      diversifying: 7,
      cashShortTerm: 0,
    },
    grantTargets: [0,0,0,0,0,0,0,0,0,0],
  });

  const allocationPolicy = reactive<Record<string, { min: number; max: number; default: number; label: string }>>({
    publicEquity: { label: 'Public Equity', min: 50, max: 70, default: 50 },
    privateEquity: { label: 'Private Equity', min: 5, max: 25, default: 15 },
    publicFixedIncome: { label: 'Public Fixed Income', min: 5, max: 30, default: 18 },
    privateCredit: { label: 'Private Credit', min: 0, max: 10, default: 4 },
    realAssets: { label: 'Real Assets', min: 0, max: 20, default: 6 },
    diversifying: { label: 'Diversifying Strategies', min: 0, max: 20, default: 7 },
    cashShortTerm: { label: 'Cash/Short-Term', min: 0, max: 10, default: 0 },
  });

  const options = reactive<EngineOptions & { startYear?: number }>({
    seed: undefined,
    spendingPolicy: { type: 'simple', cpiLinked: false },
    rebalancing: { bandPct: 0, frequency: 'annual' },
    stress: { equityShocks: [], cpiShifts: [] },
    assets: { overrides: {}, limits: {} },
    corpus: { enabled: false, initialValue: 246900000 }, // Default to false, can be toggled in settings
    benchmark: { enabled: false, type: 'cpi_plus', value: 0.06, label: 'CPI + 6%' }, // Benchmark comparison settings
    years: 10,
    startYear: new Date().getFullYear(),
  });

  const results = ref<any>(null);
  const isLoading = ref(false);
  const errorMsg = ref<string | null>(null);
  // REFACTORED: Web Worker no longer needed - simulation now runs on backend

  function normalizeOptions(): EngineOptions {
    const sp = options.spendingPolicy ?? {} as any;
    const floorYoY = sp.floorYoY; const capYoY = sp.capYoY;
    const norm: EngineOptions = {
      seed: options.seed,
      years: typeof options.years === 'number' ? Math.max(1, Math.min(10, Math.floor(options.years))) : 10,
      rebalancing: { ...options.rebalancing },
      spendingPolicy: {
        type: sp.type,
        cpiLinked: sp.cpiLinked,
        floorYoY: typeof floorYoY === 'number' && !Number.isNaN(floorYoY) ? floorYoY / 100 : undefined,
        capYoY: typeof capYoY === 'number' && !Number.isNaN(capYoY) ? capYoY / 100 : undefined,
      },
      stress: {
        equityShocks: (options.stress?.equityShocks ?? []).filter((s:any) => typeof s.pct === 'number' && typeof s.year === 'number'),
        cpiShifts: (options.stress?.cpiShifts ?? []).filter((s:any) => typeof s.deltaPct === 'number' && typeof s.from === 'number' && typeof s.to === 'number'),
      },
      assets: { overrides: options.assets?.overrides ?? {} },
      corpus: { enabled: options.corpus?.enabled !== false, initialValue: options.corpus?.initialValue },
      benchmark: { ...options.benchmark },
    };
    return norm;
  }

  async function runSimulation() {
    const authStore = useAuthStore();
    
    console.log('runSimulation called');
    
    // Check if user can run simulation
    if (!authStore.canRunSimulation) {
      const limit = authStore.currentPlanLimits.simulations === -1 ? 'unlimited' : authStore.currentPlanLimits.simulations;
      errorMsg.value = `You have reached your simulation limit (${limit}). Please upgrade your plan to run more simulations.`;
      console.log('Simulation blocked by limit:', errorMsg.value);
      return;
    }

    console.log('Starting simulation...');
    errorMsg.value = null;
    isLoading.value = true;
    results.value = null; // Clear previous results
    
    const payload = JSON.parse(JSON.stringify(inputs));
    console.log('Simulation payload (inputs):', payload);
    if (Array.isArray(options.stress?.equityShocks)) {
      for (const sh of options.stress!.equityShocks!) {
        if (typeof sh.year === 'number') {
          if (sh.year < 1) (sh as any).year = 1;
          if (sh.year > 10) (sh as any).year = 10;
        }
      }
    }
    
    try {
      // REFACTORED: Call backend API instead of using Web Worker
      
      // Map frontend inputs to the 7-factor backend request parameters
      const simulationExecuteParams : Record<string, any> = {
        name: `Simulation ${new Date().toLocaleString()}`,
        years: Math.max(1, Math.min(100, options.years || 10)),
        startYear: Math.max(1900, Math.min(2100, options.startYear || new Date().getFullYear())),
        initialValue: Math.max(0, payload.initialEndowment || 50000000),
        spendingRate: Math.max(0, Math.min(1, (payload.spendingPolicyRate || 5) / 100)), // Convert % to decimal
        spendingGrowth: 0, // Default

        // -----------------------------------------------------
        // 7-FACTOR INPUTS FOR BACKEND ENGINE (Institutional Accuracy)
        assetAssumptions: ASSET_ASSUMPTIONS,
        portfolioWeights: payload.portfolioWeights,
        correlationMatrix: CORRELATION_MATRIX,
        // -----------------------------------------------------
        
        // DELETED: All the old 2-factor inputs (equityReturn, bondReturn, correlation, etc.)

        // 🛑 FIX 1: Removed redundant equityShock/cpiShift single fields to avoid type errors
        // equityShock: options.stress?.equityShocks?.length ? JSON.stringify(options.stress.equityShocks) : null,
        // cpiShift: options.stress?.cpiShifts?.length ? JSON.stringify(options.stress.cpiShifts) : null,
        
        grantTargets: payload.grantTargets?.length ? payload.grantTargets : null,
        
        // Default number of Monte Carlo paths to request from backend.
        // NOTE: the backend currently includes full simulation `paths` in the response
        // only when `numSimulations <= 500` to avoid extremely large payloads.
        // We request 5000 simulations by default for better percentile stability;
        // if you need the individual paths for inspection, set this to 500 or lower.
        numSimulations: 5000 // Can be made configurable
      };


      console.log('Executing simulation on backend with 7-factor params:', simulationExecuteParams);
      const backendResponse = await apiService.executeSimulation(simulationExecuteParams);
      console.log('Backend simulation response:', backendResponse);

      // REFACTORED: Backend now calculates all metrics, just map response to frontend format
      
      // Extract key data from backend response
      const backendSummary = backendResponse.summary || {};
      const finalValues = backendSummary.finalValues || {};
      const successMetrics = backendSummary.success || {};
      const initial = payload.initialEndowment;

      // Map backend response to format expected by frontend components
      // Derive additional series needed by UI when backend doesn't provide them
      const sims: number[][] = Array.isArray(backendResponse.paths) ? backendResponse.paths as number[][] : [];
      const derivedYears = options.years || (sims[0]?.length ? (sims[0].length - 1) : 10);
      const startYear = options.startYear && isFinite(options.startYear) ? options.startYear : new Date().getFullYear();
      // Normalize year labels: for Y years of simulation, we need Y labels (2025, 2026, ..., 2034 for Y=10)
      // This is the timeline during which spending occurs each year
      const Y_forLabels = Math.max(0, Number(derivedYears) || 0);
      const normalizedYearLabels = Array.from({ length: Y_forLabels }, (_, i) => String(startYear + i));      // Spending policy amounts per year (OpEx + Grants), assumed constant across sims, with optional growth
      const spendingRateDecimal = Math.max(0, Math.min(1, (payload.spendingPolicyRate ?? payload.spendingRate ?? 5) / 100));
      const spendingGrowth = 0; // keep simple unless provided by backend
      const opEx0 = Number(payload.initialOperatingExpense) || 0;
      const grants0 = Number(payload.initialGrant) || 0;
      const rfPct = Number(payload.riskFreeRate) || 2;
      const inflation = (isFinite(rfPct) ? rfPct : 2) / 100;

      const perYearOpEx = Array.from({ length: derivedYears }, (_, y) => opEx0 * Math.pow(1 + inflation, y));
      const perYearGrants = Array.from({ length: derivedYears }, (_, y) => grants0 * Math.pow(1 + inflation, y));
      const perYearSpending = Array.from({ length: derivedYears }, (_, y) => {
        // spending policy based on initial endowment rate plus org expenses; keep additive for clarity
        const policySpend = (initial * spendingRateDecimal) * Math.pow(1 + spendingGrowth, y);
        return policySpend + perYearOpEx[y] + perYearGrants[y];
      });

      // Build matrices for UI tables
      const operatingExpenses: number[][] = sims.length ? sims.map(() => perYearOpEx.slice()) : [];
      const grants: number[][] = sims.length ? sims.map(() => perYearGrants.slice()) : [];
      const spendingPolicyMatrix: number[][] = sims.length ? sims.map(() => perYearSpending.slice()) : [];

      // Investment expense as a percent of portfolio value (beginning of period)
      const invExpRate = Math.max(0, Math.min(1, (payload.investmentExpenseRate || 0) / 100));
      const investmentExpenses: number[][] = sims.length ? sims.map(path => {
        const Y = Math.max(0, path.length - 1);
        const series: number[] = [];
        for (let y = 0; y < Y; y++) {
          series.push((Number(path[y]) || 0) * invExpRate);
        }
        return series;
      }) : [];

      // Total organization expenses: Spending Policy (OpEx+Grants+policySpend) + Investment Expenses
      const totalSpendings: number[][] = sims.length ? sims.map((_, i) => {
        const Y = perYearSpending.length;
        const series: number[] = [];
        for (let y = 0; y < Y; y++) {
          series.push(perYearSpending[y] + (investmentExpenses[i]?.[y] ?? 0));
        }
        return series;
      }) : [];

      // Approximate portfolio returns excluding spending: r_t = (V_{t+1} + spend_t) / V_t - 1
      // 🛠️ FIX 2: Added explicit isFinite checks for robustness against bad path data
      const portfolioReturns: number[][] = sims.length ? sims.map(path => {
        const Y = Math.max(0, path.length - 1);
        const rets: number[] = [];
        for (let y = 0; y < Y; y++) {
          const v0 = Number(path[y]) || 0;
          const v1 = Number(path[y + 1]) || 0;
          const spend = perYearSpending[y] || 0;
          
          let r = 0;
          // Ensure v0 is a positive, finite number before dividing
          if (v0 > 0 && isFinite(v0) && isFinite(v1)) {
            r = ((v1 + spend) / v0) - 1;
          } 

          // Ensure the resulting return is also a finite number
          if (isFinite(r)) {
            rets.push(r);
          } else {
            rets.push(0); // Default to zero return if calculation failed
          }
        }
        return rets;
      }) : [];

      // 🔍 DEBUG LOGGING 
      console.log('--- Debug Data Check ---');
      console.log('Simulations (paths) received:', sims.length, sims[0]?.length);
      console.log('First Path Sample:', sims[0]?.slice(0, 3));
      console.log('Portfolio Returns generated:', portfolioReturns.length, portfolioReturns[0]?.length);
      console.log('Sample Return 1:', portfolioReturns[0]?.[0]);
      console.log('Sample Return Last:', portfolioReturns[0]?.[portfolioReturns[0].length - 1]);
      console.log('------------------------');
      // END DEBUG LOGGING

      const mappedResults = {
        // surface id for routing/share links
        id: backendResponse.id,
        simulationId: backendResponse.id,
        // Include backend's raw response for reference
        backendResponse: backendResponse,
        
        // Frontend-expected structure for existing components
        summary: {
          // Prefer backend-provided summary metrics verbatim when available
          medianFinalValue: (backendSummary.medianFinalValue != null ? backendSummary.medianFinalValue : 0),
          probabilityOfLoss: (backendSummary.probabilityOfLoss != null
            ? backendSummary.probabilityOfLoss
            : (successMetrics.count && successMetrics.total
                ? ((successMetrics.total - successMetrics.count) / successMetrics.total)
                : 0)),
          // Annualized Return - all percentiles
          medianAnnualizedReturn: backendSummary.medianAnnualizedReturn,
          annualizedReturn10: backendSummary.annualizedReturn10,
          annualizedReturn25: backendSummary.annualizedReturn25,
          annualizedReturn75: backendSummary.annualizedReturn75,
          annualizedReturn90: backendSummary.annualizedReturn90,
          // Annualized Volatility - all percentiles
          annualizedVolatility: backendSummary.annualizedVolatility,
          annualizedVolatility10: backendSummary.annualizedVolatility10,
          annualizedVolatility25: backendSummary.annualizedVolatility25,
          annualizedVolatility75: backendSummary.annualizedVolatility75,
          annualizedVolatility90: backendSummary.annualizedVolatility90,
          // Sharpe Ratio - all percentiles
          sharpeMedian: backendSummary.sharpeMedian,
          sharpe10: backendSummary.sharpe10,
          sharpe25: backendSummary.sharpe25,
          sharpe75: backendSummary.sharpe75,
          sharpe90: backendSummary.sharpe90,
          // Sortino Ratio - all percentiles
          sortino: backendSummary.sortino,
          sortino10: backendSummary.sortino10,
          sortino25: backendSummary.sortino25,
          sortino75: backendSummary.sortino75,
          sortino90: backendSummary.sortino90,
          // Other metrics
          medianMaxDrawdown: backendSummary.medianMaxDrawdown,
          cvar95: backendSummary.cvar95,
          inflationPreservationPct: backendSummary.inflationPreservationPct,
          // Final value percentiles; fallback to top-level (legacy) fields if present
          finalValues: {
            percentile10: (finalValues.percentile10 != null
              ? finalValues.percentile10
              : (backendResponse.percentile10 != null ? backendResponse.percentile10 : undefined)),
            percentile25: backendSummary.finalValues?.percentile25,
            percentile75: backendSummary.finalValues?.percentile75,
            percentile90: (finalValues.percentile90 != null
              ? finalValues.percentile90
              : (backendResponse.percentile90 != null ? backendResponse.percentile90 : undefined)),
          },
          success: backendSummary.success,
          successMetrics: successMetrics,
          riskFreeRate: (backendSummary.riskFreeRate != null ? backendSummary.riskFreeRate : (payload.riskFreeRate || 2)),
        },
        
        // Include inputs for components that need them
        inputs: {
          initialEndowment: initial,
          // payload uses spendingPolicyRate as a percentage already; do not remap from spendingRate
          spendingPolicyRate: Number(payload.spendingPolicyRate) || 5,
          riskFreeRate: payload.riskFreeRate || 2,
          investmentExpenseRate: Number(payload.investmentExpenseRate) || 0,
          initialOperatingExpense: Number(payload.initialOperatingExpense) || 0,
          initialGrant: Number(payload.initialGrant) || 0,
          portfolioWeights: { ...(payload.portfolioWeights || {}) },
          horizon: options.years || 10,
        },
        
        // Include simulation paths (from backend response)
        simulations: sims,
        
      // Include derived arrays for portfolio returns and spending policy + expenses
      portfolioReturns,
      spendingPolicy: backendResponse.spendingPolicy || backendResponse.spendingPaths || spendingPolicyMatrix, // Check both field names
      operatingExpenses,
      grants,
      investmentExpenses,
  totalSpendings,        // Include year labels for charts (normalized to Y+1 to match endowment value paths)
  yearLabels: normalizedYearLabels,
        
        // Include metadata
        metadata: backendResponse.metadata || {},
        pathsAvailable: backendResponse.pathsAvailable ?? (Array.isArray(sims) && sims.length > 0),
        timestamp: backendResponse.timestamp,
        computeTimeMs: backendResponse.computeTimeMs,
      };

      results.value = mappedResults;

      // Increment simulation usage after successful backend execution
      authStore.incrementSimulationUsage();

      // Return the mapped results
      return mappedResults;
      
    } catch (err: any) {
      console.error('Simulation failed', err);
      errorMsg.value = err?.message || String(err) || 'Simulation failed';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  function encodeScenario() {
    const state = { inputs, options } as any;
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

  async function loadScenario(scenarioId: string) {
    try {
      isLoading.value = true;
      errorMsg.value = null;
      
      const response = await apiService.getSimulation(scenarioId);
      const simulation = response; // The API returns the simulation directly, not wrapped
      
      if (!simulation) {
        throw new Error('Scenario not found');
      }
      
      // Update inputs with scenario data
      inputs.initialEndowment = Number(simulation.initialValue) || 50000000;
      inputs.riskFreeRate = Number(simulation.riskFreeRate) ?? inputs.riskFreeRate;
      inputs.spendingPolicyRate = Number(simulation.spendingRate) * 100 || 5; // Convert to percentage
      
      // Update options
      options.years = Number(simulation.years) || 10;
      options.startYear = Number(simulation.startYear) || new Date().getFullYear();
      
      // Note: Now loading 7 explicit weights from the new Portfolio model in the database
      if (simulation.portfolio) {
        inputs.portfolioWeights = {
          publicEquity: Number(simulation.portfolio.publicEquity) || 50,
          privateEquity: Number(simulation.portfolio.privateEquity) || 15,
          publicFixedIncome: Number(simulation.portfolio.publicFixedIncome) || 18,
          privateCredit: Number(simulation.portfolio.privateCredit) || 4,
          realAssets: Number(simulation.portfolio.realAssets) || 6,
          diversifying: Number(simulation.portfolio.diversifying) || 7,
          cashShortTerm: Number(simulation.portfolio.cashShortTerm) || 0,
        };
      }
      
      // Parse and load grant targets if available
      if (simulation.grantTargets) {
        try {
          const grantTargets = typeof simulation.grantTargets === 'string' 
            ? JSON.parse(simulation.grantTargets)
            : simulation.grantTargets;
          if (Array.isArray(grantTargets)) {
            inputs.grantTargets = grantTargets.map((target: any) => Number(target) || 0);
          }
        } catch (e) {
          console.warn('Failed to parse grant targets:', e);
        }
      }
      
      // Load existing results if available
      if (simulation.results) {
        try {
          const parsedResults = typeof simulation.results === 'string' 
            ? JSON.parse(simulation.results) 
            : simulation.results;
          results.value = parsedResults;
        } catch (e) {
          console.warn('Failed to parse simulation results:', e);
          results.value = null; // Clear results on parse error
        }
      } else {
        results.value = null; // Clear results if no existing results
      }
      
    } catch (err: any) {
      console.error('Failed to load scenario:', err);
      errorMsg.value = err?.message || 'Failed to load scenario';
      results.value = null; // Clear results on error
    } finally {
      isLoading.value = false;
    }
  }

  return { inputs, options, allocationPolicy, results, isLoading, errorMsg, normalizeOptions, runSimulation, copyShareLink, loadScenario };
});

// Resize grant targets when years changes to keep UI consistent
const store = (useSimulationStore as any) as () => ReturnType<typeof useSimulationStore>;
try {
  const s = store();
  watch(() => s.options.years, (nv: any, oldValue: any) => {
    // Don't trigger if value hasn't actually changed
    if (nv === oldValue) return;
    
    const y = Math.max(1, Math.min(10, Math.floor(Number(nv) || 10)));
    const cur = s.inputs.grantTargets.slice();
    
    // If the current length already matches target, nothing to do
    if (cur.length === y) return;

    // If we need more years, safely extend with zeros
    if (cur.length < y) {
      const newTargets = [...cur, ...Array(y - cur.length).fill(0)];
      s.inputs.grantTargets = newTargets as any;
      return;
    }

    // If the array is longer than requested, only truncate when the
    // extra entries are all zeros. This avoids clobbering manual
    // per-year overrides which could otherwise cause reactive update
    // loops between components (and heavy synchronous reassignments).
    const tail = cur.slice(y);
    const tailHasNonZero = tail.some(v => Number(v) !== 0);
    if (!tailHasNonZero) {
      s.inputs.grantTargets = cur.slice(0, y) as any;
    }
  }, { flush: 'post' }); // Run after DOM updates to avoid sync loops
} catch {}