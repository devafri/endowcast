<script setup lang="ts">
// ... (ALL SCRIPT LOGIC RETAINED HERE) ...
import { computed } from 'vue';
import type { PropType } from 'vue';
import { percentile, calculateRiskMetrics } from '@/features/simulation/lib/analytics';

const props = defineProps({
  results: {
    type: Object as PropType<any>,
    required: true,
  },
});

function fmtMoney(n: number | undefined | null) {
  if (n == null || !isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function pct(n: number | undefined | null) {
  if (n == null || !isFinite(n)) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

function fmtPercent(n: number | undefined | null) {
  if (n == null || !isFinite(n)) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

const sims = computed<number[][]>(() => props.results?.simulations ?? []);
const portfolioReturns = computed<number[][]>(() => props.results?.portfolioReturns ?? []);
const spendingPolicy = computed<number[][] | undefined>(() => props.results?.spendingPolicy ?? props.results?.grants);
const inputs = computed(() => props.results?.inputs ?? {});

const initialEndowment = computed(() => {
  const v = props.results?.inputs?.initialEndowment ?? props.results?.inputs?.initialEndowment ?? NaN;
  return typeof v === 'number' ? v : NaN;
});

const years = computed(() => sims.value[0]?.length ?? props.results?.yearLabels?.length ?? 10);

const riskFreePct = computed(() => {
  const s = props.results?.summary?.riskFreeRate ?? props.results?.inputs?.riskFreeRate ?? 2; // percent or fraction
  return typeof s === 'number' && s > 1 ? s / 100 : (typeof s === 'number' ? s : 0.02);
});

const riskMetrics = computed(() => {
  const pre = props.results?.summary ?? props.results?.analytics;
  if (pre && (pre.tailRiskMetrics || pre.safeSpending80 || pre.principalLossProb)) return pre;
  if (!sims.value.length || !isFinite(initialEndowment.value)) return null;
  try {
    return calculateRiskMetrics(sims.value, initialEndowment.value, portfolioReturns.value, props.results?.benchmarks, spendingPolicy.value, initialEndowment.value, riskFreePct.value);
  } catch (e) {
    return null;
  }
});

const worst1Value = computed(() => {
  if (props.results?.summary?.worst1Pct != null) return props.results.summary.worst1Pct;
  if (!sims.value.length) return NaN;
  const yearsN = sims.value[0].length;
  const finals = sims.value.map(s => s[yearsN - 1]).filter(isFinite).sort((a, b) => a - b);
  return percentile(finals, 1);
});

const worst5Value = computed(() => {
  if (props.results?.summary?.worst5Pct != null) return props.results.summary.worst5Pct;
  if (!sims.value.length) return NaN;
  const yearsN = sims.value[0].length;
  const finals = sims.value.map(s => s[yearsN - 1]).filter(isFinite).sort((a, b) => a - b);
  return percentile(finals, 5);
});

const worst10Value = computed(() => {
  if (props.results?.summary?.worst10Pct != null) return props.results.summary.worst10Pct;
  if (!sims.value.length) return NaN;
  const yearsN = sims.value[0].length;
  const finals = sims.value.map(s => s[yearsN - 1]).filter(isFinite).sort((a, b) => a - b);
  return percentile(finals, 10);
});

const lossThresholds = computed(() => {
  // Use pre-computed loss thresholds from summary if available
  if (props.results?.summary?.lossThresholds?.length) {
    return (props.results.summary.lossThresholds as any[]).map(loss => ({
      label: loss.label,
      description: loss.label,
      threshold: loss.threshold,
      probability: loss.probability,
      lossCount: loss.count,
      totalSimulations: 5000 // Store tracks this
    }));
  }

  if (!sims.value.length || !isFinite(initialEndowment.value)) return [];

  const yearsN = sims.value[0].length;
  const finals = sims.value.map(s => s[yearsN - 1]);
  const totalSimulations = finals.length;

  const thresholds = [
    { label: '5%+ Loss', threshold: 0.95, description: 'Final < 95% of Initial' },
    { label: '10%+ Loss', threshold: 0.90, description: 'Final < 90% of Initial' },
    { label: '15%+ Loss', threshold: 0.85, description: 'Final < 85% of Initial' },
    { label: '20%+ Loss', threshold: 0.80, description: 'Final < 80% of Initial' },
    { label: '30%+ Loss', threshold: 0.70, description: 'Final < 70% of Initial' }
  ];

  return thresholds.map(({ label, threshold, description }) => {
    const thresholdValue = initialEndowment.value * threshold;
    const lossCount = finals.filter(v => v < thresholdValue).length;
    const probability = lossCount / totalSimulations;

    return {
      label,
      description,
      threshold: thresholdValue,
      probability,
      lossCount,
      totalSimulations
    };
  });
});

const inflationAdjustedPreservationFrac = computed(() => {
  // Use pre-computed value from summary (stored as percentage, convert back to fraction)
  if (props.results?.summary?.inflationPreservation != null) {
    return props.results.summary.inflationPreservation / 100;
  }

  if (!sims.value.length || !isFinite(initialEndowment.value)) return NaN;
  const finalValues = sims.value.map(sim => sim[sim.length - 1]);
  const medianFinal = percentile(finalValues, 50);
  const rfVal = props.results?.summary?.riskFreeRate ?? props.results?.inputs?.riskFreeRate ?? 2;
  const rfPct = isFinite(rfVal) ? rfVal : 2;
  const inflationRate = rfPct / 100;
  const inflationFactor = Math.pow(1 + inflationRate, years.value);
  const val = medianFinal / (initialEndowment.value * inflationFactor);
  return isFinite(val) ? val : NaN;
});

const strategicSustainableSpendRate = computed(() => {
  const currentRatePercent = inputs.value?.spendingPolicyRate;
  const preservation = inflationAdjustedPreservationFrac.value;

  if (!Number.isFinite(currentRatePercent) || !Number.isFinite(preservation)) {
    return NaN;
  }

  const currentRate = currentRatePercent / 100;

  if (preservation >= 1.02) {
    return Math.min(currentRate * 1.05, 0.075);
  } else if (preservation >= 1.00) {
    return Math.min(currentRate * 1.02, 0.07);
  } else if (preservation >= 0.98) {
    return currentRate;
  } else if (preservation >= 0.95) {
    return currentRate * 0.98;
  } else if (preservation >= 0.90) {
    return currentRate * 0.96;
  } else if (preservation >= 0.85) {
    return currentRate * 0.92;
  } else {
    return currentRate * 0.88;
  }
});

function getLossProbabilityColor(probability: number, threshold: string) {
  const thresholds: Record<string, { low: number; medium: number; high: number }> = {
    '5%+ Loss': { low: 0.10, medium: 0.25, high: 0.40 },
    '10%+ Loss': { low: 0.08, medium: 0.20, high: 0.35 },
    '15%+ Loss': { low: 0.06, medium: 0.15, high: 0.30 },
    '20%+ Loss': { low: 0.04, medium: 0.10, high: 0.25 },
    '30%+ Loss': { low: 0.02, medium: 0.06, high: 0.15 }
  };

  const ranges = thresholds[threshold] || thresholds['10%+ Loss'];

  if (probability < ranges.low) {
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (probability < ranges.medium) {
    return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  } else if (probability < ranges.high) {
    return 'text-orange-700 bg-orange-50 border-orange-200';
  } else {
    return 'text-red-700 bg-red-50 border-red-200';
  }
}

const riskAssessment = computed(() => {
  const preservation = inflationAdjustedPreservationFrac.value;
  const currentRate = inputs.value?.spendingPolicyRate / 100;
  const recommendedRate = strategicSustainableSpendRate.value;
  const lossProb10 = lossThresholds.value.find(loss => loss.label === '10%+ Loss')?.probability || 0;

  if (!Number.isFinite(preservation) || !Number.isFinite(recommendedRate)) {
    return null;
  }

  let preservationLevel, preservationColor, preservationInsight;
  if (preservation >= 1.05) {
    preservationLevel = 'Excellent';
    preservationColor = 'text-emerald-600 bg-emerald-50';
    preservationInsight = 'Endowment is growing in real terms, providing increased future spending capacity';
  } else if (preservation >= 1.00) {
    preservationLevel = 'Strong';
    preservationColor = 'text-green-600 bg-green-50';
    preservationInsight = 'Purchasing power fully maintained, sustainable for future generations';
  } else if (preservation >= 0.95) {
    preservationLevel = 'Moderate';
    preservationColor = 'text-yellow-600 bg-yellow-50';
    preservationInsight = 'Slight erosion of purchasing power; consider modest spending adjustments';
  } else if (preservation >= 0.90) {
    preservationLevel = 'Weak';
    preservationColor = 'text-orange-600 bg-orange-50';
    preservationInsight = 'Significant real-term erosion; spending policy may benefit from review';
  } else {
    preservationLevel = 'Critical';
    preservationColor = 'text-red-600 bg-red-50';
    preservationInsight = 'Significant purchasing power loss; spending policy review recommended';
  }

  const rateDifference = ((currentRate - recommendedRate) / currentRate) * 100;
  let sustainabilityLevel, sustainabilityColor, sustainabilityInsight;

  if (rateDifference <= -5) {
    sustainabilityLevel = 'Conservative';
    sustainabilityColor = 'text-emerald-600 bg-emerald-50';
    sustainabilityInsight = 'Spending below sustainable level; potential capacity for increased mission funding';
  } else if (rateDifference <= 0) {
    sustainabilityLevel = 'Sustainable';
    sustainabilityColor = 'text-green-600 bg-green-50';
    sustainabilityInsight = 'Spending appears aligned with long-term sustainability goals';
  } else if (rateDifference <= 10) {
    sustainabilityLevel = 'Moderately High';
    sustainabilityColor = 'text-yellow-600 bg-yellow-50';
    sustainabilityInsight = 'Spending slightly above sustainable level; may wish to monitor closely';
  } else if (rateDifference <= 25) {
    sustainabilityLevel = 'Potentially Unsustainable';
    sustainabilityColor = 'text-orange-600 bg-orange-50';
    sustainabilityInsight = 'Spending meaningfully above sustainable level; could consider adjustments';
  } else {
    sustainabilityLevel = 'Unsustainable';
    sustainabilityColor = 'text-red-600 bg-red-50';
    sustainabilityInsight = 'Spending significantly above sustainable level; policy review may be warranted';
  }

  let overallRisk, overallColor, riskInsight, strategicConsiderations;

  if (preservation >= 0.95 && rateDifference <= 5 && lossProb10 < 0.15) {
    overallRisk = 'Low Risk';
    overallColor = 'text-emerald-600 bg-emerald-50';
    riskInsight = 'Endowment appears well-positioned for long-term sustainability';
    strategicConsiderations = [
      'Current spending policy may be maintained',
      'Regular monitoring recommended to sustain current position'
    ];
  } else if (preservation >= 0.90 && rateDifference <= 15 && lossProb10 < 0.25) {
    overallRisk = 'Moderate Risk';
    overallColor = 'text-yellow-600 bg-yellow-50';
    riskInsight = 'Some risk factors present that may benefit from attention';
    strategicConsiderations = [
      'Could consider modest spending adjustment to improve sustainability',
      'Investment strategy review may enhance long-term outcomes',
      'More frequent monitoring might provide better risk management'
    ];
  } else if (preservation >= 0.80 && rateDifference <= 30 && lossProb10 < 0.40) {
    overallRisk = 'High Risk';
    overallColor = 'text-orange-600 bg-orange-50';
    riskInsight = 'Multiple risk factors suggest potential sustainability challenges';
    strategicConsiderations = [
      'Spending reduction could improve long-term preservation',
      'Comprehensive strategy review may identify improvement opportunities',
      'Developing contingency plans might provide risk mitigation'
    ];
  } else {
    overallRisk = 'Critical Risk';
    overallColor = 'text-red-600 bg-red-50';
    riskInsight = 'Current trajectory may benefit from immediate attention';
    strategicConsiderations = [
      'Spending policy review could help preserve endowment viability',
      'Board discussion of strategic options may be valuable',
      'Comprehensive analysis of alternative approaches recommended'
    ];
  }

  return {
    preservation: { level: preservationLevel, color: preservationColor, insight: preservationInsight, value: preservation },
    sustainability: { level: sustainabilityLevel, color: sustainabilityColor, insight: sustainabilityInsight },
    overall: { level: overallRisk, color: overallColor, insight: riskInsight, strategicConsiderations },
    metrics: { lossProb10 }
  };
});

// The rest of the computed properties and functions are unchanged.
const averageDepletionMagnitude = computed(() => {
  if (!sims.value.length || !isFinite(initialEndowment.value)) return NaN;
  const yearsN = sims.value[0].length;
  const finals = sims.value.map(s => s[yearsN - 1]);
  const shortfalls = finals.filter(v => v < initialEndowment.value).map(v => initialEndowment.value - v);
  if (!shortfalls.length) return 0;
  const sum = shortfalls.reduce((a, b) => a + b, 0);
  return sum / shortfalls.length;
});

const depletionMagnitudeRange = computed(() => {
  if (!sims.value.length || !isFinite(initialEndowment.value)) return { p25: NaN, p75: NaN };
  const yearsN = sims.value[0].length;
  const finals = sims.value.map(s => s[yearsN - 1]);
  const shortfalls = finals.filter(v => v < initialEndowment.value).map(v => initialEndowment.value - v).sort((a, b) => a - b);
  if (shortfalls.length < 4) return { p25: NaN, p75: NaN };
  const p25 = percentile(shortfalls, 25);
  const p75 = percentile(shortfalls, 75);
  return { p25, p75 };
});

function getBorderColor(probability: number): string {
  if (!Number.isFinite(probability)) return 'bg-slate-300';
  if (probability <= 0.1) return 'bg-emerald-400';
  if (probability <= 0.2) return 'bg-yellow-400';
  if (probability <= 0.3) return 'bg-orange-400';
  return 'bg-red-400';
}

function getTextColor(probability: number): string {
  if (!Number.isFinite(probability)) return 'text-slate-800';
  if (probability <= 0.1) return 'text-emerald-700';
  if (probability <= 0.2) return 'text-yellow-700';
  if (probability <= 0.3) return 'text-orange-700';
  return 'text-red-700';
}
</script>

<template>
  <div class="bg-white border border-slate-100 rounded-xl shadow-lg p-6"> 
    
    <div class="text-center mb-8"> 
      <h3 class="text-2xl font-bold text-slate-800 mb-1">Endowment Risk & Sustainability Analysis</h3> 
      <p class="text-sm text-slate-500">Comprehensive assessment of long-term endowment preservation and spending policy sustainability</p> 
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <div class="space-y-8">
        
        <div>
          <h4 class="font-semibold text-slate-700 mb-4 text-base">Key Sustainability Metrics</h4>
          <div class="grid grid-cols-2 gap-4"> 
            
            <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm">
              <div class="text-xs text-slate-600 mb-2 flex justify-between items-center">
                Inflation-Adjusted Preservation
                <div class="relative group cursor-help">
                  <span class="text-xs text-slate-400 font-bold ml-1">i</span>
                  <div class="absolute z-10 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-10 -ml-40 whitespace-normal">
                    The expected value of the endowment at the end of the time period, adjusted for the loss of purchasing power due to inflation. **A value above 100% means the fund is expected to keep up with inflation.**
                  </div>
                </div>
                </div>
              <div class="text-2xl font-extrabold tabnums text-emerald-700">
                {{ Number.isFinite(inflationAdjustedPreservationFrac) ? pct(inflationAdjustedPreservationFrac) : '—' }}
              </div>
            </div>

            <div class="p-4 bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
              <div class="text-xs text-slate-600 mb-2 flex justify-between items-center">
                Sustainable Spend Rate
                <div class="relative group cursor-help">
                  <span class="text-xs text-slate-400 font-bold ml-1">i</span>
                  <div class="absolute z-10 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-10 -ml-40 whitespace-normal">
                    The highest percentage the endowment can reliably spend each year while maintaining its purchasing power over the long term. **This is your maximum sustainable spending.**
                  </div>
                </div>
                </div>
              <div class="text-2xl font-extrabold tabnums text-blue-700">
                {{ Number.isFinite(strategicSustainableSpendRate) ? fmtPercent(strategicSustainableSpendRate) : '—' }}
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
              <div class="text-xs text-slate-600 mb-2 flex justify-between items-center">
                Current Spend Rate
                <div class="relative group cursor-help">
                  <span class="text-xs text-slate-400 font-bold ml-1">i</span>
                  <div class="absolute z-10 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-10 -ml-40 whitespace-normal">
                    The spending percentage currently being used in this simulation. **This is compared to the Recommended Spend Rate to assess sustainability.**
                  </div>
                </div>
                </div>
              <div class="text-2xl font-bold tabnums text-slate-700">
                {{ Number.isFinite(inputs.spendingPolicyRate) ? `${inputs.spendingPolicyRate}%` : '—' }}
              </div>
            </div>

            <div class="p-4 bg-yellow-50 rounded-xl border border-yellow-200 shadow-sm">
              <div class="text-xs text-slate-600 mb-2 flex justify-between items-center">
                Worst 10% Scenario Value
                <div class="relative group cursor-help">
                  <span class="text-xs text-slate-400 font-bold ml-1">i</span>
                  <div class="absolute z-10 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-10 -ml-40 whitespace-normal">
                    The lowest endowment value you would see at the end of the period in the **worst 10% of all simulated outcomes**.
                  </div>
                </div>
                </div>
              <div class="text-2xl font-bold tabnums text-yellow-700">
                {{ Number.isFinite(worst10Value) ? fmtMoney(worst10Value) : '—' }}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 class="font-semibold text-slate-700 text-base mb-4 flex items-center">
            Probability of Principal Loss
            <div class="relative group cursor-help">
                <span class="text-xs text-slate-400 font-bold ml-2">i</span>
                <div class="absolute z-10 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-10 -ml-40 whitespace-normal">
                    The chance, based on thousands of scenarios, that the endowment's final value (in today's dollars) will be below a certain percentage of its initial size.
                </div>
            </div>
            </h4>

          <div class="flex items-center gap-4 text-xs text-slate-500 mb-4">
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 bg-emerald-400 rounded-full"></div>
              <span>Low (&lt;10%)</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span>Moderate</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 bg-orange-400 rounded-full"></div>
              <span>High</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="w-3 h-3 bg-red-400 rounded-full"></div>
              <span>Critical (&gt;30%)</span>
            </div>
          </div>

          <div class="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
            <table class="w-full text-sm">
              <thead class="bg-slate-50">
                <tr>
                  <th class="text-left py-3 px-3 text-xs font-semibold text-slate-600">Loss Threshold</th>
                  <th class="text-right py-3 px-3 text-xs font-semibold text-slate-600">Probability</th>
                  <th class="text-right py-3 px-3 text-xs font-semibold text-slate-600">Simulations</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="loss in lossThresholds"
                  :key="loss.label"
                  class="border-t border-slate-100 hover:bg-blue-50/50 transition-colors"
                >
                  <td class="py-2.5 px-3 font-medium text-slate-700 relative">
                    {{ loss.label }}
                    <div class="absolute left-0 top-0 bottom-0 w-1" :class="getBorderColor(loss.probability)"></div>
                  </td>
                  <td class="py-2.5 px-3 text-right font-bold tabnums" :class="getTextColor(loss.probability)">
                    {{ Number.isFinite(loss.probability) ? pct(loss.probability) : '—' }}
                  </td>
                  <td class="py-2.5 px-3 text-right text-slate-500 tabnums">
                    {{ loss.lossCount }}/{{ loss.totalSimulations }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="space-y-8">
        
        <div>
          <h4 class="font-semibold text-slate-700 text-base mb-4">Risk Assessment Summary</h4>
          <div class="space-y-4">

            <div class="p-4 rounded-lg border-2 shadow-md" :class="riskAssessment?.overall.color.split(' ')[1].replace('bg', 'border')"> 
              <div class="flex justify-between items-center">
                <span class="font-medium text-slate-700">Overall Risk Level</span>
                <span class="text-sm font-bold px-3 py-1 rounded-full" :class="riskAssessment?.overall.color">
                  {{ riskAssessment?.overall.level }}
                </span>
              </div>
              <p class="text-xs text-slate-600 mt-2">{{ riskAssessment?.overall.insight }}</p>
            </div>

            <div class="flex justify-between items-center p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
              <span class="text-sm font-medium text-slate-700 flex items-center">
                Preservation Strength
                <div class="relative group cursor-help">
                  <span class="text-xs text-slate-400 font-bold ml-2">i</span>
                  <div class="absolute z-10 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-10 -ml-40 whitespace-normal">
                    An assessment of how likely the endowment is to maintain its original spending power over time, after adjusting for inflation.
                  </div>
                </div>
                </span>
              <span class="text-sm font-semibold px-3 py-1 rounded-full" :class="riskAssessment?.preservation.color.split(' ')[0]">
                {{ riskAssessment?.preservation.level }}
              </span>
            </div>

            <div class="flex justify-between items-center p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
              <span class="text-sm font-medium text-slate-700 flex items-center">
                Spending Sustainability
                <div class="relative group cursor-help">
                  <span class="text-xs text-slate-400 font-bold ml-2">i</span>
                  <div class="absolute z-10 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-10 -ml-40 whitespace-normal">
                    A rating of whether the current spending rate is higher or lower than the calculated Recommended Spend Rate.
                  </div>
                </div>
                </span>
              <span class="text-sm font-semibold px-3 py-1 rounded-full" :class="riskAssessment?.sustainability.color.split(' ')[0]">
                {{ riskAssessment?.sustainability.level }}
              </span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 class="font-semibold text-slate-700 mb-4 text-base">Worst-Case Scenario Values</h4>
          <div class="space-y-3">
            
            <div class="p-4 rounded-lg bg-red-50 border border-red-200 shadow-sm">
              <div class="flex justify-between items-center">
                <span class="font-medium text-slate-700 flex items-center">
                  Worst 1% Outcome (Value at Risk)
                  <div class="relative group cursor-help">
                    <span class="text-xs text-slate-400 font-bold ml-2">i</span>
                    <div class="absolute z-10 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-10 -ml-40 whitespace-normal">
                      The lowest endowment value you would see at the end of the period in the **worst 1% of all simulated outcomes**. This represents severe downside risk.
                    </div>
                  </div>
                  </span>
                <span class="font-extrabold text-red-700 text-lg tabnums">{{ Number.isFinite(worst1Value) ? fmtMoney(worst1Value) : '—' }}</span>
              </div>
            </div>

            <div class="p-4 rounded-lg bg-orange-50 border border-orange-200 shadow-sm">
              <div class="flex justify-between items-center">
                <span class="font-medium text-slate-700 flex items-center">
                  Worst 5% Outcome
                  <div class="relative group cursor-help">
                    <span class="text-xs text-slate-400 font-bold ml-2">i</span>
                    <div class="absolute z-10 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-10 -ml-40 whitespace-normal">
                      The lowest endowment value you would see at the end of the period in the **worst 5% of all simulated outcomes**. This represents high downside risk.
                    </div>
                  </div>
                  </span>
                <span class="font-extrabold text-orange-700 text-lg tabnums">{{ Number.isFinite(worst5Value) ? fmtMoney(worst5Value) : '—' }}</span>
              </div>
            </div>

            <div class="p-4 rounded-lg bg-yellow-50 border border-yellow-200 shadow-sm">
              <div class="flex justify-between items-center">
                <span class="font-medium text-slate-700 flex items-center">
                  Worst 10% Outcome
                  <div class="relative group cursor-help">
                    <span class="text-xs text-slate-400 font-bold ml-2">i</span>
                    <div class="absolute z-10 hidden group-hover:block w-64 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-10 -ml-40 whitespace-normal">
                      The lowest endowment value you would see at the end of the period in the **worst 10% of all simulated outcomes**. This represents moderate downside risk.
                    </div>
                  </div>
                  </span>
                <span class="font-extrabold text-yellow-700 text-lg tabnums">{{ Number.isFinite(worst10Value) ? fmtMoney(worst10Value) : '—' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 class="font-semibold text-slate-700 mb-4 text-base">Strategic Considerations</h4>
          <ul class="text-sm text-slate-700 space-y-3">
            <li
              v-for="(consideration, index) in riskAssessment?.overall.strategicConsiderations"
              :key="index"
              class="flex items-start p-3 rounded-lg bg-blue-50 border border-blue-100 shadow-sm"
            >
              <span class="text-blue-500 mr-3 mt-0.5">•</span>
              <span class="flex-1 text-sm">{{ consideration }}</span>
            </li>
          </ul>
          <div class="mt-4 pt-4 border-t border-slate-200">
            <p class="text-xs text-slate-500 italic">
              These considerations are advisory in nature. Final decisions should be based on comprehensive analysis of institutional goals, risk tolerance, and strategic priorities.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>