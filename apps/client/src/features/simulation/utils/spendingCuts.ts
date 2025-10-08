export function perSimulationWorstCuts(simulations: number[][], spendingPolicy?: (number[]|null)[]) {
  if (!Array.isArray(simulations) || simulations.length === 0) return [];
  const cuts: number[] = [];
  for (let i = 0; i < simulations.length; i++) {
    const sim = simulations[i] || [];
    const spend = spendingPolicy && spendingPolicy[i] ? spendingPolicy[i] : null;
    const series = (spend && Array.isArray(spend) && spend.length === sim.length) ? spend : sim;
    let worst: number | null = null;
    for (let t = 0; t < series.length - 1; t++) {
      const a = series[t];
      const b = series[t+1];
      if (!isFinite(a) || !isFinite(b) || a === 0) continue;
      const pct = (b - a) / Math.abs(a);
      if (worst === null || pct < worst) worst = pct;
    }
    if (worst !== null) cuts.push(Math.round(worst * 10000) / 100); // percent with 2 decimals
  }
  return cuts;
}

export function summarizeWorstCuts(cuts: number[]) {
  if (!Array.isArray(cuts) || cuts.length === 0) return { count: 0, p10: null, p25: null, p50: null, p75: null, p90: null };
  const sorted = cuts.slice().sort((a,b) => a - b);
  const p = (q:number) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * q)))]
  return {
    count: sorted.length,
    p10: p(0.1),
    p25: p(0.25),
    p50: p(0.5),
    p75: p(0.75),
    p90: p(0.9),
  };
}
