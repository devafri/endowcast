<script setup lang="ts">
import Tooltip from './Tooltip.vue';

interface MetricDiff {
  value: number;
  baselineValue: number;
  absoluteDiff: number;
  relativeDiff: number;
  isBetter: boolean | null;
  label: string;
}

const props = defineProps<{ 
  label: string; 
  value: string | number; 
  tip?: string; 
  id?: string; 
  compact?: boolean;
  diff?: MetricDiff | null;
  isBaseline?: boolean;
}>();
</script>

<template>
  <div class="flex items-start justify-between">
    <div class="flex items-center space-x-2">
      <span class="text-sm text-gray-700">{{ props.label }}</span>
      <Tooltip v-if="props.tip" :content="props.tip" :id="props.id">
        <template #trigger="{ open, close }">
          <button
            @mouseenter="open()"
            @mouseleave="close()"
            @focus="open()"
            @blur="close()"
            class="ml-1 text-gray-400 hover:text-gray-600 p-1"
            :aria-describedby="props.id"
            aria-label="More info"
            type="button"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a1 1 0 11-2 0 1 1 0 012 0zM9 9h2v5H9V9z"/></svg>
          </button>
        </template>
      </Tooltip>
    </div>

    <div class="text-right">
      <strong class="text-sm text-gray-900">{{ typeof props.value === 'number' ? (isFinite(props.value as number) ? (props.value as number).toFixed(2) : '—') : props.value }}</strong>
      
      <!-- Diff indicator for comparison view -->
      <div v-if="diff && !isBaseline" class="text-xs mt-0.5" :class="{
        'text-green-600': diff.isBetter === true,
        'text-red-600': diff.isBetter === false,
        'text-gray-500': diff.isBetter === null
      }">
        <span v-if="diff.absoluteDiff > 0">+</span>{{ diff.relativeDiff.toFixed(1) }}%
      </div>
      <div v-else-if="isBaseline" class="text-xs text-gray-400 mt-0.5">
        Baseline
      </div>
    </div>
  </div>
</template>
