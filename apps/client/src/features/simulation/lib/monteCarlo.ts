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
  startYear?: number;
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
  benchmark?: {
    enabled?: boolean; // if false, don't compute benchmark paths
    type?: 'cpi_plus' | 'fixed' | 'asset_class' | 'blended'; // benchmark type
    value?: number; // for 'cpi_plus': additional return (e.g. 0.06 for CPI+6%), for 'fixed': annual return
    assetKey?: AssetKey; // for 'asset_class': which asset class to track
    blended?: Partial<Record<AssetKey, number>>; // for 'blended': asset weights (should sum to 100)
    label?: string; // custom label for charts
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
  };
  correlationMatrix?: number[][];
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
export const defaultCorrelationMatrix: number[][] = [
  [1.00, 0.75, 0.20, 0.25, 0.30, 0.25, 0.05],
  [0.75, 1.00, 0.15, 0.40, 0.35, 0.20, 0.05],
  [0.20, 0.15, 1.00, 0.30, 0.10, 0.10, 0.05],
  [0.25, 0.40, 0.30, 1.00, 0.15, 0.10, 0.05],
  [0.30, 0.35, 0.10, 0.15, 1.00, 0.20, 0.05],
  [0.25, 0.20, 0.10, 0.10, 0.20, 1.00, 0.05],
  [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 1.00],
];

// Keep the original for internal use
const corr: number[][] = defaultCorrelationMatrix;

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
  const correlationMatrix = opts?.correlationMatrix ?? corr;
  const L = cholesky(correlationMatrix);
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
      
      // Calculate grants the same way as vanilla JavaScript
      let policyGrantAmount;
      if (y === 0) {
        policyGrantAmount = inputs.initialGrant;
      } else {
        // Total distributable from spending policy
        const totalDistributable = spendingPolicyAmt;
        // Grants = distributable amount minus operating expenses (ensure not negative)
        policyGrantAmount = Math.max(0, totalDistributable - operatingExpenseAmt);
      }
      
      // Handle grant targets if specified
      const targetGrant = inputs.grantTargets?.[y] ?? 0;
      const grantsTopUp = Math.max(0, targetGrant - policyGrantAmount);
      const totalGrants = policyGrantAmount + grantsTopUp;
      
      // Spending Policy Expense = Operating Expenses + Total Grants (allowed under spending policy)
      const spendingPolicyExpense = operatingExpenseAmt + totalGrants;
      
      // Total Spend = Spending Policy Expense + Investment Expense
      const totalSpendingAmount = spendingPolicyExpense + investmentExpenseAmt;
      
      // Total outflows from endowment (for end-of-year calculation)
      // Only spending policy amount + investment expenses should leave the endowment
      // (operatingExpenseAmt + totalGrants) should equal spendingPolicyAmt, so don't double count
      const totalOut = spendingPolicyAmt + investmentExpenseAmt;

      // First apply returns to full beginning-of-year value
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
      
      // Apply returns to sleeves
      sleeves = sleeves.map((v, i) => v * (1 + adjReturns[i]));
      
      // Calculate effective portfolio return for the year
      const totalBeforeOut = beginVal;
      const preReturnTotal = totalBeforeOut || 1;
      const retW = sleeves.map((v, i) => targetW[i]); // use target weights for return calculation
      const portfolioReturnEffective = adjReturns.reduce((acc, r, i) => acc + r * retW[i], 0);

      // Now remove outflows proportionally from post-return sleeves
      const totalAfterReturns = sleeves.reduce((a,b)=>a+b,0);
      const ratio = totalAfterReturns > 0 ? (totalOut / totalAfterReturns) : 0;
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
      
      const endVal = sleeves.reduce((a,b)=>a+b,0);

      // Benchmark and corpus paths
      // Calculate benchmark return based on configuration
      let benchmarkReturn = 0;
      const benchmarkConfig = opts?.benchmark;
      if (benchmarkConfig?.enabled !== false) { // default enabled
        switch (benchmarkConfig?.type || 'cpi_plus') {
          case 'cpi_plus':
            benchmarkReturn = cpi + (benchmarkConfig?.value ?? 0.06); // default CPI + 6%
            break;
          case 'fixed':
            benchmarkReturn = benchmarkConfig?.value ?? 0.06; // default 6% fixed
            break;
          case 'asset_class':
            const assetIndex = benchmarkConfig?.assetKey ? assetClasses.findIndex(a => a.key === benchmarkConfig.assetKey) : 0;
            if (assetIndex >= 0) {
              benchmarkReturn = adjReturns[assetIndex];
            } else {
              benchmarkReturn = cpi + 0.06; // fallback
            }
            break;
          case 'blended':
            if (benchmarkConfig?.blended) {
              benchmarkReturn = 0;
              let totalWeight = 0;
              Object.entries(benchmarkConfig.blended).forEach(([key, weight]) => {
                const assetIndex = assetClasses.findIndex(a => a.key === key);
                if (assetIndex >= 0 && weight) {
                  benchmarkReturn += adjReturns[assetIndex] * (weight / 100);
                  totalWeight += weight;
                }
              });
              // If weights don't sum to 100, normalize
              if (totalWeight > 0 && totalWeight !== 100) {
                benchmarkReturn = benchmarkReturn * (100 / totalWeight);
              }
            } else {
              benchmarkReturn = cpi + 0.06; // fallback
            }
            break;
          default:
            benchmarkReturn = cpi + 0.06; // default fallback
        }
      }
      
      // Apply returns to benchmark, then subtract same outflows as endowment for fair comparison
      benchmark = benchmark * (1 + benchmarkReturn);
      
      // Subtract spending policy and investment expenses from benchmark for fair comparison
      const benchmarkSpendingPolicyAmt = (inputs.spendingPolicyRate / 100) * benchmark;
      const benchmarkInvestmentExpenseAmt = (inputs.investmentExpenseRate / 100) * benchmark;
      const benchmarkTotalOut = benchmarkSpendingPolicyAmt + benchmarkInvestmentExpenseAmt;
      benchmark = Math.max(0, benchmark - benchmarkTotalOut);
      
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
      grants[s].push(totalGrants);
      totalSpend[s].push(totalSpendingAmount);
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

// Enhanced Risk Analytics
export interface RiskMetrics {
  cvar95: number;          // Conditional Value at Risk (95% confidence)
  cvar99: number;          // Conditional Value at Risk (99% confidence)
  maxDrawdown: number;     // Maximum peak-to-trough decline
  principalLossProb: number; // Probability of losing principal
  sustainabilityHorizon: number; // Expected year of fund depletion
  tailRiskMetrics: {
    worst1Pct: number;     // Worst 1% outcome
    worst5Pct: number;     // Worst 5% outcome
    worst10Pct: number;    // Worst 10% outcome
  };
  drawdownAnalysis: {
    avgDrawdown: number;
    drawdownRecoveryTime: number;
    maxDrawdownYear: number;
  };
}

export function calculateRiskMetrics(simulations: number[][], initialValue: number): RiskMetrics {
  const years = simulations[0]?.length ?? 10;
  const finalValues = simulations.map(sim => sim[years - 1]);
  
  // Calculate CVaR (Expected Shortfall)
  const cvar95 = calculateCVaR(finalValues, 0.05);
  const cvar99 = calculateCVaR(finalValues, 0.01);
  
  // Calculate maximum drawdown across all simulations
  const { maxDrawdown, avgDrawdown, drawdownRecoveryTime, maxDrawdownYear } = calculateDrawdownMetrics(simulations, initialValue);
  
  // Principal loss probability
  const principalLossProb = finalValues.filter(v => v < initialValue).length / finalValues.length;
  
  // Sustainability horizon (when fund drops below 50% of initial value)
  const sustainabilityHorizon = calculateSustainabilityHorizon(simulations, initialValue * 0.5);
  
  // Tail risk metrics
  const sortedFinalValues = [...finalValues].sort((a, b) => a - b);
  const worst1Pct = sortedFinalValues[Math.floor(sortedFinalValues.length * 0.01)] ?? 0;
  const worst5Pct = sortedFinalValues[Math.floor(sortedFinalValues.length * 0.05)] ?? 0;
  const worst10Pct = sortedFinalValues[Math.floor(sortedFinalValues.length * 0.10)] ?? 0;
  
  return {
    cvar95,
    cvar99,
    maxDrawdown,
    principalLossProb,
    sustainabilityHorizon,
    tailRiskMetrics: {
      worst1Pct,
      worst5Pct,
      worst10Pct
    },
    drawdownAnalysis: {
      avgDrawdown,
      drawdownRecoveryTime,
      maxDrawdownYear
    }
  };
}

function calculateCVaR(values: number[], alpha: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const cutoff = Math.floor(sorted.length * alpha);
  const tail = sorted.slice(0, cutoff);
  return tail.length > 0 ? tail.reduce((a, b) => a + b, 0) / tail.length : 0;
}

function calculateDrawdownMetrics(simulations: number[][], initialValue: number) {
  let maxDrawdown = 0;
  let totalDrawdown = 0;
  let drawdownCount = 0;
  let maxDrawdownYear = 0;
  let recoveryTimes: number[] = [];
  
  simulations.forEach(sim => {
    let peak = initialValue;
    let drawdownStart = -1;
    
    sim.forEach((value, year) => {
      if (value > peak) {
        // New peak, check if we were in drawdown
        if (drawdownStart >= 0) {
          recoveryTimes.push(year - drawdownStart);
          drawdownStart = -1;
        }
        peak = value;
      } else if (value < peak) {
        // In drawdown
        if (drawdownStart < 0) drawdownStart = year;
        const currentDrawdown = (peak - value) / peak;
        totalDrawdown += currentDrawdown;
        drawdownCount++;
        
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
          maxDrawdownYear = year + 1; // Convert to 1-based year
        }
      }
    });
  });
  
  const avgDrawdown = drawdownCount > 0 ? totalDrawdown / drawdownCount : 0;
  const drawdownRecoveryTime = recoveryTimes.length > 0 
    ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length 
    : 0;
  
  return { maxDrawdown, avgDrawdown, drawdownRecoveryTime, maxDrawdownYear };
}

function calculateSustainabilityHorizon(simulations: number[][], threshold: number): number {
  let totalDepletionYear = 0;
  let depletionCount = 0;
  const years = simulations[0]?.length ?? 10;
  
  simulations.forEach(sim => {
    for (let year = 0; year < sim.length; year++) {
      if (sim[year] < threshold) {
        totalDepletionYear += year + 1; // Convert to 1-based year
        depletionCount++;
        break;
      }
    }
  });
  
  return depletionCount > 0 ? totalDepletionYear / depletionCount : years + 1;
}

// Narrative Insights Generator
export interface NarrativeInsight {
  type: 'risk' | 'opportunity' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems?: string[];
}

export function generateNarrativeInsights(
  results: SimulationOutputs, 
  inputs: Inputs, 
  riskMetrics: RiskMetrics
): NarrativeInsight[] {
  const insights: NarrativeInsight[] = [];
  const years = results.simulations[0]?.length ?? 10;
  
  // Principal Risk Insight
  if (riskMetrics.principalLossProb > 0.3) {
    insights.push({
      type: 'risk',
      priority: 'high',
      title: `High Principal Risk: ${(riskMetrics.principalLossProb * 100).toFixed(0)}% Chance of Loss`,
      description: `Your endowment has a ${(riskMetrics.principalLossProb * 100).toFixed(0)}% chance of losing principal over ${years} years. This is considered high risk for institutional endowments.`,
      actionItems: [
        'Consider reducing equity allocation to lower volatility',
        'Evaluate reducing spending policy rate',
        'Review portfolio diversification strategy'
      ]
    });
  } else if (riskMetrics.principalLossProb > 0.1) {
    insights.push({
      type: 'risk',
      priority: 'medium',
      title: `Moderate Principal Risk: ${(riskMetrics.principalLossProb * 100).toFixed(0)}% Chance of Loss`,
      description: `Your endowment has a ${(riskMetrics.principalLossProb * 100).toFixed(0)}% chance of losing principal over ${years} years. This is within acceptable range for most endowments.`,
    });
  }
  
  // Drawdown Risk Analysis
  if (riskMetrics.maxDrawdown > 0.4) {
    insights.push({
      type: 'risk',
      priority: 'high',
      title: `Severe Drawdown Risk: Up to ${(riskMetrics.maxDrawdown * 100).toFixed(0)}% Decline`,
      description: `Your portfolio could experience drawdowns of up to ${(riskMetrics.maxDrawdown * 100).toFixed(0)}% in year ${riskMetrics.drawdownAnalysis.maxDrawdownYear}. This may impact spending capacity.`,
      actionItems: [
        'Increase allocation to less volatile assets',
        'Consider implementing spending smoothing rules',
        'Build larger cash reserves for operational flexibility'
      ]
    });
  }
  
  // Spending Policy Analysis
  const currentSpendingRate = inputs.spendingPolicyRate;
  if (currentSpendingRate > 5.5) {
    insights.push({
      type: 'risk',
      priority: 'medium',
      title: `Elevated Spending Rate: ${currentSpendingRate.toFixed(1)}% May Be Unsustainable`,
      description: `Your ${currentSpendingRate.toFixed(1)}% spending rate is above the typical 4-5% range for endowments. This increases long-term sustainability risk.`,
      actionItems: [
        'Consider reducing spending rate to 5% or lower',
        'Implement spending smoothing to reduce volatility',
        'Evaluate essential vs. discretionary spending categories'
      ]
    });
  }
  
  // Opportunity Insights
  const finalValues = results.simulations.map(sim => sim[years - 1]);
  const medianGrowth = (percentile(finalValues, 50) / inputs.initialEndowment - 1) * 100;
  
  if (medianGrowth > 25) {
    insights.push({
      type: 'opportunity',
      priority: 'medium',
      title: `Strong Growth Potential: ${medianGrowth.toFixed(0)}% Median Growth`,
      description: `Your portfolio allocation shows strong growth potential with median ${medianGrowth.toFixed(0)}% growth over ${years} years.`,
    });
  }
  
  // CVaR Analysis
  const cvarLoss = (inputs.initialEndowment - riskMetrics.cvar95) / inputs.initialEndowment * 100;
  if (cvarLoss > 30) {
    insights.push({
      type: 'risk',
      priority: 'high',
      title: `Extreme Tail Risk: 5% Worst Cases Show ${cvarLoss.toFixed(0)}% Loss`,
      description: `In the worst 5% of scenarios, your endowment could lose ${cvarLoss.toFixed(0)}% of its value (${formatMoney(riskMetrics.cvar95)} average in tail scenarios).`,
      actionItems: [
        'Consider tail-risk hedging strategies',
        'Stress test spending policies under adverse scenarios',
        'Review crisis management procedures'
      ]
    });
  }
  
  return insights;
}
