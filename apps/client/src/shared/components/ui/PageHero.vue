<template>
  <section class="pt-16 pb-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 text-center md:text-left">
  <h1 class="text-4xl md:text-5xl font-extrabold mb-3"><slot name="title" /></h1>
  <p class="text-lg text-slate-700 mb-6"><slot name="subtitle" /></p>
      <div><slot name="controls" /></div>
    </div>
  </section>
</template>

<script setup lang="ts">
// lightweight wrapper for hero sections
</script>
