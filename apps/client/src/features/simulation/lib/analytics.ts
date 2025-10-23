// Analytics: percentile and risk metrics independent of UI

export function percentile(values: number[], p: number): number {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

export interface RiskMetrics {
  cvar95: number;
  cvar99: number;
  maxDrawdown: number;
  principalLossProb: number;
  sustainabilityHorizon: number;
  // New performance/risk additions
  medianCagr: number; // median geometric mean of portfolio returns per simulation
  sortino: number; // risk-adjusted using downside deviation
  calmar: number; // CAGR / max drawdown
  probBeatBenchmark?: number; // probability final value beats benchmark final
  safeSpending80?: { amount: number; ratePct: number }; // 80% success spending amount and rate vs initial
  tailRiskMetrics: {
    worst1Pct: number;
    worst5Pct: number;
    worst10Pct: number;
  };
  drawdownAnalysis: {
    avgDrawdown: number;
    drawdownRecoveryTime: number;
    maxDrawdownYear: number;
  };
}

/**
 * Calculate core and extended risk metrics.
 * @param simulations endowment paths [sim][year]
 * @param initialValue initial endowment
 * @param portfolioReturns optional annual portfolio returns before cash flows [sim][year]
 * @param benchmarks optional benchmark paths [sim][year]
 * @param spendingPolicy optional spending policy amounts [sim][year]
 * @param initialEndowmentForRates optional initial endowment for computing safe spending rate
 * @param targetReturn Sortino target return (e.g., risk-free). Default 2%.
 */
export function calculateRiskMetrics(
  simulations: number[][],
  initialValue: number,
  portfolioReturns?: number[][],
  benchmarks?: number[][],
  spendingPolicy?: number[][],
  initialEndowmentForRates?: number,
  targetReturn: number = 0.02,
): RiskMetrics {
  const years = simulations[0]?.length ?? 10;
  const finalValues = simulations.map(sim => sim[years - 1]);

  const cvar95 = calculateCVaR(finalValues, 0.05);
  const cvar99 = calculateCVaR(finalValues, 0.01);

  const { maxDrawdown, avgDrawdown, drawdownRecoveryTime, maxDrawdownYear } = calculateDrawdownMetrics(simulations, initialValue);

  const principalLossProb = finalValues.filter(v => v < initialValue).length / finalValues.length;

  const sustainabilityHorizon = calculateSustainabilityHorizon(simulations, initialValue * 0.5);

  const sortedFinalValues = [...finalValues].sort((a, b) => a - b);
  const worst1Pct = sortedFinalValues[Math.floor(sortedFinalValues.length * 0.01)] ?? 0;
  const worst5Pct = sortedFinalValues[Math.floor(sortedFinalValues.length * 0.05)] ?? 0;
  const worst10Pct = sortedFinalValues[Math.floor(sortedFinalValues.length * 0.10)] ?? 0;

  // Median CAGR from portfolio returns if provided
  let medianCagr = 0;
  if (portfolioReturns && portfolioReturns.length) {
    const perSimCagr = portfolioReturns.map(series => annualizedReturn(series)).filter(isFinite);
    perSimCagr.sort((a, b) => a - b);
    medianCagr = perSimCagr[Math.floor(perSimCagr.length / 2)] ?? 0;
  }

  // Sortino ratio using annual returns if available
  let sortino = 0;
  if (portfolioReturns && portfolioReturns.length) {
    const allAnnual = portfolioReturns.flat();
    const downsideSquares: number[] = [];
    for (const r of allAnnual) {
      const diff = r - targetReturn;
      if (diff < 0) downsideSquares.push(diff * diff);
    }
    const downsideDev = downsideSquares.length ? Math.sqrt(downsideSquares.reduce((a, b) => a + b, 0) / downsideSquares.length) : 0;
    sortino = downsideDev > 0 ? (medianCagr - targetReturn) / downsideDev : 0;
  }

  // Calmar ratio: CAGR / Max Drawdown
  const calmar = maxDrawdown > 0 ? (medianCagr / maxDrawdown) : 0;

  // Probability of beating benchmark at horizon
  let probBeatBenchmark: number | undefined = undefined;
  if (benchmarks && benchmarks.length && benchmarks[0]?.length === years) {
    const benchFinal = benchmarks.map(b => b[years - 1]);
    let count = 0;
    for (let i = 0; i < finalValues.length; i++) {
      if ((finalValues[i] ?? -Infinity) > (benchFinal[i] ?? Infinity)) count++;
    }
    probBeatBenchmark = finalValues.length ? count / finalValues.length : 0;
  }

  // Safe spending (80% success): 20th percentile of per-simulation minimum spending amounts
  let safeSpending80: { amount: number; ratePct: number } | undefined = undefined;
  if (spendingPolicy && spendingPolicy.length && initialEndowmentForRates && initialEndowmentForRates > 0) {
    const perSimMin = spendingPolicy.map(sp => Math.min(...sp));
    const amount = percentile(perSimMin, 20);
    const ratePct = isFinite(amount) && amount >= 0 ? (amount / initialEndowmentForRates) * 100 : 0;
    safeSpending80 = { amount, ratePct };
  }

  return {
    cvar95,
    cvar99,
    maxDrawdown,
    principalLossProb,
    sustainabilityHorizon,
    medianCagr,
    sortino,
    calmar,
    probBeatBenchmark,
    safeSpending80,
    tailRiskMetrics: { worst1Pct, worst5Pct, worst10Pct },
    drawdownAnalysis: { avgDrawdown, drawdownRecoveryTime, maxDrawdownYear }
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
  const recoveryTimes: number[] = [];

  simulations.forEach(sim => {
    let peak = initialValue;
    let drawdownStart = -1;
    sim.forEach((value, year) => {
      if (value > peak) {
        if (drawdownStart >= 0) {
          recoveryTimes.push(year - drawdownStart);
          drawdownStart = -1;
        }
        peak = value;
      } else if (value < peak) {
        if (drawdownStart < 0) drawdownStart = year;
        const currentDrawdown = (peak - value) / peak;
        totalDrawdown += currentDrawdown;
        drawdownCount++;
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
          maxDrawdownYear = year + 1;
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
        totalDepletionYear += year + 1;
        depletionCount++;
        break;
      }
    }
  });
  return depletionCount > 0 ? totalDepletionYear / depletionCount : years + 1;
}

// Helpers
export function annualizedReturn(returns: number[]): number {
  if (!returns?.length) return NaN;
  let prod = 1;
  for (const r of returns) prod *= (1 + r);
  return Math.pow(prod, 1 / returns.length) - 1;
}

export function standardDeviation(values: number[]): number {
  if (!values?.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Sortino ratio: (mean(return) - target) / downsideDeviation
 * - returns: array of returns (decimal)
 * - target: minimal acceptable return (e.g. risk-free or 0.02)
 */
export function sortinoRatio(returns: number[], target: number = 0.02): number {
  if (!returns?.length) return NaN;
  const excess = returns.map(r => r - target);
  const downsideSquares = excess.filter(e => e < 0).map(e => e * e);
  const downsideDev = downsideSquares.length ? Math.sqrt(downsideSquares.reduce((a, b) => a + b, 0) / downsideSquares.length) : 0;
  const meanExcess = excess.reduce((a, b) => a + b, 0) / excess.length;
  return downsideDev > 0 ? meanExcess / downsideDev : NaN;
}

// --- Added utilities for components ---

/**
 * Compute median of final values (helper)
 */
export function medianFinalValue(simulations: number[][]): number {
  if (!simulations?.length) return NaN;
  const years = simulations[0].length;
  const finals = simulations.map(s => s[years - 1]).filter(isFinite);
  finals.sort((a, b) => a - b);
  return finals[Math.floor(finals.length / 2)];
}

/**
 * Median of per-simulation maximum drawdowns.
 * Returns decimal drawdown (e.g., 0.25 == 25%).
 */
export function medianMaxDrawdown(simulations: number[][]): number {
  if (!simulations?.length) return NaN;
  const perSimMax: number[] = [];
  for (const sim of simulations) {
    if (!sim?.length) continue;
    let peak = sim[0];
    let maxDd = 0;
    for (const v of sim) {
      if (v > peak) peak = v;
      else {
        const dd = (peak - v) / peak;
        if (dd > maxDd) maxDd = dd;
      }
    }
    if (isFinite(maxDd)) perSimMax.push(maxDd);
  }
  if (!perSimMax.length) return NaN;
  perSimMax.sort((a, b) => a - b);
  return perSimMax[Math.floor(perSimMax.length / 2)];
}

/**
 * Probability that final < threshold (e.g., initial value)
 */
export function probabilityOfLoss(simulations: number[][], threshold: number): number {
  if (!simulations?.length) return NaN;
  const years = simulations[0].length;
  const finals = simulations.map(s => s[years - 1]);
  return finals.filter(v => v < threshold).length / finals.length;
}

/**
 * Percentiles per year for a set of simulations. Returns an object keyed by percentile (number->array by year)
 */
export function percentilesForYears(simulations: number[][], percentiles: number[] = [10,25,50,75,90]) {
  if (!simulations?.length) return {} as Record<number, number[]>;
  const years = simulations[0].length;
  const out: Record<number, number[]> = {};
  for (const p of percentiles) {
    out[p] = [];
    for (let y = 0; y < years; y++) {
      const vals = simulations.map(s => s[y]).sort((a, b) => a - b);
      const idx = Math.floor((p / 100) * (vals.length - 1));
      out[p].push(vals[idx]);
    }
  }
  return out;
}

/**
 * Sharpe ratio: mean(Returns - riskFree) / stdDev(Returns - riskFree)
 * Assumes returns are decimal (0.05 = 5%).
 */
export function sharpeRatio(returns: number[], riskFree: number = 0.02): number {
  if (!returns?.length) return NaN;
  const excess = returns.map(r => r - riskFree);
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length;
  const variance = excess.reduce((a, b) => a + (b - mean) * (b - mean), 0) / excess.length;
  const sd = Math.sqrt(variance);
  return sd > 0 ? mean / sd : 0;
}

/**
 * Compute per-simulation Sharpe ratios from portfolio returns (per-simulation time series).
 * For each simulation: compute annualized return and standard deviation of annual returns,
 * then return (annualizedReturn - riskFree) / stdev.
 * Returns an array of finite Sharpe values (NaNs filtered out).
 */
export function perSimulationSharpe(portfolioReturns: number[][], riskFree: number = 0.02): number[] {
  if (!portfolioReturns?.length) return [];
  const out: number[] = [];
  for (const rets of portfolioReturns) {
    if (!rets?.length) continue;
    const r = annualizedReturn(rets);
    const sd = standardDeviation(rets);
    if (!isFinite(r) || !isFinite(sd) || sd === 0) continue;
    out.push((r - riskFree) / sd);
  }
  return out;
}

/**
 * Return the percentile (p) of the per-simulation Sharpe distribution.
 */
export function sharpePercentile(portfolioReturns: number[][], p: number, riskFree: number = 0.02): number {
  const s = perSimulationSharpe(portfolioReturns, riskFree);
  if (!s.length) return NaN;
  return percentile(s, p);
}

/**
 * Compute a single Sharpe statistic across simulations using each simulation's annualized CAGR.
 * This mirrors previous behaviour where we took per-simulation CAGRs and computed mean/std across them.
 */
export function sharpeFromCAGRs(portfolioReturns: number[][], riskFree: number = 0.02): number {
  if (!portfolioReturns?.length) return NaN;
  const perSimCagrs = portfolioReturns.map(series => annualizedReturn(series)).filter(isFinite);
  return sharpeRatio(perSimCagrs, riskFree);
}

/**
 * Choose a representative path: medoid by final value or nearest to pointwise median
 */
export function medoidByFinalValue(simulations: number[][]) {
  if (!simulations?.length) return { index: -1, path: [] as number[] };
  const years = simulations[0].length;
  const finals = simulations.map(s => s[years - 1]);
  // Choose medoid index by minimizing sum absolute distance to other final values
  let bestIdx = 0;
  let bestScore = Infinity;
  for (let i = 0; i < finals.length; i++) {
    let score = 0;
    for (let j = 0; j < finals.length; j++) score += Math.abs(finals[i] - finals[j]);
    if (score < bestScore) { bestScore = score; bestIdx = i; }
  }
  return { index: bestIdx, path: simulations[bestIdx] };
}

export function pointwiseMedian(simulations: number[][]) {
  if (!simulations?.length) return [] as number[];
  const years = simulations[0].length;
  const out: number[] = [];
  for (let y = 0; y < years; y++) {
    const vals = simulations.map(s => s[y]).sort((a, b) => a - b);
    out.push(vals[Math.floor(vals.length / 2)]);
  }
  return out;
}

export function nearestToPointwiseMedian(simulations: number[][]) {
  if (!simulations?.length) return { index: -1, path: [] as number[] };
  const pm = pointwiseMedian(simulations);
  let bestIdx = -1; let bestDist = Infinity;
  for (let i = 0; i < simulations.length; i++) {
    const path = simulations[i];
    let d = 0;
    for (let y = 0; y < path.length; y++) d += Math.abs(path[y] - pm[y]);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return { index: bestIdx, path: simulations[bestIdx] };
}

/**
 * Median annualized return (CAGR) from portfolio returns array [sim][year].
 * Returns decimal (0.05 == 5%).
 */
export function medianAnnualizedReturnFromReturns(portfolioReturns?: number[][]): number {
  if (!portfolioReturns || !portfolioReturns.length) return NaN;
  const perSim = portfolioReturns.map(series => annualizedReturn(series)).filter(isFinite);
  if (!perSim.length) return NaN;
  perSim.sort((a, b) => a - b);
  return perSim[Math.floor(perSim.length / 2)];
}

/**
 * Median annualized volatility across simulations.
 * - portfolioReturns: array [sim][periodReturns]
 * - periodsPerYear: number of periods per year (e.g., 12 for monthly returns)
 * - useSample: whether to use sample std (ddof=1) when computing per-sim std; defaults to false (population)
 * Returns decimal volatility (e.g., 0.15 == 15%)
 */
export function medianAnnualizedVolatility(portfolioReturns?: number[][], periodsPerYear: number = 12, useSample: boolean = false): number {
  if (!portfolioReturns || !portfolioReturns.length) return NaN;
  const perSimVols: number[] = [];
  for (const rets of portfolioReturns) {
    if (!rets || !rets.length) continue;
    // compute variance
    const n = rets.length;
    const mean = rets.reduce((a, b) => a + b, 0) / n;
    const variance = rets.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (useSample && n > 1 ? (n - 1) : n);
    const sd = Math.sqrt(variance);
    // annualize
    const ann = sd * Math.sqrt(periodsPerYear);
    if (isFinite(ann)) perSimVols.push(ann);
  }
  if (!perSimVols.length) return NaN;
  perSimVols.sort((a, b) => a - b);
  return perSimVols[Math.floor(perSimVols.length / 2)];
}

/**
 * Fraction of simulations where final value >= inflation-adjusted threshold.
 * Returns decimal fraction (0-1).
 */
export function inflationAdjustedPreservation(simulations: number[][], initialValue: number, years?: number, inflationRate: number = 0.03): number {
  if (!simulations || !simulations.length) return NaN;
  const y = years ?? (simulations[0]?.length ?? 10);
  const threshold = initialValue * Math.pow(1 + inflationRate, y);
  const finals = simulations.map(s => s[y - 1]);
  return finals.filter(v => v >= threshold).length / finals.length;
}

