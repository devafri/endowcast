export function pointwiseMedian(sims: number[][]) {
  if (!Array.isArray(sims) || sims.length === 0) return [];
  const maxLen = Math.max(...sims.map(s => (s?.length || 0)));
  const median: number[] = [];
  for (let t = 0; t < maxLen; t++) {
    const vals = sims.map(s => (s && s.length > t ? s[t] : NaN)).filter(v => isFinite(v));
    if (!vals.length) { median.push(NaN); continue; }
    vals.sort((a,b) => a-b);
    median.push(vals[Math.floor(vals.length/2)]);
  }
  return median;
}

export function nearestToPointwiseMedian(sims: number[][]) {
  const median = pointwiseMedian(sims);
  if (!median.length) return { index: null, path: null };
  let bestIdx: number | null = null; let bestDist = Infinity;
  for (let i = 0; i < sims.length; i++) {
    const s = sims[i];
    let sum = 0; let cnt = 0;
    for (let t = 0; t < median.length; t++) {
      const a = median[t]; const b = (s && s.length > t ? s[t] : NaN);
      if (!isFinite(a) || !isFinite(b)) continue;
      const d = a - b; sum += d*d; cnt++;
    }
    if (cnt === 0) continue;
    const avg = sum / cnt;
    if (avg < bestDist) { bestDist = avg; bestIdx = i; }
  }
  return { index: bestIdx, path: bestIdx !== null ? sims[bestIdx] : null };
}

export function medoidByFinalValue(sims: number[][]) {
  if (!Array.isArray(sims) || sims.length === 0) return { index: null, path: null };
  const finals = sims.map(s => (s && s.length ? s[s.length-1] : 0));
  let bestIdx = 0; let bestSum = Infinity;
  for (let i = 0; i < finals.length; i++) {
    let sum = 0;
    for (let j = 0; j < finals.length; j++) {
      const d = finals[i] - finals[j]; sum += d * d;
    }
    if (sum < bestSum) { bestSum = sum; bestIdx = i; }
  }
  return { index: bestIdx, path: sims[bestIdx] };
}
