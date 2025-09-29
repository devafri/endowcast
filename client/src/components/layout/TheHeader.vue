<script setup lang="ts">
// Simple brand header component
</script>

<template>
  <header class="bg-white border-b border-gray-200 shadow-sm">
    <div class="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 lg:px-8 py-4">
      <RouterLink to="/" class="flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-800 to-slate-800 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
          <span class="text-white font-bold text-lg">E</span>
        </div>
        <div>
          <div class="text-xl font-bold text-gray-900 leading-tight">EndowCast</div>
          <div class="text-sm text-gray-600 font-medium">Endowment Analytics</div>
        </div>
      </RouterLink>
      
      <div class="hidden sm:flex items-center gap-6">
        <div class="flex items-center gap-2 text-sm">
          <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span class="text-gray-600 font-medium">Real-time Analytics</span>
        </div>
      </div>
    </div>
  </header>
</template>