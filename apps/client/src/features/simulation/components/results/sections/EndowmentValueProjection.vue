<script setup lang="ts">
import EndowmentValueChart from '@/features/simulation/components/results/charts/EndowmentValueChart.vue';
const props = defineProps<{ results: any }>();
</script>

<template>
  <div class="p-4 md:p-6 bg-white border border-gray-200 rounded-lg shadow-lg">
  <EndowmentValueChart :results="results" />
  </div>
</template>
