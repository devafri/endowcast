<template>
  <div 
    v-if="show" 
    :class="[
      'border rounded-lg p-4 mb-6',
      variant === 'info' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
    ]"
  >
    <div class="flex items-start">
      <div class="flex-shrink-0">
        <component :is="iconComponent" class="w-5 h-5 mt-0.5" :class="iconClasses" />
      </div>
      <div class="ml-3">
        <h3 :class="titleClasses" class="text-sm font-medium mb-1">{{ title }}</h3>
        <div :class="contentClasses" class="text-sm">
          <p v-if="description" class="mb-2 font-medium">{{ description }}</p>
          <ol v-if="steps.length > 0" class="list-decimal list-inside space-y-1 font-medium">
            <li v-for="step in steps" :key="step.title">
              <strong>{{ step.title }}:</strong> {{ step.description }}
            </li>
          </ol>
          <p v-if="tip" class="mt-2 font-semibold">{{ tip }}</p>
          <slot name="content" />
        </div>
      </div>
      <div v-if="showDismiss" class="ml-auto">
        <button 
          @click="$emit('dismiss')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue';

interface Step {
  title: string;
  description: string;
}

interface Props {
  show?: boolean;
  variant?: 'info' | 'success';
  title?: string;
  description?: string;
  steps?: Step[];
  tip?: string;
  showDismiss?: boolean;
}

interface Emits {
  (e: 'dismiss'): void;
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  variant: 'info',
  title: 'Getting Started',
  description: 'Configure your endowment parameters in order:',
  steps: () => [
    { title: 'Basic Parameters', description: 'Set your endowment size and spending policy' },
    { title: 'Asset Allocation', description: 'Define your investment mix across asset classes' },
    { title: 'Market Assumptions', description: 'Adjust expected returns and volatility (optional)' },
    { title: 'Advanced Settings', description: 'Fine-tune simulation parameters (optional)' }
  ],
  tip: '💡 Tip: Default assumptions are based on institutional best practices',
  showDismiss: false,
});

defineEmits<Emits>();

// Icon components as inline components
const InfoIcon = defineComponent({
  render: () => h('svg', {
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24'
  }, h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }))
});

const CheckIcon = defineComponent({
  render: () => h('svg', {
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24'
  }, h('path', {
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'stroke-width': '2',
    d: 'M5 13l4 4L19 7'
  }))
});

const iconComponent = computed(() => {
  return props.variant === 'info' ? InfoIcon : CheckIcon;
});

const iconClasses = computed(() => {
  return props.variant === 'info' ? 'text-blue-400' : 'text-green-400';
});

const titleClasses = computed(() => {
  return props.variant === 'info' ? 'text-blue-900' : 'text-green-900';
});

const contentClasses = computed(() => {
  return props.variant === 'info' ? 'text-blue-800' : 'text-green-800';
});
</script>
