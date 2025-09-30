import { defineStore } from 'pinia';
import { reactive, ref, watch } from 'vue';
import type { EngineOptions, SimulationOutputs } from '../lib/monteCarlo';
import { useAuthStore } from '../../auth/stores/auth';
import { apiService } from '@/shared/services/api';

export const useSimulationStore = defineStore('simulation', () => {
  const inputs = reactive({
    initialEndowment: 50000000,
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
    corpus: { enabled: true, initialValue: 246900000 },
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
    };
    return norm;
  }

  async function runSimulation() {
    const authStore = useAuthStore();
    
    // Check if user can run simulation
    if (!authStore.canRunSimulation) {
      const limit = authStore.currentPlanLimits.simulations === -1 ? 'unlimited' : authStore.currentPlanLimits.simulations;
      errorMsg.value = `You have reached your simulation limit (${limit}). Please upgrade your plan to run more simulations.`;
      return;
    }

    errorMsg.value = null;
    isLoading.value = true;
    const payload = JSON.parse(JSON.stringify(inputs));
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
      const perSimGeo = (out.portfolioReturns ?? []).map((rets: number[]) => {
        if (!rets?.length) return NaN; let prod = 1; for (const r of rets) prod *= (1 + r); return Math.pow(prod, 1 / rets.length) - 1;
      }).filter((x: number) => isFinite(x));
      const sortedGeo = perSimGeo.sort((a: number,b: number)=>a-b);
      const medianCagr = sortedGeo.length ? sortedGeo[Math.floor(sortedGeo.length/2)] : 0;
      const eqCount = normOpts.stress?.equityShocks?.length ?? 0;
      const cpiCount = normOpts.stress?.cpiShifts?.length ?? 0;
      const stressApplied = eqCount + cpiCount > 0;
      const stressSummary = stressApplied ? `Equity shocks: ${eqCount}${cpiCount ? `, CPI shifts: ${cpiCount}` : ''}` : '';

      const yCount = (normOpts.years ?? 10);
      const baseYear = options.startYear && isFinite(options.startYear) ? Number(options.startYear) : undefined;
      const yearLabels = Array.from({ length: yCount }, (_, i) => baseYear ? String(baseYear + i) : `Year ${i+1}`);

      const simulationResults = {
        ...out,
        yearLabels,
        stress: { applied: stressApplied, summary: stressSummary, counts: { equity: eqCount, cpi: cpiCount } },
        summary: {
          medianFinalValue: medianFinal,
          probabilityOfLoss: lossProb,
          annualizedReturn: medianCagr * 100,
        }
      };

      results.value = simulationResults;

      // Save the simulation results to the database
      if (authStore.isAuthenticated && simulationId) {
        console.log('Saving simulation results to database...');
        const resultsData = {
          simulations: out.simulations,
          portfolioReturns: out.portfolioReturns,
          spendingPolicy: out.spendingPolicy,
          summary: simulationResults.summary,
          stress: simulationResults.stress,
          yearLabels: simulationResults.yearLabels
        };
        console.log('Results data to save:', resultsData);
        await apiService.saveSimulationResults(simulationId, resultsData);
        console.log('Successfully saved simulation results');
      }

      // Increment simulation usage after successful simulation
      authStore.incrementSimulationUsage();
      
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

  return { inputs, options, allocationPolicy, results, isLoading, errorMsg, normalizeOptions, runSimulation, copyShareLink };
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
    if (cur.length === y) return;
    if (cur.length < y) {
      s.inputs.grantTargets = [...cur, ...Array(y - cur.length).fill(0)] as any;
    } else {
      s.inputs.grantTargets = cur.slice(0, y) as any;
    }
  });
} catch {}
