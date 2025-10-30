<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend);

const props = defineProps<{ results: any }>();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const years = computed(() => props.results?.simulations?.[0]?.length ?? 0);

function formatMoney(num: number): string {
  if (!isFinite(num)) return '-';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function buildChart() {
  if (!canvasRef.value || !props.results) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  if (chart) { chart.destroy(); chart = null; }

  const sims = (props.results.simulations as number[][] | undefined) ?? [];
  const benchmarks = (props.results.benchmarks as number[][] | undefined) ?? [];
  const corpus = ((props.results.corpusPaths as number[][] | undefined) ?? []).filter((p: number[]) => Array.isArray(p) && p.every(v => isFinite(v)));
  
  // If no simulations, don't render the chart
  if (!sims.length) return;
  
  const benchmarkLabel = props.results.benchmark?.label || 'Benchmark (CPI + 6%)';
  const benchmarkEnabled = props.results.benchmark?.enabled !== false;
  const corpusEnabled = props.results.corpus?.enabled !== false;
  const Y = years.value;
  
  const initialValue = props.results.inputs?.initialValue || props.results.inputs?.initialEndowment || 0;

  function getPercentile(arrs: number[][], pct: number) {
    const n = arrs.length;
    if (!n) return [initialValue];
    const Y = arrs[0].length;
    const out = [initialValue];
    for (let y = 0; y < Y; ++y) {
      const vals = arrs.map(a => a[y]).sort((a, b) => a - b);
      const idx = Math.floor((pct / 100) * (n - 1));
      out.push(vals[idx]);
    }
    return out;
  }

  const percentiles: Record<number, number[]> = {};
  for (let pct = 5; pct <= 95; pct += 5) {
    percentiles[pct] = getPercentile(sims, pct);
  }
  const p50 = percentiles[50];
  const benchmarkMean = [initialValue, ...Array.from({ length: Y }, (_, i) => {
    const arr = benchmarks.map(b => b[i]);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  })];
  const hasCorpus = corpusEnabled && corpus.length > 0;
  const corpusMean = hasCorpus ? [initialValue, ...Array.from({ length: Y }, (_, i) => {
    const arr = corpus.map(c => c[i]);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  })] : [];

  const labels = (props.results?.yearLabels && props.results.yearLabels.length === Y + 1)
    ? props.results.yearLabels
    : [2025, ...Array.from({ length: Y }, (_, i) => 2025 + i + 1)];
  const datasets: any[] = [];

// Gradients for fan chart bands
  const bandGradients: Record<string, CanvasGradient | string> = {};
  if (ctx) {
    const chartHeight = canvasRef.value.height || 500;
    for (let low = 5; low < 50; low += 5) {
      const high = 100 - low;
      const opacity = 0.04 + 0.18 * (1 - (Math.abs(50 - low) / 50));
      const grad = ctx.createLinearGradient(0, 0, 0, chartHeight);
      grad.addColorStop(0, `rgba(138,138,138,${opacity + 0.04})`);
      grad.addColorStop(1, `rgba(138,138,138,${opacity})`);
      bandGradients[`${low}_${high}`] = grad;
    }
  }

  for (let low = 5; low < 50; low += 5) {
    const high = 100 - low;
    datasets.push(
      { label: `${high}th percentile`, data: percentiles[high], borderColor: 'rgba(14,165,233,0.0)', backgroundColor: bandGradients[`${low}_${high}`] || 'rgba(14,165,233,0.08)', borderWidth: 0, pointRadius: 0, fill: '-1', tension: 0.4, order: low, isSample: true },
      { label: `${low}th percentile`, data: percentiles[low], borderColor: 'rgba(14,165,233,0.0)', backgroundColor: bandGradients[`${low}_${high}`] || 'rgba(14,165,233,0.08)', borderWidth: 0, pointRadius: 0, fill: false, tension: 0.4, order: low, isSample: true }
    );
  }
  datasets.push(
    { label: 'Median (50th percentile)', data: p50, borderColor: '#0EA5E9', backgroundColor: 'rgba(14, 165, 233, 0.0)', borderWidth: 4.5, pointRadius: 0, fill: false, tension: 0.4, order: 50 }
  );

    // Visible percentile lines (overlay on top of bands) - keep styling subtle but readable
    const percentileLineStyles: Record<number, any> = {
      90: { borderColor: '#0B814A', borderWidth: 1.8, borderDash: [6,4] },
      75: { borderColor: '#16A34A', borderWidth: 1.6, borderDash: [] },
      25: { borderColor: '#DC2626', borderWidth: 1.6, borderDash: [] },
      10: { borderColor: '#991B1B', borderWidth: 1.8, borderDash: [6,4] }
    };
    const overlayPercentiles = [90, 75, 25, 10];
    for (const pct of overlayPercentiles) {
      const style = percentileLineStyles[pct] || { borderColor: '#0EA5E9', borderWidth: 1.2 };
      // add a visible line for this percentile
      datasets.push({ label: `${pct}th percentile`, data: percentiles[pct], borderColor: style.borderColor, borderWidth: style.borderWidth, borderDash: style.borderDash || [], pointRadius: 0, fill: false, tension: 0.35, order: 60 + pct });
    }

  try {
    const rep = props.results?.summary?.representative;
    if (rep) {
      if (Array.isArray(rep.medoidPath) && rep.medoidPath.length) {
        datasets.push({ label: 'Representative (Medoid)', data: [initialValue, ...rep.medoidPath], borderColor: '#EF4444', borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.3, order: 100 });
      }
      if (Array.isArray(rep.nearestToMedianPath) && rep.nearestToMedianPath.length) {
        datasets.push({ label: 'Nearest to Median (actual path)', data: [initialValue, ...rep.nearestToMedianPath], borderColor: '#D946EF', borderWidth: 2, borderDash: [6,4], pointRadius: 0, fill: false, tension: 0.3, order: 101 });
      }
      if (Array.isArray(rep.pointwiseMedian) && rep.pointwiseMedian.length) {
        datasets.push({ label: 'Pointwise Median (abstract)', data: [initialValue, ...rep.pointwiseMedian], borderColor: '#0EA5E9', borderWidth: 2, borderDash: [2,4], pointRadius: 0, fill: false, tension: 0.3, order: 99, borderOpacity: 0.7 });
      }
    }
  } catch (e) {}

  if (benchmarkEnabled) {
    datasets.push({ label: benchmarkLabel, data: benchmarkMean, borderColor: '#7C3AED', borderWidth: 2, borderDash: [5,5], pointRadius: 0, fill: false, tension: 0.4, order: 51 });
  }
  if (hasCorpus) {
    datasets.push({ label: 'Corpus (CPI Growth)', data: corpusMean, borderColor: '#F97316', borderWidth: 2, borderDash: [5,5], pointRadius: 0, fill: false, tension: 0.4, order: 52 });
  }

  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { filter: (item) => {
            const allowed = [ 'Median (50th percentile)', benchmarkLabel, 'Corpus (CPI Growth)' ];
            return allowed.includes(item.text);
          }, usePointStyle: true, padding: 20, color: '#6B7280', font: { weight: 600 } } },
        tooltip: {
          mode: 'index', intersect: false,
          backgroundColor: 'rgba(255,255,255,0.95)', titleColor: '#1F2937', bodyColor: '#6B7280', borderColor: '#E5E7EB', borderWidth: 1,
          filter: (ctx) => {
            const ds: any = ctx.dataset || {};
            const lbl = String(ds.label || '');
            if (lbl.startsWith('Simulation') || ds.isSample) return false;
            if (lbl === benchmarkLabel) return true;
            if (lbl === 'Corpus (CPI Growth)') return true;
            if (/median/i.test(lbl)) return true;
            const m = lbl.match(/(\d+)th?\s+percentile/i);
            if (m) {
              const n = Number(m[1]);
              return [10,25,50,75,90].includes(n);
            }
            return false;
          },
          itemSort: (a: any, b: any) => {
            const labelA = String(a.dataset?.label || '');
            const labelB = String(b.dataset?.label || '');
            function rankLabel(lbl: string) {
              if (lbl === benchmarkLabel) return 100;
              if (lbl === 'Corpus (CPI Growth)') return 101;
              if (/median/i.test(lbl)) return 2;
              const m = lbl.match(/(\d+)th?\s+percentile/i);
              if (m) {
                const n = Number(m[1]);
                if (n === 90) return 0;
                if (n === 75) return 1;
                if (n === 50) return 2;
                if (n === 25) return 3;
                if (n === 10) return 4;
              }
              return 999;
            }
            return rankLabel(labelA) - rankLabel(labelB);
          },
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed.y;
              if (value === null || value === undefined) return `${ctx.dataset.label}: —`;
              return `${ctx.dataset.label}: ${formatMoney(Number(value))}`;
            },
            labelColor: (ctx) => {
              const ds: any = ctx.dataset || {};
              // prefer borderColor, fall back to backgroundColor, otherwise default
              const c = ds.borderColor || ds.backgroundColor || '#0EA5E9';
              return { borderColor: c, backgroundColor: c };
            }
          }
        }
      },
      scales: { y: { title: { display: true, text: 'Endowment Value (USD)', color: '#6B7280' }, ticks: { color: '#6B7280', callback: (v) => formatMoney(Number(v)) }, grid: { color: '#E5E7EB' } }, x: { title: { display: true, text: (props.results?.yearLabels?.[0] && !props.results.yearLabels[0].startsWith('Year')) ? 'Calendar Year' : 'Year', color: '#6B7280' }, ticks: { color: '#6B7280' }, grid: { display: false } } },
      interaction: { mode: 'index', intersect: false },
    }
  });
}

onMounted(buildChart);
onBeforeUnmount(() => { if (chart) chart.destroy(); });
watch(() => props.results, buildChart, { deep: true });
</script>

<template>
  <div class="p-6 bg-white border border-gray-200 rounded-xl shadow-lg h-128 mb-8">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-gray-800">Endowment Value Projection</h3>
      <div class="flex space-x-2 items-center">
        <span 
          v-if="props.results?.stress?.applied" 
          class="text-xs px-3 py-1 bg-amber-100 text-amber-700 font-medium rounded-full border border-amber-200"
        >
          Stress applied: {{ props.results?.stress?.summary }}
        </span>
      </div>
    </div>
    <div class="relative h-full">
      <canvas ref="canvasRef" class="w-full h-full"></canvas>
    </div>
  </div>
</template>