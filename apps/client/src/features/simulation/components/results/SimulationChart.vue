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

  const sims = props.results.simulations as number[][];
  const benchmarks = props.results.benchmarks as number[][];
  const corpus = (props.results.corpusPaths as number[][]).filter((p: number[]) => Array.isArray(p) && p.every(v => isFinite(v)));
  const benchmarkLabel = props.results.benchmark?.label || 'Benchmark (CPI + 6%)';
  const benchmarkEnabled = props.results.benchmark?.enabled !== false;
  const corpusEnabled = props.results.corpus?.enabled !== false;
  const Y = years.value;
  
  // Get initial endowment value to prepend to all data arrays
  const initialValue = props.results.inputs?.initialValue || props.results.inputs?.initialEndowment || 0;

  // Build percentile "paths" for fan chart, including initial value
  function getPercentile(arrs: number[][], pct: number) {
    // arrs: [sim][year], pct: 0-100
    const n = arrs.length;
    if (!n) return [initialValue]; // Start with initial value
    const Y = arrs[0].length;
    const out = [initialValue]; // Start with initial value
    for (let y = 0; y < Y; ++y) {
      const vals = arrs.map(a => a[y]).sort((a, b) => a - b);
      const idx = Math.floor((pct / 100) * (n - 1));
      out.push(vals[idx]);
    }
    return out;
  }
  // Compute percentiles every 5th (5, 10, ..., 95)
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
  // Generate a gradient for each band (lighter for outer bands, darker for inner)
  const bandGradients: Record<string, CanvasGradient | string> = {};
  if (ctx) {
    const chartHeight = canvasRef.value.height || 500;
    for (let low = 5; low < 50; low += 5) {
      const high = 100 - low;
      const opacity = 0.04 + 0.18 * (1 - (Math.abs(50 - low) / 50)); // darker toward center
      const grad = ctx.createLinearGradient(0, 0, 0, chartHeight);
      grad.addColorStop(0, `rgba(14,165,233,${opacity + 0.04})`);
      grad.addColorStop(1, `rgba(14,165,233,${opacity})`);
      bandGradients[`${low}_${high}`] = grad;
    }
  }

  // Fan chart: shaded bands between every 5th percentile
    // Fan chart: shaded bands between every 5th percentile (5–95). Outer bands lighter, inner darker.
    for (let low = 5; low < 50; low += 5) {
      const high = 100 - low;
      datasets.push(
        { label: `${high}th percentile`, data: percentiles[high], borderColor: 'rgba(14,165,233,0.0)', backgroundColor: bandGradients[`${low}_${high}`] || 'rgba(14,165,233,0.08)', borderWidth: 0, pointRadius: 0, fill: '-1', tension: 0.4, order: low },
        { label: `${low}th percentile`, data: percentiles[low], borderColor: 'rgba(14,165,233,0.0)', backgroundColor: bandGradients[`${low}_${high}`] || 'rgba(14,165,233,0.08)', borderWidth: 0, pointRadius: 0, fill: false, tension: 0.4, order: low }
      );
    }
  // Median line
  datasets.push(
    { label: 'Median (50th percentile)', data: p50, borderColor: '#0EA5E9', backgroundColor: 'rgba(14, 165, 233, 0.0)', borderWidth: 4.5, pointRadius: 0, fill: false, tension: 0.4, order: 50 }
  );
  // Benchmarks/corpus
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
        // To control which datasets appear in the legend, customize the filter function below.
        // Example: Only show median, 90%/50% bands, benchmark, and corpus in the legend.
        legend: {
          position: 'top',
          labels: {
            // --- LEGEND FILTER: customize this function to control legend items ---
               filter: (item) => {
                 const allowed = [
                   'Median (50th percentile)',
                   benchmarkLabel,
                   'Corpus (CPI Growth)'
                 ];
                 return allowed.includes(item.text);
               },
            //filter: (item) => !String(item.text).startsWith('Simulation'),
            usePointStyle: true, padding: 20, color: '#6B7280', font: { weight: 600 }
          }
        },
        tooltip: {
          mode: 'index', intersect: false,
          backgroundColor: 'rgba(255,255,255,0.95)', titleColor: '#1F2937', bodyColor: '#6B7280', borderColor: '#E5E7EB', borderWidth: 1,
          filter: (ctx) => {
            const ds: any = ctx.dataset || {};
            const lbl = String(ds.label || '');
            return !lbl.startsWith('Simulation') && !ds.isSample;
          },
          callbacks: { 
            label: (ctx) => {
              const value = ctx.parsed.y;
              return `${ctx.dataset.label}: ${formatMoney(value)}`;
            }
          }
        }
      },
      scales: {
        y: { title: { display: true, text: 'Endowment Value (USD)', color: '#6B7280' }, ticks: { color: '#6B7280', callback: (v) => formatMoney(Number(v)) }, grid: { color: '#E5E7EB' } },
        x: { title: { display: true, text: (props.results?.yearLabels?.[0] && !props.results.yearLabels[0].startsWith('Year')) ? 'Calendar Year' : 'Year', color: '#6B7280' }, ticks: { color: '#6B7280' }, grid: { display: false } },
      },
      interaction: { mode: 'index', intersect: false },
    }
  });
}

onMounted(buildChart);
onBeforeUnmount(() => { if (chart) chart.destroy(); });
watch(() => props.results, buildChart, { deep: true });
</script>

<template>
  <div class="card p-6 mb-8" style="height: 500px;">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold">Endowment Value Projection</h3>
      <div class="flex space-x-2 items-center">
        <span v-if="props.results?.stress?.applied" class="text-xs px-2 py-1 bg-amber-500 bg-opacity-20 text-amber-600 rounded-full">Stress applied: {{ props.results?.stress?.summary }}</span>
        <span class="text-xs px-2 py-1 bg-blue-500 bg-opacity-20 text-blue-300 rounded-full">Median</span>
        <span class="text-xs px-2 py-1 bg-green-500 bg-opacity-20 text-green-300 rounded-full">75th %</span>
        <span class="text-xs px-2 py-1 bg-red-500 bg-opacity-20 text-red-300 rounded-full">25th %</span>
        <span class="text-xs px-2 py-1 bg-purple-500 bg-opacity-20 text-purple-300 rounded-full">Benchmark</span>
      </div>
    </div>
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

