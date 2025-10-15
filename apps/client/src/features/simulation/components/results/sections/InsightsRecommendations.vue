<script setup lang="ts">
const props = defineProps<{ results: any }>();
</script>

<template>
  <div class="p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
    <h3 class="text-lg font-semibold">Insights & Recommendations</h3>
    <ul class="text-sm space-y-2 text-text-secondary">
      <li>Reducing spending by 0.5% raises long-term corpus preservation by 12%.</li>
      <li>Your current policy exceeds sustainable levels in 32% of simulations.</li>
      <li>Diversifying fixed income increases Sharpe ratio by 0.08.</li>
    </ul>
  </div>
</template>
