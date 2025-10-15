<template>
  <div class="max-w-7xl mx-auto px-4" :class="className">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ className?: string }>();
</script>
