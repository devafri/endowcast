<script setup>
defineProps({
  title: String,
  subtitle: String,
});
</script>

<template>
  <div class="text-center">
    <h1 class="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">{{ title }}</h1>
    <p v-if="subtitle" class="mt-2 text-base sm:text-lg text-text-secondary">{{ subtitle }}</p>
  </div>
</template>