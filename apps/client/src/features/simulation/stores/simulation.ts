import { defineStore } from 'pinia';
import { reactive, ref, watch } from 'vue';
import type { EngineOptions, SimulationOutputs } from '../lib/monteCarlo';
import { useAuthStore } from '../../auth/stores/auth';
import { apiService } from '@/shared/services/api';
import { perSimulationWorstCuts, summarizeWorstCuts } from '../utils/spendingCuts';
import { medoidByFinalValue, nearestToPointwiseMedian, pointwiseMedian } from '../utils/representativePath';

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
  let worker: Worker | null = null;

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
    console.log('canRunSimulation:', authStore.canRunSimulation);
    console.log('isAuthenticated:', authStore.isAuthenticated);
    
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
    console.log('Simulation payload:', payload);
    if (Array.isArray(options.stress?.equityShocks)) {
      for (const sh of options.stress!.equityShocks!) {
        if (typeof sh.year === 'number') {
          if (sh.year < 1) (sh as any).year = 1;
          if (sh.year > 10) (sh as any).year = 10;
        }
      }
    }
    
    let simulationId: string | null = null;
    
    try {
      // First, create the simulation record in the database
      if (authStore.isAuthenticated) {
        console.log('Creating simulation record in database...');
        const simulationData = {
          name: `Simulation ${new Date().toLocaleString()}`,
          years: Math.max(1, Math.min(30, options.years || 10)),
          startYear: Math.max(2000, Math.min(2100, options.startYear || new Date().getFullYear())),
          initialValue: Math.max(0, payload.initialEndowment || 0),
          riskFreeRate: payload.riskFreeRate ?? 2,
          spendingRate: Math.max(0, Math.min(1, (payload.spendingPolicyRate || 5) / 100)), // Convert percentage to decimal
          spendingGrowth: 0, // Default value
          equityReturn: 0.07, // Default assumption (7%)
          equityVolatility: Math.max(0, Math.min(1, 0.16)), // Default assumption (16%)
          bondReturn: 0.04, // Default assumption (4%)
          bondVolatility: Math.max(0, Math.min(1, 0.05)), // Default assumption (5%)
          correlation: Math.max(-1, Math.min(1, 0.1)), // Default assumption (10%)
          equityShock: options.stress?.equityShocks?.length ? JSON.stringify(options.stress.equityShocks) : null,
          cpiShift: options.stress?.cpiShifts?.length ? JSON.stringify(options.stress.cpiShifts) : null,
          grantTargets: payload.grantTargets?.length ? JSON.stringify(payload.grantTargets) : null,
          portfolio: {
            name: `Portfolio ${new Date().toLocaleString()}`,
            equityAllocation: Math.max(0, Math.min(100, (payload.portfolioWeights?.publicEquity || 0) + (payload.portfolioWeights?.privateEquity || 0))),
            bondAllocation: Math.max(0, Math.min(100, (payload.portfolioWeights?.publicFixedIncome || 0) + (payload.portfolioWeights?.privateCredit || 0))),
            alternativeAllocation: Math.max(0, Math.min(100, (payload.portfolioWeights?.realAssets || 0) + (payload.portfolioWeights?.diversifying || 0))),
            cashAllocation: Math.max(0, Math.min(100, payload.portfolioWeights?.cashShortTerm || 0)),
            description: 'Portfolio allocation from simulation'
          }
        };

        console.log('Simulation data to create:', simulationData);
        const createResponse = await apiService.createSimulation(simulationData);
        console.log('Created simulation response:', createResponse);
        simulationId = createResponse.simulation.id;
        console.log('Created simulation ID:', simulationId);
      }

      if (!worker) {
        worker = new Worker(new URL('../lib/simWorker.ts', import.meta.url), { type: 'module' });
      }
      const normOpts = normalizeOptions();
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

      const lastValues = (out.simulations as number[][]).map((sim: number[]) => sim[sim.length - 1]);
      const initial = payload.initialEndowment;
      const medianFinal = [...lastValues].sort((a:number,b:number)=>a-b)[Math.floor(lastValues.length/2)];
      const lossProb = lastValues.filter((v:number) => v < initial).length / lastValues.length;
      // Both Median Annualized Return and Annualized Return: median of per-simulation CAGRs (industry standard)
      const perSimGeo = (out.portfolioReturns ?? []).map((rets: number[]) => {
        if (!rets?.length) return NaN; let prod = 1; for (const r of rets) prod *= (1 + r); return Math.pow(prod, 1 / rets.length) - 1;
      }).filter((x: number) => isFinite(x));
      const sortedGeo = perSimGeo.sort((a: number,b: number)=>a-b);
      const medianAnnualizedReturn = sortedGeo.length ? sortedGeo[Math.floor(sortedGeo.length/2)] : 0;
      // Use the same calculation for both - median of CAGRs is the industry standard
      const annualizedReturn = medianAnnualizedReturn;

      // Compute per-simulation volatility (sample std), annualize, and take median
      const perSimVol = (out.portfolioReturns ?? []).map((rets: number[]) => {
        if (!rets?.length) return NaN;
        const n = rets.length;
        const mean = rets.reduce((s, v) => s + v, 0) / n;
        // sample variance (ddof = 1)
        const variance = n > 1 ? rets.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
        return Math.sqrt(variance);
      }).filter((v: number) => isFinite(v));
      // Assume monthly returns; adjust periodsPerYear if returns are at a different frequency
      const periodsPerYear = 12;
      const annualizedVols = perSimVol.map(v => v * Math.sqrt(periodsPerYear));
      const sortedVols = annualizedVols.sort((a: number, b: number) => a - b);
      const medianAnnualizedVol = sortedVols.length ? sortedVols[Math.floor(sortedVols.length / 2)] : 0;

      const eqCount = normOpts.stress?.equityShocks?.length ?? 0;
      const cpiCount = normOpts.stress?.cpiShifts?.length ?? 0;
      const stressApplied = eqCount + cpiCount > 0;
      const stressSummary = stressApplied ? `Equity shocks: ${eqCount}${cpiCount ? `, CPI shifts: ${cpiCount}` : ''}` : '';

      const yCount = (normOpts.years ?? 10);
      const baseYear = options.startYear && isFinite(options.startYear) ? Number(options.startYear) : undefined;
      // For projection charts, we need to show starting year + ending years
      // If 1 year projection starting 2025, show: [2025, 2026]
      // If 5 year projection starting 2025, show: [2025, 2026, 2027, 2028, 2029, 2030]
      const yearLabels = Array.from({ length: yCount + 1 }, (_, i) => 
        baseYear ? String(baseYear + i) : (i === 0 ? 'Start' : `Year ${i}`)
      );

      // Compute additional metrics for the summary (so charts render correctly after array cleanup)
      // Sharpe Ratio (50th percentile of per-simulation Sharpe ratios)
      const rfVal = inputs.riskFreeRate ?? 2;
      const rf = rfVal > 1 ? rfVal / 100 : rfVal;
      const sharpeValues = (out.portfolioReturns ?? []).map((r: number[]) => {
        if (!r?.length) return NaN;
        const mean = r.reduce((s, v) => s + v, 0) / r.length;
        const variance = r.reduce((s, v) => s + (v - mean) ** 2, 0) / r.length;
        const std = Math.sqrt(variance);
        return std > 0 ? (mean - rf) / std : NaN;
      }).filter(isFinite);
      const sharpeMedian = sharpeValues.length ? sharpeValues.sort((a, b) => a - b)[Math.floor(sharpeValues.length / 2)] : 0;

      // Maximum Drawdown (median across simulations)
      const maxDrawdowns = (out.simulations ?? []).map((sim: number[]) => {
        let maxVal = sim[0];
        let maxDD = 0;
        for (const val of sim) {
          if (val > maxVal) maxVal = val;
          const dd = (maxVal - val) / maxVal;
          if (dd > maxDD) maxDD = dd;
        }
        return maxDD;
      }).filter(isFinite);
      const medianMaxDrawdown = maxDrawdowns.length ? maxDrawdowns.sort((a, b) => a - b)[Math.floor(maxDrawdowns.length / 2)] : 0;

      // CVaR 95% (average of worst 5% outcomes)
      const sortedFinal = [...lastValues].filter(isFinite).sort((a, b) => a - b);
      const cvar95Index = Math.floor(sortedFinal.length * 0.05);
      const cvar95Value = sortedFinal.length > 0 ? sortedFinal.slice(0, Math.max(1, cvar95Index)).reduce((a, b) => a + b, 0) / Math.max(1, cvar95Index) : 0;

      // Sortino Ratio (median across simulations)
      const sortinoValues = (out.portfolioReturns ?? []).map((r: number[]) => {
        if (!r?.length) return NaN;
        const mean = r.reduce((s, v) => s + v, 0) / r.length;
        const downsideVariance = r.reduce((s, v) => s + Math.pow(Math.min(v - rf, 0), 2), 0) / r.length;
        const downsideStd = Math.sqrt(downsideVariance);
        return downsideStd > 0 ? (mean - rf) / downsideStd : NaN;
      }).filter(isFinite);
      const sortinoRatioMedian = sortinoValues.length ? sortinoValues.sort((a, b) => a - b)[Math.floor(sortinoValues.length / 2)] : 0;

      // Inflation-Adjusted Preservation (median final / (initial * inflation factor))
      const inflationFactor = Math.pow(1 + (rfVal > 1 ? rfVal / 100 : rfVal), yCount);
      const inflationPreservation = (medianFinal / (initial * inflationFactor)) * 100;

      // Final value percentiles
      const finalP10 = sortedFinal[Math.floor(sortedFinal.length * 0.1)];
      const finalP90 = sortedFinal[Math.floor(sortedFinal.length * 0.9)];

      // Tail Risk Metrics - percentiles of final values
      const finalP1 = sortedFinal[Math.floor(sortedFinal.length * 0.01)];
      const finalP5 = sortedFinal[Math.floor(sortedFinal.length * 0.05)];

      // Loss threshold probabilities (used by TailRisk component)
      const totalSims = sortedFinal.length;
      const lossThresholds = [
        {
          label: '5%+ Loss',
          threshold: initial * 0.95,
          probability: sortedFinal.filter(v => v < initial * 0.95).length / totalSims,
          count: sortedFinal.filter(v => v < initial * 0.95).length
        },
        {
          label: '10%+ Loss',
          threshold: initial * 0.90,
          probability: sortedFinal.filter(v => v < initial * 0.90).length / totalSims,
          count: sortedFinal.filter(v => v < initial * 0.90).length
        },
        {
          label: '15%+ Loss',
          threshold: initial * 0.85,
          probability: sortedFinal.filter(v => v < initial * 0.85).length / totalSims,
          count: sortedFinal.filter(v => v < initial * 0.85).length
        },
        {
          label: '20%+ Loss',
          threshold: initial * 0.80,
          probability: sortedFinal.filter(v => v < initial * 0.80).length / totalSims,
          count: sortedFinal.filter(v => v < initial * 0.80).length
        },
        {
          label: '30%+ Loss',
          threshold: initial * 0.70,
          probability: sortedFinal.filter(v => v < initial * 0.70).length / totalSims,
          count: sortedFinal.filter(v => v < initial * 0.70).length
        }
      ];

      // Average depletion magnitude and range
      const shortfalls = sortedFinal.filter(v => v < initial).map(v => initial - v);
      const averageDepletionMagnitude = shortfalls.length ? shortfalls.reduce((a, b) => a + b, 0) / shortfalls.length : 0;
      const sortedShortfalls = shortfalls.sort((a, b) => a - b);
      const depletionP25 = sortedShortfalls[Math.floor(sortedShortfalls.length * 0.25)];
      const depletionP75 = sortedShortfalls[Math.floor(sortedShortfalls.length * 0.75)];

      const simulationResults = {
        ...out,
        yearLabels,
        stress: { applied: stressApplied, summary: stressSummary, counts: { equity: eqCount, cpi: cpiCount } },
        summary: {
          medianFinalValue: medianFinal,
          probabilityOfLoss: lossProb,
          medianAnnualizedReturn: medianAnnualizedReturn * 100, // Median of per-simulation CAGRs
          annualizedReturn: annualizedReturn * 100, // Now also median of per-simulation CAGRs (industry standard)
          annualizedVolatility: medianAnnualizedVol * 100, // Annualized volatility as percentage
          riskFreeRate: inputs.riskFreeRate, // Risk-free rate used (in percent)
          sharpeMedian,
          medianMaxDrawdown,
          cvar95: cvar95Value,
          sortino: sortinoRatioMedian,
          inflationPreservation,
          finalP10,
          finalP90,
          // Tail risk metrics for TailRisk component
          worst1Pct: finalP1,
          worst5Pct: finalP5,
          worst10Pct: finalP10,
          lossThresholds,
          averageDepletionMagnitude,
          depletionMagnitudeRange: { p25: depletionP25, p75: depletionP75 },
        }
      };

      results.value = simulationResults;

      // Save the simulation results to the database
      if (authStore.isAuthenticated && simulationId) {
        console.log('Saving simulation results to database...');
        const worstCuts = perSimulationWorstCuts(out.simulations || [], out.spendingPolicy || []);
        const worstSummary = summarizeWorstCuts(worstCuts);
        const medoid = medoidByFinalValue(out.simulations || []);
        const nearMedian = nearestToPointwiseMedian(out.simulations || []);
        const pwMedian = pointwiseMedian(out.simulations || []);

        // To avoid blocking the main thread by serializing very large arrays
        // (the worker returns thousands of simulations and portfolio returns),
        // we persist a lightweight representation to the database here and
        // avoid sending the full `simulations` and `portfolioReturns` arrays
        // from the browser. This prevents UI stalls caused by JSON.stringify
        // and large object copies between worker <-> main thread.
        const resultsData = {
          // Send counts so the server knows full-size without requiring the full payload
          simulationsCount: Array.isArray(out.simulations) ? out.simulations.length : 0,
          portfolioReturnsCount: Array.isArray(out.portfolioReturns) ? out.portfolioReturns.length : 0,
          // Optionally include a very small sample (first 50 sims) to help quick previews
          simulationsSample: Array.isArray(out.simulations) ? out.simulations.slice(0, 50) : [],
          // Keep full summary/metadata and representative paths (small)
          spendingPolicy: out.spendingPolicy,
          inputs: {
            ...payload,
            riskFreeRate: payload.riskFreeRate,
            spendingPolicyRate: payload.spendingPolicyRate,
            investmentExpenseRate: payload.investmentExpenseRate,
            portfolioWeights: { ...payload.portfolioWeights },
          },
          summary: {
            ...simulationResults.summary,
            allocationPolicy: Object.fromEntries(Object.entries(allocationPolicy).map(([k, v]) => [k, { min: v.min, max: v.max, default: v.default }])) as any,
            worstCuts: worstCuts,
            worstCutsSummary: worstSummary,
            representative: {
              medoidIndex: medoid.index,
              medoidPath: medoid.path,
              nearestToMedianIndex: nearMedian.index,
              nearestToMedianPath: nearMedian.path,
              pointwiseMedian: pwMedian,
            }
          },
          stress: simulationResults.stress,
          yearLabels: simulationResults.yearLabels,
          // Mark that the browser trimmed full results so server/operator tooling
          // can decide whether to request full payload via a different channel.
          fullResultsTrimmed: true,
        };
        console.log('Results data to save (trimmed):', { ...resultsData, simulationsSampleLength: resultsData.simulationsSample.length });
        await apiService.saveSimulationResults(simulationId, resultsData);
        console.log('Successfully saved simulation results');
      }

      // Increment simulation usage after successful simulation
      authStore.incrementSimulationUsage();

      // Return the computed results WITH the simulation ID so callers can navigate correctly
      return {
        ...simulationResults,
        simulationId // Include the ID so the results object has it for navigation
      };
      
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
      
      // Note: Stress testing parameters (equityShock, cpiShift) from database
      // are stored as single values but the engine expects complex objects.
      // For now, we'll let users configure stress testing through the UI
      // if they want to modify these parameters.
      
      // Update portfolio allocation if available
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
// Note: placed outside defineStore to avoid capturing stale refs; but we need access to store.
// Consumers can rely on GrantTargets component too; this is an extra guard.
const store = (useSimulationStore as any) as () => ReturnType<typeof useSimulationStore>;
try {
  const s = store();
  watch(() => s.options.years, (nv: any) => {
    const y = Math.max(1, Math.min(10, Math.floor(Number(nv) || 10)));
    const cur = s.inputs.grantTargets.slice();
    // If the current length already matches target, nothing to do
    if (cur.length === y) return;

    // If we need more years, safely extend with zeros
    if (cur.length < y) {
      s.inputs.grantTargets = [...cur, ...Array(y - cur.length).fill(0)] as any;
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
  });
} catch {}
