<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { exportSimulationResults } from '@/utils/pdfExport';

interface Props {
  disabled?: boolean;
  simulationData?: any;
  filename?: string;
}

const props = defineProps<Props>();
const authStore = useAuthStore();

const canExport = authStore.hasFeature('export');

async function handleExport() {
  if (!canExport) {
    return;
  }

  try {
    await exportSimulationResults(props.simulationData, {
      filename: props.filename || 'endowcast-simulation'
    });
  } catch (error) {
    console.error('Export failed:', error);
  }
}
</script>

<template>
  <!-- Export button for Professional and Institutional users -->
  <button
    v-if="authStore.isAuthenticated && canExport"
    @click="handleExport"
    :disabled="disabled"
    class="btn-secondary px-4 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
    Export PDF
  </button>

  <!-- Upgrade prompt for Free Trial users -->
  <div v-else-if="authStore.isAuthenticated && !canExport" class="relative group">
    <button
      disabled
      class="btn-secondary px-4 py-2 text-sm font-medium rounded-md opacity-50 cursor-not-allowed inline-flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
      </svg>
      Export PDF
    </button>
    
    <!-- Upgrade tooltip -->
    <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
      <div class="relative">
        Upgrade to Professional for PDF exports
        <!-- Arrow -->
        <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
      </div>
    </div>
  </div>
</template>
