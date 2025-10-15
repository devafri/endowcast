<script setup lang="ts">
const props = defineProps<{ results: any }>();

function formatMoney(num: number): string { if (!isFinite(num)) return '-'; if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`; if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}K`; return `$${num.toFixed(0)}`; }

const years = props.results?.simulations?.[0]?.length ?? 10;
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="p-4 rounded-lg border border-border bg-white/50">
      <div class="text-sm text-text-secondary">After inflation</div>
      <div class="text-xl font-bold mt-2">2.3%</div>
    </div>
    <div class="p-4 rounded-lg border border-border bg-white/50">
      <div class="text-sm text-text-secondary">Projected over {{ years }} years</div>
      <div class="text-xl font-bold mt-2">4.1%</div>
    </div>
    <div class="p-4 rounded-lg border border-border bg-white/50">
      <div class="text-sm text-text-secondary">Corpus vs inflation</div>
      <div class="text-xl font-bold mt-2">88%</div>
    </div>
  </div>
</template>
