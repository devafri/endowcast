<script setup lang="ts">
const props = defineProps<{ results: any }>();

function formatMoney(num: number): string { if (!isFinite(num)) return '-'; if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`; if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`; return `$${num.toFixed(0)}`; }
</script>

<template>
  <div class="card p-4">
    <h3 class="section-title mb-4">Statistical Summary</h3>
    <!-- Small summary; the table component will render detailed rows -->
    <div class="grid grid-cols-3 gap-4">
      <div class="p-4 bg-white rounded-lg border border-border">
        <div class="text-xs text-text-secondary">10th</div>
        <div class="font-semibold mt-2">32</div>
      </div>
      <div class="p-4 bg-white rounded-lg border border-border">
        <div class="text-xs text-text-secondary">Median</div>
        <div class="font-semibold mt-2">53</div>
      </div>
      <div class="p-4 bg-white rounded-lg border border-border">
        <div class="text-xs text-text-secondary">90th</div>
        <div class="font-semibold mt-2">82</div>
      </div>
    </div>
  </div>
</template>
