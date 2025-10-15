<template>
  <div :class="['bg-white rounded-lg border border-slate-100 shadow-sm p-6', className]">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ className?: string }>();
</script>
