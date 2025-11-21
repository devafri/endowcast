<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend);

interface ComparisonScenario {
  id: string;
  name: string;
  result?: any;
}

const props = defineProps<{ 
  scenarios: ComparisonScenario[];
  baselineId?: string | null;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const legendRef = ref<HTMLElement | null>(null);
let chart: Chart | null = null;

// Colors for up to 4 scenarios
const SCENARIO_COLORS = [
  { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },  // Blue
  { border: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },  // Green
  { border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },  // Amber
  { border: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' }   // Purple
];

const hasData = computed(() => {
  return props.scenarios.some(s => s.result?.summary?.percentileBands);
});

function formatMoney(num: number): string {
  if (!isFinite(num)) return '-';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function renderHtmlLegend() {
  if (!legendRef.value || !chart) return;
  const container = legendRef.value;
  container.innerHTML = '';

  const items = (chart.data.datasets || [])
    .map((ds: any, idx: number) => ({
      text: String(ds.label || ''),
      color: ds.borderColor || '#999',
      hidden: chart?.getDatasetMeta(idx).hidden,
      index: idx,
      isBaseline: ds.isBaseline || false
    }));

  for (const it of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
      it.hidden ? 'opacity-40' : 'opacity-100'
    } hover:bg-gray-100`;
    
    const dot = document.createElement('span');
    dot.className = 'inline-block w-3 h-3 rounded-full';
    (dot as any).style = `background:${it.color}`;
    
    const label = document.createElement('span');
    label.textContent = it.text;
    
    btn.appendChild(dot);
    btn.appendChild(label);
    
    if (it.isBaseline) {
      const badge = document.createElement('span');
      badge.className = 'ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded';
      badge.textContent = 'Baseline';
      btn.appendChild(badge);
    }
    
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
  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  if (chart) { chart.destroy(); chart = null; }

  const datasets: any[] = [];

  // Process each scenario
  props.scenarios.forEach((scenario, index) => {
    const bands = scenario.result?.summary?.percentileBands;
    if (!bands) return;

    const { percentile10, percentile25, percentile50, percentile75, percentile90 } = bands;
    const years = percentile50?.length || 0;
    if (!years) return;
    
    const color = SCENARIO_COLORS[index % SCENARIO_COLORS.length];
    const isBaseline = scenario.id === props.baselineId;
    
    // Add 10th percentile (lower bound) - hidden by default
    datasets.push({
      label: `${scenario.name} (10th)`,
      data: percentile10,
      borderColor: color.border,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [5, 3],
      pointRadius: 0,
      fill: false,
      hidden: true,
      tension: 0.4,
      scenarioId: scenario.id
    });

    // Add 25th percentile - hidden by default
    datasets.push({
      label: `${scenario.name} (25th)`,
      data: percentile25,
      borderColor: color.border,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [3, 2],
      pointRadius: 0,
      fill: false,
      hidden: true,
      tension: 0.4,
      scenarioId: scenario.id
    });
    
    // Add median (main line) - visible by default
    datasets.push({
      label: scenario.name,
      data: percentile50,
      borderColor: color.border,
      backgroundColor: color.bg,
      borderWidth: isBaseline ? 3 : 2,
      pointRadius: 0,
      fill: '+2', // Fill to 75th percentile
      tension: 0.4,
      scenarioId: scenario.id,
      isBaseline
    });

    // Add 75th percentile - hidden by default
    datasets.push({
      label: `${scenario.name} (75th)`,
      data: percentile75,
      borderColor: color.border,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [3, 2],
      pointRadius: 0,
      fill: false,
      hidden: true,
      tension: 0.4,
      scenarioId: scenario.id
    });
    
    // Add 90th percentile (upper bound) - hidden by default
    datasets.push({
      label: `${scenario.name} (90th)`,
      data: percentile90,
      borderColor: color.border,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderDash: [5, 3],
      pointRadius: 0,
      fill: false,
      hidden: true,
      tension: 0.4,
      scenarioId: scenario.id
    });
  });

  if (!datasets.length) return;

  const years = datasets[2]?.data?.length || 0; // Use median dataset for year count
  const labels = Array.from({ length: years }, (_, i) => `Year ${i}`);

  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = formatMoney(context.parsed.y);
              return `${label}: ${value}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => formatMoney(Number(val))
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });

  renderHtmlLegend();
}

watch(() => props.scenarios, () => {
  buildChart();
}, { deep: true });

onMounted(() => {
  buildChart();
});

onBeforeUnmount(() => {
  if (chart) {
    chart.destroy();
    chart = null;
  }
});
</script>

<template>
  <div class="comparison-chart">
    <div v-if="!hasData" class="flex items-center justify-center h-48 bg-gray-50 rounded border border-gray-200">
      <p class="text-sm text-gray-500">No chart data available. Run comparison to load scenarios.</p>
    </div>
    
    <div v-else class="chart-container">
      <div class="mb-3">
        <h4 class="text-sm font-semibold text-gray-700 mb-2">Endowment Value Over Time</h4>
        <div ref="legendRef" class="flex flex-wrap gap-2"></div>
      </div>
      
      <div class="chart-canvas-wrapper">
        <canvas ref="canvasRef"></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-canvas-wrapper {
  position: relative;
  height: 300px;
  width: 100%;
}

.comparison-chart {
  width: 100%;
}
</style>
