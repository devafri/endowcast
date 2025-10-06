<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend } from 'chart.js';
import { percentile } from '../../lib/monteCarlo';

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
  const Y = years.value;

  // Build percentile "paths" by selecting representative simulations based on final values
  const finals = sims.map(s => s[Y - 1]);
  const sortedIdx = finals
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v)
    .map(x => x.i);
  const idx50 = sortedIdx[Math.floor(0.50 * (sortedIdx.length - 1))] ?? 0;
  const idx25 = sortedIdx[Math.floor(0.25 * (sortedIdx.length - 1))] ?? 0;
  const idx75 = sortedIdx[Math.floor(0.75 * (sortedIdx.length - 1))] ?? 0;
  const median = sims[idx50];
  const p25 = sims[idx25];
  const p75 = sims[idx75];
  const benchmarkMean = Array.from({ length: Y }, (_, i) => {
    const arr = benchmarks.map(b => b[i]);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  });
  const hasCorpus = corpus.length > 0;
  const corpusMean = hasCorpus ? Array.from({ length: Y }, (_, i) => {
    const arr = corpus.map(c => c[i]);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }) : [];

  const labels = (props.results?.yearLabels && props.results.yearLabels.length === Y)
    ? props.results.yearLabels
    : Array.from({ length: Y }, (_, i) => `Year ${i + 1}`);
  const datasets: any[] = [];

  // Add a subset of simulation paths as very light lines behind main series
  const sampleCount = Math.min(100, sims.length);
  for (let i = 0; i < sampleCount; i++) {
    datasets.push({
      label: `Simulation ${i+1}`,
      data: sims[i],
      borderColor: 'rgba(107,114,128,0.15)',
      borderWidth: 0.8,
      pointRadius: 0,
      fill: false,
      tension: 0.25,
  isSample: true,
    });
  }

  // Main summary datasets on top
  datasets.push(
    { label: 'Median (50th percentile)', data: median, borderColor: '#0EA5E9', backgroundColor: 'rgba(14, 165, 233, 0.1)', borderWidth: 2.5, pointRadius: 0, fill: true, tension: 0.4 },
    { label: '75th percentile', data: p75, borderColor: '#16A34A', backgroundColor: 'rgba(22,163,74,0.05)', borderWidth: 1.5, pointRadius: 0, fill: '+-1', tension: 0.4 },
    { label: '25th percentile', data: p25, borderColor: '#DC2626', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.4 },
    { label: 'Benchmark (CPI + 6%)', data: benchmarkMean, borderColor: '#7C3AED', borderWidth: 2, borderDash: [5,5], pointRadius: 0, fill: false, tension: 0.4 },
    ...(hasCorpus ? [{ label: 'Corpus (CPI Growth)', data: corpusMean, borderColor: '#F97316', borderWidth: 2, borderDash: [5,5], pointRadius: 0, fill: false, tension: 0.4 }] : [])
  );

  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
  legend: { position: 'top', labels: { filter: (item) => !String(item.text).startsWith('Simulation'), usePointStyle: true, padding: 20, color: '#6B7280', font: { weight: 600 } } },
        tooltip: {
          mode: 'index', intersect: false,
          backgroundColor: 'rgba(255,255,255,0.95)', titleColor: '#1F2937', bodyColor: '#6B7280', borderColor: '#E5E7EB', borderWidth: 1,
          filter: (ctx) => {
            const ds: any = ctx.dataset || {};
            const lbl = String(ds.label || '');
            return !lbl.startsWith('Simulation') && !ds.isSample;
          },
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatMoney(Number(ctx.formattedValue))}` }
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

