<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend);

const props = defineProps<{ results: any }>();
const canvasRef = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const years = computed(() => props.results?.spendingPolicy?.[0]?.length ?? 0);

function formatMoney(num: number): string {
  if (!isFinite(num)) return '-';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

function buildChart() {
  if (!canvasRef.value || !props.results) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  if (chart) { chart.destroy(); chart = null; }

  const spend = props.results.spendingPolicy as number[][]; // [sim][year] amounts
  const Y = years.value;
  if (Y < 1) return;

  // Compute per-year percentiles on absolute spending amounts
  const median = Array.from({ length: Y }, (_, i) => percentile(spend.map(s => s[i]), 50));
  const p10 = Array.from({ length: Y }, (_, i) => percentile(spend.map(s => s[i]), 10));
  const p25 = Array.from({ length: Y }, (_, i) => percentile(spend.map(s => s[i]), 25));
  const p75 = Array.from({ length: Y }, (_, i) => percentile(spend.map(s => s[i]), 75));
  const p90 = Array.from({ length: Y }, (_, i) => percentile(spend.map(s => s[i]), 90));

  const labels = (props.results?.yearLabels && props.results.yearLabels.length === Y)
    ? props.results.yearLabels
    : Array.from({ length: Y }, (_, i) => `Year ${i + 1}`);

  const datasets: any[] = [
    { label: 'Median Spending', data: median, borderColor: '#0EA5E9', backgroundColor: 'rgba(14,165,233,0.1)', borderWidth: 2.5, pointRadius: 0, fill: true, tension: 0.35 },
    { label: '75th percentile', data: p75, borderColor: '#16A34A', backgroundColor: 'rgba(22,163,74,0.05)', borderWidth: 1.5, pointRadius: 0, fill: '+-1', tension: 0.35 },
    { label: '25th percentile', data: p25, borderColor: '#DC2626', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.35 },
    { label: '90th percentile', data: p90, borderColor: '#15803D', borderWidth: 1.5, borderDash: [6,4], pointRadius: 0, fill: false, tension: 0.35 },
    { label: '10th percentile', data: p10, borderColor: '#B91C1C', borderWidth: 1.5, borderDash: [6,4], pointRadius: 0, fill: false, tension: 0.35 },
  ];

  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
  legend: { position: 'top', labels: { usePointStyle: true, padding: 20, color: '#6B7280', font: { weight: 600 } } },
  tooltip: {
          mode: 'index', intersect: false,
          backgroundColor: 'rgba(255,255,255,0.95)', titleColor: '#1F2937', bodyColor: '#6B7280', borderColor: '#E5E7EB', borderWidth: 1,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatMoney(Number(ctx.parsed.y))}` }
        }
      },
      scales: {
  y: { title: { display: true, text: 'Spending Policy Amount (USD)', color: '#6B7280' }, ticks: { color: '#6B7280', callback: (v) => formatMoney(Number(v)) }, grid: { color: '#E5E7EB' } },
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
  <div class="card p-6 mb-8" style="height: 380px;">
    <div class="flex justify-between items-center mb-3">
  <h3 class="text-lg font-semibold">Spending Policy Amount</h3>
    </div>
    <canvas ref="canvasRef"></canvas>
  </div>

</template>
