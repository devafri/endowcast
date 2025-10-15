<template>
  <section class="mt-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <div class="rounded-2xl overflow-hidden bg-gradient-to-r from-sky-600 to-slate-800 text-white p-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="max-w-2xl text-left">
          <h2 class="text-2xl font-bold"><slot name="title" /></h2>
          <p class="text-sky-100 mt-2"><slot name="subtitle" /></p>
        </div>
        <div class="flex gap-3">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// slot-based CTA band
</script>
