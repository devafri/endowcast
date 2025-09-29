<template>
  <div class="container mx-auto px-4 py-8">
    <PageHeader 
      title="Financial Metrics Definitions"
      subtitle="Understanding endowment performance and risk metrics"
    />
    
    <div class="max-w-4xl mx-auto space-y-8">
      
      <!-- Performance Metrics -->
      <div class="card p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="w-3 h-3 bg-accent rounded-full mr-3"></span>
          Performance Metrics
        </h2>
        
        <div class="space-y-6">
          <div class="border-l-4 border-accent pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Annualized Return</h3>
            <p class="text-gray-700 mb-2">The compound annual growth rate of the endowment portfolio over the simulation period.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Example:</strong> A 7.00% annualized return means the endowment grows at an average rate of 7% per year, compounded.
            </div>
          </div>
          
          <div class="border-l-4 border-accent pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Sharpe Ratio</h3>
            <p class="text-gray-700 mb-2">Measures risk-adjusted performance by comparing excess returns to volatility.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Formula:</strong> (Portfolio Return - Risk-Free Rate) ÷ Portfolio Volatility<br>
              <strong>Interpretation:</strong> >1.0 = Excellent, 0.5-1.0 = Good, <0.5 = Poor
            </div>
          </div>
        </div>
      </div>

      <!-- Risk Metrics -->
      <div class="card p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="w-3 h-3 bg-red-500 rounded-full mr-3"></span>
          Risk Metrics
        </h2>
        
        <div class="space-y-6">
          <div class="border-l-4 border-red-500 pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Maximum Drawdown</h3>
            <p class="text-gray-700 mb-2">The largest peak-to-trough decline in endowment value during the worst period.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Example:</strong> A 17% maximum drawdown means in the worst scenario, the endowment lost 17% of its value from peak to trough (e.g., $500M → $415M).
              <br><strong>Typical Ranges:</strong> Conservative: 10-20%, Moderate: 15-25%, Aggressive: 20-35%+
            </div>
          </div>
          
          <div class="border-l-4 border-red-500 pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Value at Risk (5%)</h3>
            <p class="text-gray-700 mb-2">The minimum endowment value in the worst 5% of scenarios.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Example:</strong> A VaR of $372M means there's only a 5% chance the endowment will fall below $372M.
              <br><strong>Use Case:</strong> Helps boards plan for worst-case scenarios and stress testing.
            </div>
          </div>
          
          <div class="border-l-4 border-red-500 pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Real Value Preservation</h3>
            <p class="text-gray-700 mb-2">Probability that the endowment maintains its purchasing power after inflation.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Calculation:</strong> Compares final endowment value to initial value grown at ~3% annual inflation.
              <br><strong>Target:</strong> Most endowments aim for >70% probability to ensure long-term sustainability.
            </div>
          </div>
        </div>
      </div>

      <!-- Sustainability Metrics -->
      <div class="card p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
          Sustainability Metrics
        </h2>
        
        <div class="space-y-6">
          <div class="border-l-4 border-green-500 pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Sustainable Spending Rate</h3>
            <p class="text-gray-700 mb-2">Probability that the endowment can maintain at least a 4% annual spending rate.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Why 4%?</strong> Most foundations target 4-5% annual spending. Lower percentages suggest spending may be too aggressive.
              <br><strong>Ranges:</strong> >80% = High confidence, 50-80% = Moderate risk, <50% = High risk of program cuts
            </div>
          </div>
          
          <div class="border-l-4 border-green-500 pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Years of Coverage</h3>
            <p class="text-gray-700 mb-2">How many years the median final endowment value could support current spending levels.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Example:</strong> If final endowment value is $500M and annual spending is $25M, that provides 20 years of coverage.
              <br><strong>Use:</strong> Gives trustees a tangible sense of sustainability horizon.
            </div>
          </div>
        </div>
      </div>

      <!-- Spending Analysis -->
      <div class="card p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
          Spending Analysis
        </h2>
        
        <div class="space-y-6">
          <div class="border-l-4 border-blue-500 pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Total Mission Spending</h3>
            <p class="text-gray-700 mb-2">Cumulative amount available for programs and grants over the simulation period.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Components:</strong> Includes spending policy distributions minus operating expenses.
              <br><strong>Use:</strong> Helps quantify total philanthropic impact over time.
            </div>
          </div>
          
          <div class="border-l-4 border-blue-500 pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Total Grants</h3>
            <p class="text-gray-700 mb-2">Cumulative grant distributions over the simulation period.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Note:</strong> May include additional grants beyond spending policy to meet grant targets.
              <br><strong>Tracking:</strong> Essential for measuring philanthropic output and impact.
            </div>
          </div>
        </div>
      </div>

      <!-- Cost Structure -->
      <div class="card p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
          Cost Structure
        </h2>
        
        <div class="space-y-6">
          <div class="border-l-4 border-purple-500 pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Operating Expenses</h3>
            <p class="text-gray-700 mb-2">Foundation administrative costs including staff, facilities, and program management.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Typical Range:</strong> 0.5% - 2.0% of endowment value annually.
              <br><strong>Impact:</strong> Reduces funds available for grants and programs.
            </div>
          </div>
          
          <div class="border-l-4 border-purple-500 pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Investment Expenses</h3>
            <p class="text-gray-700 mb-2">Portfolio management fees including advisory fees, fund expenses, and transaction costs.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Typical Range:</strong> 0.5% - 1.5% of endowment value annually.
              <br><strong>Note:</strong> Separate from spending policy allowance; reduces investment returns directly.
            </div>
          </div>
        </div>
      </div>

      <!-- Statistical Terms -->
      <div class="card p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="w-3 h-3 bg-indigo-500 rounded-full mr-3"></span>
          Statistical Terms
        </h2>
        
        <div class="space-y-6">
          <div class="border-l-4 border-indigo-500 pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Median vs. Mean</h3>
            <p class="text-gray-700 mb-2">Median represents the middle value when all scenarios are sorted, providing a more robust measure than average.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Why Median?</strong> Less affected by extreme outcomes, giving a better sense of "typical" results.
            </div>
          </div>
          
          <div class="border-l-4 border-indigo-500 pl-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Percentiles</h3>
            <p class="text-gray-700 mb-2">Show distribution of outcomes across all simulation scenarios.</p>
            <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Example:</strong> 90th percentile means 90% of scenarios had results below this level, 10% had results above.
              <br><strong>Use:</strong> Helps understand range of possible outcomes and probability of different results.
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue';
</script>
