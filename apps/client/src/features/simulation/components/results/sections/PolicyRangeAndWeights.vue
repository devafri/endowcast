

      <template>
<section class="grid grid-cols-1 xl:grid-cols-2 gap-6 ">
        <!-- Allocation vs Policy -->
        <div class="rounded-lg border border-slate-200 p-4 bg-white shadow-md">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Policy Ranges & Current Weights (Inputs)</h3>
            <div class="text-xs text-slate-500">Sum: <span class="font-medium" :class="{'text-emerald-600': Math.abs(weightsSum-100) < 1e-8, 'text-red-600': Math.abs(weightsSum-100) >= 1e-8}">{{ weightsSum }}</span></div>
          </div>
          <div class="space-y-3">
            <div v-for="a in allocations" :key="a.key" class="space-y-1">
              <div class="flex justify-between text-sm">
                <span class="font-medium">{{ a.label }}</span>
                <span class="text-slate-500">{{ a.pct }}% ({{ a.min }}–{{ a.max }}%)</span>
              </div>
              <div class="relative h-3 rounded bg-slate-100 overflow-hidden">
                <div class="absolute inset-y-0 bg-slate-300" :style="{ left: a.min + '%', width: (a.max - a.min) + '%' }"></div>
                <div class="absolute inset-y-0 bg-blue-600" :style="{ left: a.pct + '%', width: '2px' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Risk Contributions -->
        <div class="rounded-lg border border-slate-200 p-4 bg-white shadow-md">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">Risk Contributions (approximate)</h3>
            <span class="text-xs text-slate-500">Sum = 100%</span>
          </div>
          <div class="space-y-2">
            <div v-for="r in riskContribs" :key="r.key" class="space-y-1">
              <div class="flex justify-between text-sm">
                <span class="font-medium">{{ r.label }}</span>
                <span class="tabnums">{{ r.contribPct.toFixed(1) }}%</span>
              </div>
              <div class="h-2 bg-slate-100 rounded overflow-hidden">
                <div class="h-full bg-teal-500" :style="{ width: Math.max(0, Math.min(100, r.contribPct)) + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="mt-3 text-sm text-slate-500">Median Max Drawdown: <span class="font-medium tabnums">{{ medianMDD.toFixed ? medianMDD.toFixed(1) + '%' : '—' }}</span></div>
        </div>
      </section>
     
      </template>
  <script setup lang="ts">
  import { computed } from 'vue';
  import { assetClasses } from '@/features/simulation/lib/monteCarlo';
  import { percentilesForYears, medianMaxDrawdown, medianFinalValue } from '@/features/simulation/lib/analytics';
  import { useSimulationStore } from '@/features/simulation/stores/simulation';

  const props = defineProps<{ results: any }>();

  const sims = computed<number[][]>(() => props.results?.simulations ?? []);
  const portfolioReturns = computed<number[][]>(() => props.results?.portfolioReturns ?? []);
  const inputs = computed(() => props.results?.inputs ?? {});
  const policyInputs = computed(() => inputs.value.portfolioWeights ?? {});

  // allocation entries derived from assetClasses + inputs.portfolioWeights
  const simStore = useSimulationStore();
  const allocations = computed(() => {
    const storePolicy = simStore?.allocationPolicy ?? {} as Record<string, any>;
    const resultPolicy = props.results?.summary?.allocationPolicy ?? {};
    return assetClasses.map(a => {
      const pct = (policyInputs.value[a.key as any] ?? 0);
      const policyFromStore = storePolicy[a.key];
      const policyFromResult = resultPolicy[a.key];
      const policy = policyFromStore ?? policyFromResult ?? { min: 0, max: 100, default: pct };
      return {
        key: a.key,
        label: a.label,
        pct,
        min: policy.min ?? 0,
        max: policy.max ?? 100,
        def: policy.default ?? pct,
        mean: a.mean,
        sd: a.sd,
      };
    });
  });

  const weightsSum = computed(() => allocations.value.reduce((s, a) => s + (a.pct ?? 0), 0));

  // Basic covariance matrix from engine defaults (use asset sd and defaultCorrelationMatrix via monteCarlo engine import if needed)
  // For now approximate risk contributions using portfolioReturns sample covariance when available
  function colSampleCov(matrix: number[][]) {
    // matrix: [sim][periods] -> compute per-asset sample cov across sims if portfolioReturns not present
    return null;
  }

  // Risk contribution calculation using sample cov of asset returns is not available here unless we simulate per-asset returns.
  // As a reasonable fallback, compute risk contributions from portfolioReturns per simulation using per-sim standard deviation contribution
  const riskContribs = computed(() => {
    // If results provides per-asset exposures or cov, prefer that; otherwise approximate by using per-asset weights & asset sds
    const w = allocations.value.map(a => (a.pct ?? 0) / 100);
    // approximate covariance using product of sds and default correlations (not imported here) -> use diagonal only if missing
    const sds = allocations.value.map(a => a.sd ?? 0);
    // compute marginal contributions assuming zero correlation (conservative)
    const marginal = w.map((wi, i) => wi * (sds[i] ?? 0));
    const total = marginal.reduce((a, b) => a + Math.abs(b), 0) || 1;
    return allocations.value.map((a, i) => ({ key: a.key, label: a.label, pct: a.pct, contribPct: (Math.abs(marginal[i]) / total) * 100 }));
  });

  // Percentile bands for endowment over time
  const percentilesByYear = computed(() => {
    if (!sims.value.length) return {} as Record<number, number[]>;
    return percentilesForYears(sims.value, [10,25,50,75,90]);
  });

  const medianFinal = computed(() => {
    if (!sims.value.length) return NaN;
    return medianFinalValue(sims.value as number[][]);
  });

  const medianMDD = computed(() => {
    if (!sims.value.length) return NaN;
    return medianMaxDrawdown(sims.value as number[][]) * 100;
  });

  const tailMetrics = computed(() => props.results?.summary?.tailRiskMetrics ?? props.results?.analytics?.tailRiskMetrics ?? null);

  function fmtUsd(n: number | null | undefined) {
    if (n == null || !isFinite(n)) return '—';
    if (Math.abs(n) >= 1_000_000_000) return `$${(n/1_000_000_000).toFixed(1)}B`;
    if (Math.abs(n) >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n/1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }

  function pctStr(p: number | null | undefined, dp = 1) { return p == null || !isFinite(p) ? '—' : `${p.toFixed(dp)}%`; }

  // Grants / opex median series if present
  const medGrants = computed(() => {
    const g = props.results?.grants as number[][] | undefined;
    if (!g?.length) return [] as number[];
    const years = g[0].length;
    const out: number[] = [];
    for (let t = 0; t < years; t++) {
      const vals = g.map(s => s[t]).sort((a,b)=>a-b);
      out.push(vals[Math.floor(vals.length/2)]);
    }
    return out;
  });

  const medOpex = computed(() => {
    const g = props.results?.operatingExpenses as number[][] | undefined;
    if (!g?.length) return [] as number[];
    const years = g[0].length;
    const out: number[] = [];
    for (let t = 0; t < years; t++) {
      const vals = g.map(s => s[t]).sort((a,b)=>a-b);
      out.push(vals[Math.floor(vals.length/2)]);
    }
    return out;
  });

  // Table rows by percentiles
  const percentileRows = computed(() => {
    const stats = sims.value.length ? sims.value.map((p: number[], i: number) => {
      const final = p[p.length - 1];
      const avgG = (props.results?.grants?.[i]?.reduce((a:number,b:number)=>a+b,0) ?? 0) / (props.results?.grants?.[i]?.length ?? 1);
      const avgO = (props.results?.operatingExpenses?.[i]?.reduce((a:number,b:number)=>a+b,0) ?? 0) / (props.results?.operatingExpenses?.[i]?.length ?? 1);
      return { final, avgG, avgO, avgTotal: avgG + avgO };
    }).sort((a: any,b: any)=>a.final - b.final) : [];
    const pctTargets = [10,25,50,75,90];
    return pctTargets.map(pct => {
      if (!stats.length) return { pct, avgG: NaN, avgO: NaN, avgTotal: NaN, final: NaN };
      const idx = Math.floor((pct/100)*(stats.length-1));
      return { pct, ...stats[idx] };
    });
  });

  // expose to template
  defineExpose({ allocations, weightsSum, riskContribs, percentilesByYear, medGrants, medOpex, percentileRows, medianFinal, medianMDD, tailMetrics, fmtUsd, pctStr });
  </script>