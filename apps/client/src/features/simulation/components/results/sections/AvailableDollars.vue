<script setup lang="ts">
const props = defineProps<{ results: any }>();
</script>

<template>
  <div class="card p-6">
    <h4 class="text-sm font-semibold text-gray-900 mb-2">Available Dollars (Based on Spending Policy)</h4>
    <p class="text-sm text-text-secondary">Estimated spending availability assuming current policy.</p>
    <!-- Placeholder for a bar chart component -->
  </div>
</template>
