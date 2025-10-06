// Monte Carlo engine adapted for Vue client (TypeScript)
// This is structured to mirror the vanilla script.js: asset classes, Cholesky, correlated normals,
// and outputs needed by the UI (paths, spending breakdowns, benchmarks, corpus).

export type Inputs = {
  initialEndowment: number;
  spendingPolicyRate: number; // percent
  investmentExpenseRate: number; // percent
  initialOperatingExpense: number;
  initialGrant: number;
  portfolioWeights: Record<string, number>; // percents per category
  grantTargets: number[]; // per year
};

export type SimulationOutputs = {
  simulations: number[][]; // [sim][year]
  operatingExpenses: number[][]; // [sim][year]
  grants: number[][]; // [sim][year]
  spendingPolicy: number[][]; // [sim][year]
  investmentExpenses: number[][]; // [sim][year]
  totalSpendings: number[][]; // [sim][year]
  benchmarks: number[][]; // [sim][year]
  corpusPaths: number[][]; // [sim][year]
  portfolioReturns: number[][]; // [sim][year] raw portfolio returns before cash flows
};

export type SpendingPolicyOptions = {
  type?: 'simple' | 'avgMV3' | 'avgMV5';
  floorYoY?: number; // as fraction, e.g., 0.02 for +2% floor on last year's spend
  capYoY?: number;   // as fraction, e.g., 0.10 for +10% cap on last year's spend
  cpiLinked?: boolean; // if true and floor/cap not set, use CPI as both floor and cap
};

export type RebalanceOptions = {
  bandPct?: number; // absolute deviation trigger, e.g., 5 for +/- 5%
  frequency?: 'annual' | 'never';
};

// Supported asset keys
export type AssetKey = 'publicEquity' | 'privateEquity' | 'publicFixedIncome' | 'privateCredit' | 'realAssets' | 'diversifying' | 'cashShortTerm';

export type EngineOptions = {
  simulations?: number;
  years?: number;
  seed?: number;
  spendingPolicy?: SpendingPolicyOptions;
  rebalancing?: RebalanceOptions;
  assets?: {
  overrides?: Partial<Record<AssetKey, { mean?: number; sd?: number }>>;
  // UI-only: per-asset limits for mean/vol in percent (engine ignores; clamping happens in UI)
  limits?: Partial<Record<AssetKey, { meanPctMin?: number; meanPctMax?: number; sdPctMin?: number; sdPctMax?: number }>>;
  };
  corpus?: {
    enabled?: boolean; // if false, don't compute corpusPaths
    initialValue?: number; // default stays 246,900,000 per vanilla
  };
  stress?: {
    // Legacy single-entry fields (kept for backward compat during share links)
    equityShockPct?: number;
    equityShockYear?: number;
    cpiShiftPct?: number;
    cpiShiftYears?: [number, number];
    // New multi-entry arrays
    equityShocks?: Array<{ pct: number; year: number; assetKey?: string }>; // year is 1-based
    cpiShifts?: Array<{ deltaPct: number; from: number; to: number }>; // inclusive 1-based
  }
};

// Constants
const NUM_SIMULATIONS = 5000; // fewer than vanilla for speed; adjust as needed
const NUM_YEARS = 10;
const CPI_MEAN = 0.025;
const CPI_STD = 0.005;

export const assetClasses = [
  { key: 'publicEquity', label: 'Public Equity', mean: 0.08, sd: 0.15 },
  { key: 'privateEquity', label: 'Private Equity', mean: 0.12, sd: 0.22 },
  { key: 'publicFixedIncome', label: 'Public Fixed Income', mean: 0.03, sd: 0.04 },
  { key: 'privateCredit', label: 'Private Credit', mean: 0.07, sd: 0.10 },
  { key: 'realAssets', label: 'Real Assets', mean: 0.05, sd: 0.09 },
  { key: 'diversifying', label: 'Diversifying Strategies', mean: 0.05, sd: 0.08 },
  { key: 'cashShortTerm', label: 'Cash/Short-Term', mean: 0.015, sd: 0.005 },
] as const;

// Correlation matrix from vanilla
const corr: number[][] = [
  [1.00, 0.75, 0.20, 0.25, 0.30, 0.25, 0.05],
  [0.75, 1.00, 0.15, 0.40, 0.35, 0.20, 0.05],
  [0.20, 0.15, 1.00, 0.30, 0.10, 0.10, 0.05],
  [0.25, 0.40, 0.30, 1.00, 0.15, 0.10, 0.05],
  [0.30, 0.35, 0.10, 0.15, 1.00, 0.20, 0.05],
  [0.25, 0.20, 0.10, 0.10, 0.20, 1.00, 0.05],
  [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 1.00],
];

function cholesky(A: number[][]): number[][] {
  const n = A.length;
  const L = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) L[i][j] = Math.sqrt(Math.max(A[i][i] - sum, 0));
      else L[i][j] = (1 / L[j][j]) * (A[i][j] - sum);
    }
  }
  return L;
}

// Seeded PRNG (Mulberry32)
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalRand(mean = 0, sd = 1, rng?: () => number): number {
  let u = 0, v = 0;
  const R = rng ?? Math.random;
  while (u === 0) u = R();
  while (v === 0) v = R();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * sd + mean;
}

// Generate correlated standard normals using Cholesky
function correlatedNormals(L: number[][], rng?: () => number): number[] {
  const n = L.length;
  const z = Array.from({ length: n }, () => normalRand(0, 1, rng));
  const x = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = 0; k <= i; k++) sum += L[i][k] * z[k];
    x[i] = sum; // already correlated
  }
  return x;
}
export function runMonteCarlo(inputs: Inputs, opts?: EngineOptions): SimulationOutputs {
  const simulations = opts?.simulations ?? NUM_SIMULATIONS;
  const years = opts?.years ?? NUM_YEARS;
  const L = cholesky(corr);
  const rng = typeof opts?.seed === 'number' ? mulberry32(opts!.seed!) : undefined;

  // Convert target weights from percent to fractions in the engine's order
  const targetW = assetClasses.map(a => (inputs.portfolioWeights[a.key] ?? 0) / 100);

  // Apply per-asset overrides if provided
  const means = assetClasses.map(a => {
    const ov = opts?.assets?.overrides?.[a.key as AssetKey];
    return typeof ov?.mean === 'number' ? ov.mean : a.mean;
  });
  const sds = assetClasses.map(a => {
    const ov = opts?.assets?.overrides?.[a.key as AssetKey];
    return typeof ov?.sd === 'number' ? ov.sd : a.sd;
  });

  const sims: number[][] = Array.from({ length: simulations }, () => []);
  const opEx: number[][] = Array.from({ length: simulations }, () => []);
  const grants: number[][] = Array.from({ length: simulations }, () => []);
  const spendPolicy: number[][] = Array.from({ length: simulations }, () => []);
  const invExp: number[][] = Array.from({ length: simulations }, () => []);
  const totalSpend: number[][] = Array.from({ length: simulations }, () => []);
  const bench: number[][] = Array.from({ length: simulations }, () => []);
  const corpus: number[][] = Array.from({ length: simulations }, () => []);
  const portRets: number[][] = Array.from({ length: simulations }, () => []);

  const policy = opts?.spendingPolicy ?? { type: 'simple' };
  const reb = opts?.rebalancing ?? { bandPct: 0, frequency: 'annual' };

  // Normalize stress options (support legacy and new array-based)
  const stress = opts?.stress;
  const eqShocks: Array<{ pct: number; year: number; assetKey?: string }> = [];
  if (stress?.equityShocks?.length) {
    for (const sh of stress.equityShocks) {
      if (typeof sh?.pct === 'number' && typeof sh?.year === 'number') eqShocks.push(sh);
    }
  }
  if (typeof stress?.equityShockPct === 'number' && typeof stress?.equityShockYear === 'number') {
    eqShocks.push({ pct: stress.equityShockPct, year: stress.equityShockYear });
  }
  const cpiShifts: Array<{ deltaPct: number; from: number; to: number }> = [];
  if (stress?.cpiShifts?.length) {
    for (const cs of stress.cpiShifts) {
      if (typeof cs?.deltaPct === 'number' && typeof cs?.from === 'number' && typeof cs?.to === 'number') cpiShifts.push(cs);
    }
  }
  if (typeof stress?.cpiShiftPct === 'number' && Array.isArray(stress?.cpiShiftYears) && stress!.cpiShiftYears!.length === 2) {
    const [from, to] = stress!.cpiShiftYears!;
    cpiShifts.push({ deltaPct: stress.cpiShiftPct, from, to });
  }

  for (let s = 0; s < simulations; s++) {
    // Sleeve values by asset class
    let sleeves = targetW.map(w => w * inputs.initialEndowment);
    let lastEndValue = inputs.initialEndowment;
    const endValueHistory: number[] = [];
    let lastSpend = 0;
  let benchmark = inputs.initialEndowment;
  const corpusEnabled = opts?.corpus?.enabled !== false; // default true
  let corpusVal = opts?.corpus?.initialValue ?? 246900000; // per vanilla comment

    for (let y = 0; y < years; y++) {
  // CPI random draw (bounded floor) with optional stress shift
      let cpiMean = CPI_MEAN;
      if (cpiShifts.length) {
        let delta = 0;
        for (const cs of cpiShifts) {
          if ((y + 1) >= cs.from && (y + 1) <= cs.to) delta += (cs.deltaPct / 100);
        }
        cpiMean += delta;
      }
  const cpi = Math.max(-0.02, normalRand(cpiMean, CPI_STD, rng));

  // Correlated asset returns draw (base, pre-shock)
  const z = correlatedNormals(L, rng);
  const baseReturns = z.map((zi, i) => means[i] + zi * sds[i]);
  // Beginning-of-year portfolio value
  const beginVal = sleeves.reduce((a,b)=>a+b,0);

      // Spending policy base: current value or trailing average of end values
      let base = beginVal;
      if (policy.type === 'avgMV3' || policy.type === 'avgMV5') {
        const n = policy.type === 'avgMV3' ? 3 : 5;
        const slice = endValueHistory.slice(-n);
        if (slice.length) base = slice.reduce((a,b)=>a+b,0) / slice.length;
      }
      let spendingPolicyAmt = (inputs.spendingPolicyRate / 100) * base;
      // Optional CPI-linked floor/cap or explicit yoy bounds
      const floorYoY = policy.cpiLinked && policy.floorYoY == null ? cpi : (policy.floorYoY ?? -Infinity);
      const capYoY = policy.cpiLinked && policy.capYoY == null ? cpi : (policy.capYoY ?? Infinity);
      if (isFinite(floorYoY) || isFinite(capYoY)) {
        const minAllowed = isFinite(floorYoY) ? lastSpend * (1 + floorYoY) : -Infinity;
        const maxAllowed = isFinite(capYoY) ? lastSpend * (1 + capYoY) : Infinity;
        spendingPolicyAmt = Math.min(Math.max(spendingPolicyAmt, minAllowed), maxAllowed);
      }

      const investmentExpenseAmt = (inputs.investmentExpenseRate / 100) * beginVal;
      const operatingExpenseAmt = (y === 0 ? inputs.initialOperatingExpense : opEx[s][y - 1] * (1 + cpi));
      const targetGrant = inputs.grantTargets?.[y] ?? 0; // target total grants for the year
      const initialGrantYr1 = y === 0 ? inputs.initialGrant : 0;
      const grantsTopUp = Math.max(targetGrant - (spendingPolicyAmt + initialGrantYr1), 0);
      const totalOut = spendingPolicyAmt + investmentExpenseAmt + operatingExpenseAmt + initialGrantYr1 + grantsTopUp;

      // Remove outflows proportionally from sleeves
      const totalBeforeOut = beginVal;
      const ratio = totalBeforeOut > 0 ? (totalOut / totalBeforeOut) : 0;
      if (ratio > 0) {
        sleeves = sleeves.map(v => Math.max(0, v * (1 - ratio)));
      }

      // Rebalance after outflows if frequency annual or band exceeded
      const band = (reb.bandPct ?? 0) / 100;
      const needRebal = reb.frequency === 'annual' || (band > 0 && sleeves.some((v, i) => {
        const w = (sleeves.reduce((a,b)=>a+b,0) || 1) ? v / sleeves.reduce((a,b)=>a+b,0) : 0;
        return Math.abs(w - targetW[i]) > band;
      }));
      if (needRebal) {
        const total = sleeves.reduce((a,b)=>a+b,0);
        sleeves = targetW.map(w => w * total);
      }
      // Pre-return weights (post-outflow/rebalance)
      const preReturnTotal = sleeves.reduce((a,b)=>a+b,0) || 1;
      const retW = sleeves.map(v => v / preReturnTotal);
      // Build adjusted returns with shocks for this year
      const adjReturns = baseReturns.slice();
      if (eqShocks.length) {
        for (const sh of eqShocks) {
          if ((y + 1) === sh.year) {
            const idx = sh.assetKey ? assetClasses.findIndex(a => a.key === sh.assetKey) : 0;
            if (idx >= 0) {
              adjReturns[idx] = (adjReturns[idx] + 1) * (1 + sh.pct / 100) - 1;
            }
          }
        }
      }
      // Effective portfolio return for the year
      const portfolioReturnEffective = adjReturns.reduce((acc, r, i) => acc + r * retW[i], 0);
      // Apply adjusted returns to sleeves
      sleeves = sleeves.map((v, i) => v * (1 + adjReturns[i]));
      const endVal = sleeves.reduce((a,b)=>a+b,0);

      // Benchmark and corpus paths
      benchmark = benchmark * (1 + (cpi + 0.06));
      if (corpusEnabled) {
        corpusVal = corpusVal * (1 + cpi);
      }

      // Store
      sims[s].push(endVal);
      bench[s].push(benchmark);
  corpus[s].push(corpusEnabled ? corpusVal : NaN);
      opEx[s].push(operatingExpenseAmt);
      spendPolicy[s].push(spendingPolicyAmt);
      invExp[s].push(investmentExpenseAmt);
      grants[s].push(initialGrantYr1 + grantsTopUp);
      totalSpend[s].push(totalOut);
  portRets[s].push(portfolioReturnEffective);

      // update trackers
      endValueHistory.push(endVal);
      lastEndValue = endVal;
      lastSpend = spendingPolicyAmt;
    }
  }

  return {
    simulations: sims,
    operatingExpenses: opEx,
    grants,
    spendingPolicy: spendPolicy,
    investmentExpenses: invExp,
    totalSpendings: totalSpend,
    benchmarks: bench,
    corpusPaths: corpus,
    portfolioReturns: portRets,
  };
}

// Helpers for UI
export function percentile(values: number[], p: number): number {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

export function formatMoney(num: number, digits = 0): string {
  if (!isFinite(num)) return '-';
  const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(digits)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(digits)}K`;
  return `$${nf.format(num)}`;
}
