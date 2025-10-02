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

export function calculateRiskMetrics(simulations: number[][], initialValue: number): RiskMetrics {
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

  return {
    cvar95,
    cvar99,
    maxDrawdown,
    principalLossProb,
    sustainabilityHorizon,
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
