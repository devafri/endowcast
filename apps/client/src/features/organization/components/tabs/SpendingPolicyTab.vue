<template>
  <div class="space-y-6">
    <div v-if="!canAccessTab" class="relative">
      <div class="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
        <div class="text-center p-8">
          <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a1 1 0 001-1v-6a1 1 0 00-1-1H6a1 1 0 00-1 1v6a1 1 0 001 1zM12 9a3 3 0 110-6 3 3 0 010 6z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">🚀 Advanced Spending Policies</h3>
          <p class="text-gray-600 mb-4">Upgrade to access sophisticated spending rules, grant targeting, and policy smoothing features.</p>
          <RouterLink to="/pricing" class="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-md transition-colors">
            Upgrade Now
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </RouterLink>
        </div>
      </div>
      <div class="opacity-30 pointer-events-none">
        <GrantTargets />
      </div>
    </div>
    <GrantTargets v-else />
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import GrantTargets from '../../../simulation/components/inputs/GrantTargets.vue';

interface Props {
  canAccessTab: boolean;
}

defineProps<Props>();
</script>
