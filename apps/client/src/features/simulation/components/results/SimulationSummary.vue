<script setup lang="ts">
import Tooltip from '@/shared/components/ui/Tooltip.vue';

const props = defineProps<{ results: any }>();

function formatMoney(num: number): string {
  if (!isFinite(num)) return '-';
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function pct(n: number) { return isFinite(n) ? `${(n * 100).toFixed(2)}%` : '-'; }

function median(arr: number[]) {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a,b)=>a-b);
  return s[Math.floor(s.length/2)];
}

function percentile(arr: number[], p: number) {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a,b)=>a-b);
  const index = (p / 100) * (s.length - 1);
  return s[Math.floor(index)];
}

function standardDeviation(arr: number[]) {
  if (!arr.length) return NaN;
  const mean = arr.reduce((a,b) => a+b, 0) / arr.length;
  const variance = arr.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

// Enhanced KPI calculations
const years = props.results?.simulations?.[0]?.length ?? 10;
const startVal = props.results?.simulations?.[0]?.[0] ? median(props.results.simulations.map((s: number[]) => s[0])) : NaN;

// Final values for all simulations
const finalValues = props.results?.simulations?.map((sim: number[]) => sim[sim.length - 1]) || [];
const finalMed = median(finalValues);

// Portfolio returns analysis - use the corrected value from the store
const medianReturn = props.results?.summary?.medianAnnualizedReturn ? props.results.summary.medianAnnualizedReturn / 100 : 0;

// Calculate volatility from portfolio returns for Sharpe ratio
const portfolioReturns = props.results?.portfolioReturns?.map((sim: number[]) => {
  const annualizedReturn = sim.reduce((a, b) => a * (1 + b), 1) ** (1 / sim.length) - 1;
  return annualizedReturn;
}) || [];

const returnVolatility = standardDeviation(portfolioReturns);
const sharpeRatio = returnVolatility > 0 ? (medianReturn - 0.02) / returnVolatility : 0; // assuming 2% risk-free rate

// Maximum drawdown calculation
const maxDrawdowns = props.results?.simulations?.map((sim: number[]) => {
  let peak = sim[0];
  let maxDrawdown = 0;
  for (let i = 1; i < sim.length; i++) {
    if (sim[i] > peak) peak = sim[i];
    const drawdown = (peak - sim[i]) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown;
}) || [];

// Risk metrics
const valueAtRisk5 = percentile(finalValues, 5);
// Use user-defined spending policy rate from settings (assume constant for all years in sim)
const spendingPolicyRate = props.results?.spendingPolicyRate ?? 0.04; // fallback to 4% if not present
// Get the user-defined spending policy rate from the simulation inputs
const userSpendingPolicyRate = (() => {
  // Try to extract from simulation store inputs if available
  if (props.results?.inputs?.spendingPolicyRate) {
    return props.results.inputs.spendingPolicyRate / 100; // Convert percentage to decimal
  }
  // Fallback to spendingPolicyRate calculation 
  return spendingPolicyRate;
})();

// Calculate initial values for sustainability analysis
// Year 0 should be the user input, not the first simulation result
const trueInitialEndowment = props.results?.inputs?.initialEndowment || 0;
const targetAnnualSpending = trueInitialEndowment * userSpendingPolicyRate;

console.log('SIMPLE DEBUG: Component loaded, target spending =', targetAnnualSpending);
console.log('True initial endowment (Year 0):', trueInitialEndowment);
console.log('First simulation result (End of Year 1):', props.results?.simulations?.[0]?.[0]);
console.log('Target spending based on true initial:', targetAnnualSpending);

// Probability that endowment can maintain its exact target spending rate throughout the period
const probSustainableSpending = (() => {
  if (!props.results?.simulations?.length || !props.results?.spendingPolicy?.length) return NaN;
  let count = 0;
  
  // Debug: log basic parameters
  console.log('=== Sustainability Debug ===');
  console.log('Target spending:', Math.round(targetAnnualSpending));
  console.log('Total simulations:', props.results.simulations.length);
  
  for (let i = 0; i < props.results.simulations.length; i++) {
    const sim = props.results.simulations[i];
    const spendingPath = props.results.spendingPolicy[i];
    let canMaintainSpending = true;
    
    // Check each year if the target spending amount can be maintained or exceeded
    // Note: sim[year] represents END-of-year values, spendingPath[year] is spending DURING that year
    for (let year = 0; year < sim.length && year < spendingPath.length; year++) {
      // For Year 1 (year=0), beginning value is the initial endowment
      // For Year 2+ (year>=1), beginning value is the previous year's end value
      const beginningValue = year === 0 ? trueInitialEndowment : sim[year - 1];
      const actualSpending = spendingPath[year] || 0;
      const threshold = targetAnnualSpending * 0.95;
      
      // Log first simulation details
      if (i === 0 && year < 3) {
        console.log(`Year ${year + 1}: beginning=${Math.round(beginningValue)}, spending=${Math.round(actualSpending)}, target=${Math.round(targetAnnualSpending)}, threshold=${Math.round(threshold)}`);
      }
      
      // If beginning endowment is depleted or actual spending falls below the minimum target
      if (beginningValue <= 0 || actualSpending < threshold) {
        canMaintainSpending = false;
        break;
      }
    }
    
    if (canMaintainSpending) {
      count++;
    }
  }
  
  console.log('Passed simulations:', count, 'out of', props.results.simulations.length);
  return count / props.results.simulations.length;
})();

// Real value preservation (assuming 3% inflation)
const realValueThreshold = startVal * Math.pow(1.03, years);
const probRealPreservation = finalValues.filter((val: number) => val >= realValueThreshold).length / finalValues.length;

// Spending sustainability
const avgAnnualSpending = props.results?.spendingPolicy?.map((sim: number[]) => 
  sim.reduce((a,b) => a+b, 0) / sim.length
) || [];
const yearsOfCoverage = median(finalValues.map((val: number, i: number) => val / (avgAnnualSpending[i] || 1)));

// Legacy calculations for comparison
const medOpEx = Array.from({length: years}, (_, i) => median(props.results.operatingExpenses.map((r: number[]) => r[i])));
const medGrants = Array.from({length: years}, (_, i) => median(props.results.grants.map((r: number[]) => r[i])));
const medInvest = Array.from({length: years}, (_, i) => median(props.results.investmentExpenses.map((r: number[]) => r[i])));
const medSpendPol = Array.from({length: years}, (_, i) => median(props.results.spendingPolicy.map((r: number[]) => r[i])));

const totalOpEx = medOpEx.reduce((a,b)=>a+(b||0),0);
const totalGrants = medGrants.reduce((a,b)=>a+(b||0),0);
const totalInvest = medInvest.reduce((a,b)=>a+(b||0),0);
const totalSpendPol = medSpendPol.reduce((a,b)=>a+(b||0),0);

</script>

<template>
  <div class="card p-4 sm:p-6">
    <h3 class="section-title mb-6">Endowment Performance Analysis</h3>
    
    <!-- Primary KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="text-center">
        <div class="text-sm text-text-secondary mb-1">Median Final Value</div>
        <div class="text-3xl font-bold text-accent">{{ formatMoney(finalMed) }}</div>
        <div class="text-xs text-text-secondary mt-1">After {{ years }} years</div>
      </div>
      <div class="text-center">
        <div class="text-sm text-text-secondary mb-1 flex items-center justify-center gap-1">
          Annualized Return
          <Tooltip text="The median compound annual growth rate (CAGR) across all simulation paths - industry standard for Monte Carlo simulations" position="top" />
        </div>
        <div class="text-3xl font-bold">{{ pct(medianReturn) }}</div>
        <div class="text-xs text-text-secondary mt-1">Portfolio median</div>
      </div>
      <div class="text-center">
        <div class="text-sm text-text-secondary mb-1 flex items-center justify-center gap-1">
          Sharpe Ratio
          <Tooltip text="Risk-adjusted performance measure. >1.0 = Excellent, 0.5-1.0 = Good, <0.5 = Poor" position="top" />
        </div>
        <div class="text-3xl font-bold">{{ isFinite(sharpeRatio) ? sharpeRatio.toFixed(2) : '-' }}</div>
        <div class="text-xs text-text-secondary mt-1">Risk-adjusted performance</div>
      </div>
    </div>

    <!-- Risk & Sustainability Metrics -->
    <div class="mb-6">
      <h4 class="text-lg font-semibold text-gray-900 mb-4">Risk & Sustainability Analysis</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-4 rounded-lg border border-border bg-white/50">
          <div class="text-xs text-text-secondary mb-1 flex items-center gap-1">
            Maximum Drawdown
            <Tooltip text="Largest peak-to-trough decline during worst market period. Shows potential losses during downturns." position="top" />
          </div>
          <div class="text-lg font-semibold text-red-600">{{ pct(median(maxDrawdowns)) }}</div>
        </div>
        <div class="p-4 rounded-lg border border-border bg-white/50">
          <div class="text-xs text-text-secondary mb-1 flex items-center gap-1">
            Value at Risk (5%)
            <Tooltip text="Minimum endowment value in worst 5% of scenarios. Helps with stress testing and worst-case planning." position="top" />
          </div>
          <div class="text-lg font-semibold">{{ formatMoney(valueAtRisk5) }}</div>
        </div>
        <div class="p-4 rounded-lg border border-border bg-white/50">
          <div class="text-xs text-text-secondary mb-1 flex items-center gap-1">
            Real Value Preservation
            <Tooltip text="Probability endowment maintains purchasing power after ~3% inflation. Target: >70% for sustainability." position="top" />
          </div>
          <div class="text-lg font-semibold" :class="probRealPreservation >= 0.7 ? 'text-green-600' : probRealPreservation >= 0.5 ? 'text-yellow-600' : 'text-red-600'">
            {{ pct(probRealPreservation) }}
          </div>
        </div>
        <div class="p-4 rounded-lg border border-border bg-white/50">
          <div class="text-xs text-text-secondary mb-1 flex items-center gap-1">
            Years of Coverage
            <Tooltip text="How many years the final endowment value could support current spending levels." position="top" />
          </div>
          <div class="text-lg font-semibold">{{ isFinite(yearsOfCoverage) ? yearsOfCoverage.toFixed(1) : '-' }}</div>
        </div>
      </div>
    </div>

    <!-- Spending Analysis -->
    <div class="mb-6">
      <h4 class="text-lg font-semibold text-gray-900 mb-4">Mission Sustainability</h4>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 rounded-lg border border-border bg-white/50">
          <div class="text-xs text-text-secondary mb-1 flex items-center gap-1">
            Sustainable Spending Rate
            <Tooltip :text="`Probability that the endowment can sustain its target spending amount of $${formatMoney(targetAnnualSpending).replace('$', '')} per year (${(userSpendingPolicyRate*100).toFixed(1)}% of $${formatMoney(trueInitialEndowment).replace('$', '')}) throughout the ${years}-year period. This measures the sustainability of the spending policy.`" position="top" />
          </div>
          <div class="text-lg font-semibold" :class="probSustainableSpending >= 0.8 ? 'text-green-600' : probSustainableSpending >= 0.5 ? 'text-yellow-600' : 'text-red-600'">
            {{ pct(probSustainableSpending) }}
          </div>
          <div class="text-xs text-text-secondary mt-1">Sustaining {{ formatMoney(targetAnnualSpending) }}/year</div>
        </div>
        <div class="p-4 rounded-lg border border-border bg-white/50">
          <div class="text-xs text-text-secondary mb-1 flex items-center gap-1">
            Total Mission Spending
            <Tooltip text="Cumulative amount available for programs and grants over the simulation period." position="top" />
          </div>
          <div class="text-lg font-semibold">{{ formatMoney(totalSpendPol) }}</div>
          <div class="text-xs text-text-secondary mt-1">{{ years }}-year cumulative</div>
        </div>
        <div class="p-4 rounded-lg border border-border bg-white/50">
          <div class="text-xs text-text-secondary mb-1 flex items-center gap-1">
            Total Grants
            <Tooltip text="Cumulative grant distributions over the simulation period, including any additional grants to meet targets." position="top" />
          </div>
          <div class="text-lg font-semibold text-blue-800">{{ formatMoney(totalGrants) }}</div>
          <div class="text-xs text-text-secondary mt-1">{{ years }}-year cumulative</div>
        </div>
      </div>
    </div>

    <!-- Cost Analysis -->
    <div>
      <h4 class="text-lg font-semibold text-gray-900 mb-4">Cost Structure Analysis</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 rounded-lg border border-border bg-white/50">
          <div class="text-xs text-text-secondary mb-1">Total Operating Expenses</div>
          <div class="text-lg font-semibold">{{ formatMoney(totalOpEx) }}</div>
          <div class="text-xs text-text-secondary mt-1">{{ years }}-year cumulative</div>
        </div>
        <div class="p-4 rounded-lg border border-border bg-white/50">
          <div class="text-xs text-text-secondary mb-1">Total Investment Expenses</div>
          <div class="text-lg font-semibold">{{ formatMoney(totalInvest) }}</div>
          <div class="text-xs text-text-secondary mt-1">{{ years }}-year cumulative</div>
        </div>
      </div>
    </div>
  </div>
</template>
