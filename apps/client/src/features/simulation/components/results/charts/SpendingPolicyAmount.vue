<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend);

const props = defineProps<{ results: any }>();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const legendRef = ref<HTMLElement | null>(null);
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

function renderHtmlLegend() {
  if (!legendRef.value || !chart) return;
  const container = legendRef.value;
  container.innerHTML = '';
  const items = (chart.data.datasets || []).map((ds: any, idx: number) => ({
    text: String(ds.label || ''),
    strokeStyle: ds.borderColor || ds.backgroundColor || '#999',
    hidden: chart?.getDatasetMeta(idx).hidden,
    index: idx
  }));
  const allowed = new Set(['90th percentile','75th percentile','Median Spending','25th percentile','10th percentile']);
  const filtered = items.filter(i => allowed.has(i.text));
  for (const it of filtered) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium transition-colors ${it.hidden ? 'opacity-50' : ''}`;
    const dot = document.createElement('span');
    dot.className = 'inline-block w-3 h-3 rounded-full';
    (dot as any).style = `background:${it.strokeStyle}`;
    const label = document.createElement('span');
    label.textContent = it.text;
    btn.appendChild(dot);
    btn.appendChild(label);
    btn.onclick = () => {
      const meta = chart!.getDatasetMeta(it.index);
      meta.hidden = meta.hidden === null ? true : !meta.hidden;
      chart!.update();
      renderHtmlLegend();
    };
    container.appendChild(btn);
  }
}

function buildChart() {
  if (!canvasRef.value || !props.results) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  if (chart) { chart.destroy(); chart = null; }

  const spend = (props.results.spendingPolicy as number[][] | undefined) ?? []; // [sim][year] amounts
  const Y = years.value;
  
  // If no spending data, don't render the chart
  if (Y < 1 || !spend.length) return;
  
  // Debug logging
  console.log('Spending chart debug:');
  console.log('Y (spending years):', Y);
  console.log('yearLabels:', props.results?.yearLabels);
  console.log('yearLabels length:', props.results?.yearLabels?.length);
  console.log('spendingPolicy data:', props.results?.spendingPolicy);
  console.log('spendingPolicy length:', props.results?.spendingPolicy?.length);
  if (props.results?.spendingPolicy?.length > 0) {
    console.log('First spending path:', props.results.spendingPolicy[0]);
    console.log('Second spending path:', props.results.spendingPolicy[1]);
    
    // Check the actual values
    const firstPath = Array.from(props.results.spendingPolicy[0]);
    const secondPath = Array.from(props.results.spendingPolicy[1]);
    console.log('First path (array):', firstPath);
    console.log('Second path (array):', secondPath);
  }

  // Compute per-year percentiles on absolute spending amounts
  const median = Array.from({ length: Y }, (_, i) => percentile(spend.map(s => s[i]), 50));
  const p10 = Array.from({ length: Y }, (_, i) => percentile(spend.map(s => s[i]), 10));
  const p25 = Array.from({ length: Y }, (_, i) => percentile(spend.map(s => s[i]), 25));
  const p75 = Array.from({ length: Y }, (_, i) => percentile(spend.map(s => s[i]), 75));
  const p90 = Array.from({ length: Y }, (_, i) => percentile(spend.map(s => s[i]), 90));

  console.log('Spending Percentiles:', {
    median,
    p10,
    p25,
    p75,
    p90,
  });
  
  // Log the values being used for percentile calculation for year 2 (index 1)
  if (Y > 1) {
    const year2Values = spend.map(s => s[1]);
    console.log('Year 2 spending values (first 10):', year2Values.slice(0, 10));
    console.log('Year 2 spending - Min:', Math.min(...year2Values), 'Max:', Math.max(...year2Values));
  }

  const labels = (props.results?.yearLabels && props.results.yearLabels.length > Y)
    ? props.results.yearLabels.slice(0, Y) // Take first Y years for spending (spending happens during each year)
    : (props.results?.yearLabels && props.results.yearLabels.length === Y)
    ? props.results.yearLabels
    : Array.from({ length: Y }, (_, i) => `Year ${i + 1}`);
    
  console.log('Final labels for spending chart:', labels);

  const datasets: any[] = [
    { label: '90th percentile', data: p90, borderColor: '#15803D', borderWidth: 1.5, borderDash: [6,4], pointRadius: 0, fill: false, tension: 0.35 },
    { label: '75th percentile', data: p75, borderColor: '#16A34A', backgroundColor: 'rgba(22,163,74,0.05)', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.35 },
    { label: 'Median Spending', data: median, borderColor: '#0EA5E9', backgroundColor: 'rgba(14,165,233,0.1)', borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0.35 },
    { label: '25th percentile', data: p25, borderColor: '#DC2626', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.35 },
    { label: '10th percentile', data: p10, borderColor: '#B91C1C', borderWidth: 1.5, borderDash: [6,4], pointRadius: 0, fill: false, tension: 0.35 },
  ];

  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    plugins: {
  legend: { display: false },
  tooltip: {
          mode: 'index', intersect: false,
          backgroundColor: 'rgba(255,255,255,0.95)', titleColor: '#1F2937', bodyColor: '#6B7280', borderColor: '#E5E7EB', borderWidth: 1,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatMoney(Number(ctx.parsed.y))}` }
        }
      },
      scales: {
  y: { title: { display: true, text: 'Total Organization Spending (USD)', color: '#6B7280', font: { size: 12 } }, ticks: { color: '#6B7280', font: { size: 10 }, callback: (v) => formatMoney(Number(v)) }, grid: { color: '#E5E7EB' } },
  x: { title: { display: true, text: (props.results?.yearLabels?.[0] && !props.results.yearLabels[0].startsWith('Year')) ? 'Calendar Year' : 'Year', color: '#6B7280', font: { size: 12 } }, ticks: { color: '#6B7280', font: { size: 10 } }, grid: { display: false } },
      },
      interaction: { mode: 'index', intersect: false },
    }
  });

  renderHtmlLegend();
}

onMounted(buildChart);
onBeforeUnmount(() => { if (chart) chart.destroy(); });
watch(() => props.results, buildChart, { deep: true });
</script>

<template>
  <div class="p-6 bg-white border border-gray-200 rounded-xl shadow-lg h-128 mb-8" style="height: 360px;">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">Total Organization Spending Projection</h3>
    </div>
    <div ref="legendRef" class="flex flex-wrap gap-3 mb-2 text-gray-700"></div>
    <canvas ref="canvasRef"></canvas>
  </div>
</template>
