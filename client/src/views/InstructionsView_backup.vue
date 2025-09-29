<script setup lang="ts">
</script>

<template>
  <main class="max-w-4xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
    <h1 class="text-3xl font-bold">Instructions</h1>
    <section class="space-y-2">
      <h2 class="text-xl font-semibold">Getting Started</h2>
      <ol class="list-decimal ml-5 space-y-1 text-text-secondary">
        <li><b>Set Your Foundation:</b> Begin in <b>Settings</b> to define your initial endowment value, long-term spending policy rates, and optional asset class assumptions.</li>
        <li><b>Build Your Portfolio:</b> Go to <b>Allocation</b> to set your portfolio weights. The tool defaults to your investment policy targets, but you can adjust them within policy limits.</li>
        <li><b>Run the Simulation:</b> Navigate to <b>Results</b> and click <b>Run Simulation</b>. You can optionally apply pre-configured stress tests to model market shocks.</li>
      </ol>
    </section>
    <section class="space-y-2">
      <h2 class="text-xl font-semibold">Interpreting Your Results</h2>
      <ul class="list-disc ml-5 space-y-3 text-text-secondary">
        <li>
          <b>Summary Cards</b>: Get an at-a-glance overview of your strategy’s viability.
          <ul class="list-disc ml-6 mt-2 space-y-1">
            <li><b>Median Value:</b> The most likely ending value of your endowment.</li>
            <li><b>Probability of Loss:</b> The statistical chance that your endowment’s value will fall below its initial starting point.</li>
            <li><b>Annualized Return:</b> Your portfolio’s median compound annual growth rate.</li>
          </ul>
        </li>
        <li>
          <b>Projection Chart</b>: Visualize your endowment's future.
          <ul class="list-disc ml-6 mt-2 space-y-1">
            <li>The <b>median line</b> shows the most likely growth path.</li>
            <li>The <b>interquartile bands</b> show the range of outcomes for the middle 50% of scenarios.</li>
            <li>The chart can also display your <b>endowment’s corpus</b>, a <b>benchmark</b> line, and individual <b>sample paths</b> to illustrate the breadth of possibilities.</li>
          </ul>
        </li>
        <li><b>Statistical Summary</b>: For detailed analysis, a table provides percentile values for final endowment, annualized return, and volatility.</li>
        <li><b>Data Table</b>: View a year-by-year breakdown of key metrics to track progress over time.</li>
      </ul>
    </section>
    <section class="space-y-2">
      <h2 class="text-xl font-semibold">Advanced Tips</h2>
      <ul class="list-disc ml-5 space-y-1 text-text-secondary">
        <li><b>Override Assumptions:</b> Adjust the mean return and volatility for individual asset classes in Assumptions to test different long-term market outlooks.</li>
        <li><b>Replicate & Share:</b> Use the Random Seed option to generate the exact same set of scenarios every time. Use the share link to send a pre-configured simulation to colleagues.</li>
        <li><b>Stress Testing:</b> Apply stress tests to model specific scenarios like equity market shocks or a persistent change in inflation.</li>
        <li><b>Policy Constraints:</b> The tool automatically keeps your portfolio within your predefined policy limits to ensure a realistic simulation.</li>
      </ul>
    </section>
  </main>
</template>
