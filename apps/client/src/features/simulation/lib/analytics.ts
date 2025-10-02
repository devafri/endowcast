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
function annualizedReturn(returns: number[]): number {
  if (!returns?.length) return NaN;
  let prod = 1;
  for (const r of returns) prod *= (1 + r);
  return Math.pow(prod, 1 / returns.length) - 1;
}
