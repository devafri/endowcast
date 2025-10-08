<script setup lang="ts">
const props = defineProps<{ cuts: number[] }>();

function buckets(cuts: number[], binCount = 8) {
  if (!cuts || !cuts.length) return { bins: [], counts: [] };
  // Work in absolute percentage units (0..100)
  const abs = cuts.map(c => Math.abs(Number(c)))
    .map(v => (Math.abs(v) <= 1 ? v * 100 : v));
  const min = Math.min(...abs);
  const max = Math.max(...abs);
  const width = (max - min) / binCount || 1;
  const bins = Array.from({ length: binCount }, (_, i) => Math.round((min + i * width) * 10) / 10);
  const counts = Array(binCount).fill(0);
  for (const vRaw of abs) {
    const v = Math.max(min, Math.min(max, vRaw));
    const idx = Math.min(binCount - 1, Math.floor((v - min) / width));
    counts[Math.max(0, idx)] += 1;
  }
  return { bins, counts };
}

const { bins, counts } = buckets(props.cuts || []);
</script>

<template>
  <div class="w-full h-24 flex items-end gap-2">
    <template v-if="counts.length">
      <div v-for="(c, i) in counts" :key="i" class="flex-1 h-full flex items-end">
        <div class="bg-red-400 rounded-sm w-full" :style="{ height: (c / Math.max(...counts) * 100) + '%' }"></div>
      </div>
    </template>
    <template v-else>
      <div class="text-xs text-text-secondary">No distribution available</div>
    </template>
  </div>
</template>
