<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps<{
  results: any;
}>();

// Helper to safely access and format the rate percentage
const spendingRate = props.results?.inputs?.spendingPolicyRate ?? '5';
const expenseRate = props.results?.inputs?.investmentExpenseRate ?? '1';

</script>

<template>
     <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-md">
        
        <h3 class="text-lg font-bold mb-4 text-slate-700">Methodology & Notes</h3> 
        
        <ul class="list-disc pl-5 text-sm text-slate-600 space-y-2">
          
          <li>
            The analysis uses a <strong>Monte Carlo Simulation</strong>, meaning we run <strong>thousands of possible future scenarios</strong> to see how the endowment might perform. The returns are based on expected investment <strong>averages (mu)</strong> and <strong>volatility (sigma)</strong> for your specific portfolio.
          </li>
          
          <li>
            The spending projections use a simple model: annual spending policy expenses are calculated as <strong>{{ spendingRate }}%</strong> of the endowment's value at the start of the year (unless there is a manual override of grants), and investment expenses are assumed to be <strong>{{ expenseRate }}%</strong>.
          </li>
          
          <li>
            The <strong>Nominal/Real</strong> setting lets you view results in either <strong>today's dollars (Real)</strong>, which removes the effect of inflation to show true buying power, or in <strong>future dollars (Nominal)</strong>. Toggling this updates all charts and values.
          </li>
          
          <li>
            <strong>Conditional Value at Risk (CVaR 95%)</strong> identifies the fund's <strong>"Bad Day"</strong> scenario. It shows the <strong>average final value</strong> and the <strong>average loss</strong> you could expect to see in the <strong>worst 5%</strong> of all simulated outcomes.
          </li>
        </ul>
      </section>
</template>