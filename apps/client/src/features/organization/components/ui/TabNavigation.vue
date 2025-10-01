<template>
  <div class="mb-8">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
      <nav class="flex space-x-1 overflow-x-auto" aria-label="Tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="$emit('tab-change', tab.id)"
          :disabled="!canAccessTab(tab.id)"
          :class="[
            'flex-shrink-0 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap relative',
            activeTab === tab.id && canAccessTab(tab.id)
              ? 'bg-blue-100 text-blue-700 shadow-sm'
              : canAccessTab(tab.id)
              ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 cursor-pointer'
              : 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-75'
          ]"
        >
          <span class="mr-2">{{ tab.icon }}</span>
          {{ tab.label }}
          <!-- Trial User Lock Icon -->
          <svg 
            v-if="!canAccessTab(tab.id)" 
            class="w-4 h-4 ml-2 text-amber-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a1 1 0 001-1v-6a1 1 0 00-1-1H6a1 1 0 00-1 1v6a1 1 0 001 1zM12 9a3 3 0 110-6 3 3 0 010 6z"></path>
          </svg>
        </button>
      </nav>
    </div>
    <slot name="after-navigation" />
  </div>
</template>

<script setup lang="ts">
import type { TabConfig } from '../../types/SettingsTypes';

interface Props {
  tabs: TabConfig[];
  activeTab: string;
  canAccessTab: (tabId: string) => boolean;
}

interface Emits {
  (e: 'tab-change', tabId: string): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
