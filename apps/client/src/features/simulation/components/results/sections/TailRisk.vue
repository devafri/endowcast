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

const inflationPercent = computed(() => {
  const summaryInfl = props.results?.summary?.inflationRate;
  const inputInfl = props.results?.inputs?.inflationRate;
  const fallback = props.results?.summary?.riskFreeRate ?? props.results?.inputs?.riskFreeRate ?? 2;
  const candidate = summaryInfl != null ? summaryInfl : (inputInfl != null ? inputInfl : fallback);
  return typeof candidate === 'number' && isFinite(candidate) ? candidate : 2;
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
  const inflPct = inflationPercent.value;
  const inflationRate = (isFinite(inflPct) ? inflPct : 2) / 100;
  const inflationFactor = Math.pow(1 + inflationRate, years.value);
  const val = medianFinal / (initialEndowment.value * inflationFactor);
  return isFinite(val) ? val : NaN;
});

const strategicSustainableSpendRate = computed(() => {
  // Calculate sustainable spend rate using institutional endowment methodology
  // Based on real expected returns with prudent adjustments for risk
  // This is completely independent of simulation outcomes to avoid feedback loops
  
  const allocationData = inputs.value?.portfolioWeights || props.results?.summary?.allocationPolicy;
  // Raw inputs may appear in either percent form (e.g. 2) or already scaled (e.g. 0.02) depending on history normalization.
  // Normalize so we always work with PERCENT units for return arithmetic, then convert to decimal only once at the end.
  const inflationPctRaw = inflationPercent.value;
  const invExpensePctRaw = inputs.value?.investmentExpenseRate ?? 1; // Stored as percent in inputs

  // If an upstream normalization multiplied by 100 erroneously we can detect extreme values (> 50%) and scale back.
  // Realistic long‑term inflation and investment expense assumptions rarely exceed these thresholds.
  const inflationPct = inflationPctRaw > 50 ? inflationPctRaw / 100 : inflationPctRaw;
  const invExpensePct = invExpensePctRaw > 25 ? invExpensePctRaw / 100 : invExpensePctRaw;

  if (!allocationData) {
    return NaN;
  }

  // Historical long-term expected returns and volatilities for each asset class
  // Based on institutional investment research (e.g., Callan, Cambridge Associates)
  const assetMetrics: Record<string, { return: number; volatility: number }> = {
    // Legacy names (for backwards compatibility)
    'US Equity': { return: 9.5, volatility: 18.0 },
    'International Equity': { return: 9.0, volatility: 20.0 },
    'Emerging Markets': { return: 10.5, volatility: 25.0 },
    'Fixed Income': { return: 4.5, volatility: 5.0 },
    'Real Estate': { return: 8.0, volatility: 15.0 },
    'Commodities': { return: 6.5, volatility: 20.0 },
    'Cash': { return: 2.5, volatility: 1.0 },
    
    // Current allocation names
    'publicEquity': { return: 9.0, volatility: 17.0 },
    'privateEquity': { return: 11.5, volatility: 24.0 },
    'publicFixedIncome': { return: 4.5, volatility: 5.5 },
    'privateCredit': { return: 7.0, volatility: 9.0 },
    'realAssets': { return: 8.5, volatility: 16.0 },
    'diversifying': { return: 7.5, volatility: 12.0 },
    'cash': { return: 2.5, volatility: 1.0 },
  };

  // Calculate portfolio expected return and volatility
  let expectedReturn = 0;
  let portfolioVariance = 0;
  const allocationBreakdown: Array<{ asset: string; weight: number; expectedReturn: number; volatility: number }> = [];
  
  for (const [assetClass, weightOrConfig] of Object.entries(allocationData)) {
    const metrics = assetMetrics[assetClass] ?? { return: 7.0, volatility: 15.0 };
    
    // Handle both direct weights and config objects with 'default' property
    let weightNum: number;
    if (typeof weightOrConfig === 'number') {
      weightNum = weightOrConfig;
    } else if (typeof weightOrConfig === 'object' && weightOrConfig !== null && 'default' in weightOrConfig) {
      weightNum = typeof weightOrConfig.default === 'number' ? weightOrConfig.default : 0;
    } else {
      weightNum = parseFloat(String(weightOrConfig)) || 0;
    }
    
    const weightFrac = weightNum / 100;
    
    if (weightNum > 0) {
      allocationBreakdown.push({
        asset: assetClass,
        weight: weightNum,
        expectedReturn: metrics.return,
        volatility: metrics.volatility
      });
    }
    
    expectedReturn += weightFrac * metrics.return;
    // Simplified variance calculation (assumes 0.3 average correlation between asset classes)
    portfolioVariance += Math.pow(weightFrac * metrics.volatility, 2);
  }
  
  const portfolioVolatility = Math.sqrt(portfolioVariance);

  // Debug logging
  if (allocationBreakdown.length > 0) {
    console.log('=== Portfolio-Sustainable Rate Calculation ===');
    console.log('Current Allocation:');
    allocationBreakdown.forEach(item => {
      console.log(`  ${item.asset}: ${item.weight}% (Expected: ${item.expectedReturn}%, Vol: ${item.volatility}%)`);
    });
    console.log(`\nPortfolio Expected Return: ${expectedReturn.toFixed(2)}%`);
    console.log(`Portfolio Volatility: ${portfolioVolatility.toFixed(2)}%`);
  }

  // Step 1: Convert arithmetic return to geometric (accounts for volatility drag)
  // Geometric return ≈ Arithmetic return - (σ²/2)
  const volatilityDragPct = Math.pow(portfolioVolatility, 2) / 200; // Divide by 200 to convert to percentage
  const geometricReturn = expectedReturn - volatilityDragPct;

  // Step 2: Calculate real expected return after inflation and fees (all in percent space)
  const realGeometricReturn = geometricReturn - inflationPct - invExpensePct;

  // Step 3: Apply prudent discount based on portfolio risk
  // Higher volatility = more conservative spending (protects against sequence risk)
  // This is the institutional approach: spend a fraction of expected real return
  let riskAdjustmentFactor: number;
  
  if (portfolioVolatility < 8) {
    // Low risk portfolio (e.g., mostly bonds): can spend ~95% of real return
    riskAdjustmentFactor = 0.95;
  } else if (portfolioVolatility < 12) {
    // Conservative balanced portfolio: spend ~90% of real return
    riskAdjustmentFactor = 0.90;
  } else if (portfolioVolatility < 16) {
    // Moderate portfolio (typical endowment): spend ~85% of real return
    riskAdjustmentFactor = 0.85;
  } else if (portfolioVolatility < 20) {
    // Aggressive portfolio: spend ~80% of real return
    riskAdjustmentFactor = 0.80;
  } else {
    // Very aggressive portfolio: spend ~75% of real return
    riskAdjustmentFactor = 0.75;
  }

  // Calculate sustainable rate
  let sustainableRate = (realGeometricReturn / 100) * riskAdjustmentFactor;

  // If real expected return is negative, sustainable spending should not force a floor that hides risk.
  if (realGeometricReturn <= 0) {
    sustainableRate = 0; // Will be clamped upwards to the institutional minimum later, but we preserve log accuracy.
  }

  // Debug logging continued
  console.log(`\nVolatility Drag: -${volatilityDragPct.toFixed(2)}%`);
  console.log(`Geometric Return: ${geometricReturn.toFixed(2)}%`);
  console.log(`Less Inflation: -${inflationPct.toFixed(2)}% (raw: ${inflationPctRaw})`);
  console.log(`Less Inv. Fees: -${invExpensePct.toFixed(2)}% (raw: ${invExpensePctRaw})`);
  console.log(`Real Geometric Return: ${realGeometricReturn.toFixed(2)}%`);
  console.log(`\nRisk Adjustment Factor: ${(riskAdjustmentFactor * 100).toFixed(0)}% (based on ${portfolioVolatility.toFixed(1)}% volatility)`);
  console.log(`\nPortfolio-Sustainable Rate: ${(sustainableRate * 100).toFixed(2)}%`);
  console.log('=====================================\n');

  // Ensure reasonable bounds for institutional investors (2% - 7%)
  // 2% minimum ensures foundation can operate
  // 7% maximum prevents excessive drawdown
  sustainableRate = Math.max(0.02, Math.min(0.07, sustainableRate));

  return sustainableRate;
});

// Calculate effective spending rate based on actual spending vs endowment value
const effectiveSpendRate = computed(() => {
  if (!sims.value.length || !spendingPolicy.value?.length) return NaN;
  
  // Get median spending and endowment values for each year
  const yearsN = years.value;
  const effectiveRates: number[] = [];
  
  for (let year = 0; year < yearsN; year++) {
    const endowmentValues = sims.value.map(s => s[year]).filter(isFinite);
    const spendingValues = spendingPolicy.value.map(s => s[year]).filter(isFinite);
    
    if (endowmentValues.length > 0 && spendingValues.length > 0) {
      // Calculate median for this year
      const medianEndowment = percentile(endowmentValues, 50);
      const medianSpending = percentile(spendingValues, 50);
      
      if (medianEndowment > 0) {
        const rate = (medianSpending / medianEndowment);
        effectiveRates.push(rate);
      }
    }
  }
  
  // Return average effective rate across all years
  if (effectiveRates.length === 0) return NaN;
  return effectiveRates.reduce((a, b) => a + b, 0) / effectiveRates.length;
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

  const rateDifference = ((currentRate - recommendedRate) / recommendedRate) * 100;
  let sustainabilityLevel, sustainabilityColor, sustainabilityInsight;

  // More nuanced assessment that distinguishes between different foundation types
  if (rateDifference <= 0) {
    sustainabilityLevel = 'Conservative';
    sustainabilityColor = 'text-emerald-600 bg-emerald-50';
    sustainabilityInsight = 'Spending at or below portfolio-sustainable level; strong capital preservation expected with high confidence of perpetual endowment';
  } else if (rateDifference <= 10) {
    sustainabilityLevel = 'Sustainable';
    sustainabilityColor = 'text-green-600 bg-green-50';
    sustainabilityInsight = 'Spending moderately above portfolio-sustainable rate; manageable for perpetual endowments with disciplined governance and potential for modest additional revenue';
  } else if (rateDifference <= 25) {
    sustainabilityLevel = 'Elevated Risk';
    sustainabilityColor = 'text-yellow-600 bg-yellow-50';
    sustainabilityInsight = 'Spending notably above portfolio-sustainable level; requires either sustained above-average returns, supplemental revenue, or acceptance of gradual capital erosion';
  } else if (rateDifference <= 45) {
    sustainabilityLevel = 'High Risk';
    sustainabilityColor = 'text-orange-600 bg-orange-50';
    sustainabilityInsight = 'Spending significantly above portfolio-sustainable level; for perpetual endowments without fundraising, this trajectory risks long-term capital depletion absent exceptional investment performance';
  } else {
    sustainabilityLevel = 'Unsustainable';
    sustainabilityColor = 'text-red-600 bg-red-50';
    sustainabilityInsight = 'Spending well above portfolio-sustainable level; current rate cannot be maintained in perpetuity without substantial supplemental revenue or willingness to deplete capital over time';
  }

  let overallRisk, overallColor, riskInsight, strategicConsiderations;

  // Calculate effective vs policy rate variance
  const effectiveRate = effectiveSpendRate.value;
  const policyRate = inputs.value.spendingPolicyRate;
  const rateVariance = Number.isFinite(effectiveRate) && Number.isFinite(policyRate) 
    ? Math.abs(effectiveRate - policyRate) 
    : 0;
  const hasSignificantVariance = rateVariance > 0.5; // 0.5% threshold

  if (preservation >= 0.95 && rateDifference <= 5 && lossProb10 < 0.15) {
    overallRisk = 'Low Risk';
    overallColor = 'text-emerald-600 bg-emerald-50';
    riskInsight = 'Endowment appears well-positioned for long-term sustainability';
    strategicConsiderations = [
      'Current spending policy may be maintained',
      'Regular monitoring recommended to sustain current position'
    ];
    if (hasSignificantVariance) {
      strategicConsiderations.push(
        effectiveRate > policyRate 
          ? `Effective spend rate (${fmtPercent(effectiveRate)}) exceeds policy rate - intentional front-loaded spending strategy`
          : `Effective spend rate (${fmtPercent(effectiveRate)}) below policy rate - spending capacity available`
      );
    }
  } else if (preservation >= 0.90 && rateDifference <= 15 && lossProb10 < 0.25) {
    overallRisk = 'Moderate Risk';
    overallColor = 'text-yellow-600 bg-yellow-50';
    riskInsight = 'Some risk factors present that may benefit from attention';
    strategicConsiderations = [
      'Could consider modest spending adjustment to improve sustainability',
      'Investment strategy review may enhance long-term outcomes',
      'More frequent monitoring might provide better risk management'
    ];
    if (hasSignificantVariance && effectiveRate > policyRate) {
      strategicConsiderations.push(
        `Effective spend rate (${fmtPercent(effectiveRate)}) exceeds policy - consider whether front-loaded spending aligns with risk tolerance`
      );
    }
  } else if (preservation >= 0.80 && rateDifference <= 30 && lossProb10 < 0.40) {
    overallRisk = 'High Risk';
    overallColor = 'text-orange-600 bg-orange-50';
    riskInsight = 'Multiple risk factors suggest potential sustainability challenges';
    strategicConsiderations = [
      'For perpetual endowments: current spending likely exceeds long-term portfolio capacity',
      'Consider phased spending reduction to align with portfolio-sustainable rate',
      'Evaluate opportunities to enhance portfolio returns through asset allocation review',
      'Assess whether current mission impact justifies gradual capital erosion'
    ];
    if (hasSignificantVariance && effectiveRate > policyRate) {
      strategicConsiderations.push(
        `Effective rate (${fmtPercent(effectiveRate)}) above policy exacerbates sustainability risk`
      );
    }
  } else {
    overallRisk = 'Critical Risk';
    overallColor = 'text-red-600 bg-red-50';
    riskInsight = 'Current trajectory may benefit from immediate attention';
    strategicConsiderations = [
      'Spending significantly above portfolio capacity for perpetual endowments',
      'Without spending adjustment, capital depletion likely within simulation horizon',
      'Board should evaluate trade-off between current impact vs. perpetuity commitment',
      'Consider: spending reduction, supplemental revenue sources, or reconsidering perpetuity goal',
      'If perpetuity is essential, spending policy revision appears necessary'
    ];
    if (hasSignificantVariance && effectiveRate > policyRate) {
      strategicConsiderations.push(
        `Effective rate (${fmtPercent(effectiveRate)}) significantly exceeds policy - immediate attention required`
      );
    }
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
                Portfolio-Sustainable Rate
                <div class="relative group cursor-help">
                  <span class="text-xs text-slate-400 font-bold ml-1">i</span>
                  <div class="absolute z-10 hidden group-hover:block w-80 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-10 -ml-64 whitespace-normal">
                    **Reference rate for perpetual capital preservation.** Based solely on portfolio expected returns (geometric) adjusted for risk. Spending above this rate represents an intergenerational trade-off: more current impact vs. future capital. Many foundations intentionally spend above this rate using fundraising, accepting gradual erosion, or planning finite lifespans.
                  </div>
                </div>
                </div>
              <div class="text-2xl font-extrabold tabnums text-blue-700">
                {{ Number.isFinite(strategicSustainableSpendRate) ? fmtPercent(strategicSustainableSpendRate) : '—' }}
              </div>
            </div>

            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
              <div class="text-xs text-slate-600 mb-2 flex justify-between items-center">
                <span
                  class="inline-block"
                  title="Effective Spend Rate: Average across projection years of (median policy spending + operating expenses + grants) divided by the median beginning-of-year endowment. Excludes investment management fees. Can exceed the stated policy % if the endowment declines. Board Use: signals actual capital draw pressure inclusive of mission & operating allocations; compare with Portfolio-Sustainable Rate to assess long-term viability."
                >Effective Spend Rate</span>
                <div class="relative group cursor-help">
                  <span class="text-xs text-slate-400 font-bold ml-1">i</span>
                  <div class="absolute z-10 hidden group-hover:block w-72 p-3 text-xs text-white bg-slate-700 rounded-lg shadow-xl -mt-10 -ml-56 whitespace-normal">
                    **Actual spending as % of endowment** (includes grants + operating + investment expenses). Averaged across simulation period. May differ from policy rate when grants intentionally vary (e.g., higher early grants, declining later).
                  </div>
                </div>
                </div>
              <div class="text-2xl font-bold tabnums text-slate-700">
                {{ Number.isFinite(effectiveSpendRate) ? fmtPercent(effectiveSpendRate) : (Number.isFinite(inputs.spendingPolicyRate) ? `${inputs.spendingPolicyRate}%` : '—') }}
                <div v-if="Number.isFinite(effectiveSpendRate) && Number.isFinite(inputs.spendingPolicyRate)" class="mt-1 text-[11px] text-slate-500">
                  Policy vs Effective Delta: <span :class="(effectiveSpendRate > (inputs.spendingPolicyRate/100)) ? 'text-red-600' : 'text-emerald-600'">
                    {{ ((effectiveSpendRate - (inputs.spendingPolicyRate/100)) * 100).toFixed(2) }}%
                  </span>
                </div>
              </div>
              <div class="text-sm font-medium text-indigo-600 mt-1">
                Policy: {{ Number.isFinite(inputs.spendingPolicyRate) ? `${inputs.spendingPolicyRate}%` : '—' }}
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