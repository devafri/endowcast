<template>
  <div 
    v-if="show" 
    class="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4"
  >
    <div class="flex items-start">
      <div class="flex-shrink-0">
        <svg class="w-5 h-5 text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <div class="ml-3 flex-1">
        <h3 class="text-sm font-medium text-amber-900 mb-1">{{ title }}</h3>
        <div class="text-sm text-amber-800">
          <p class="mb-2">{{ description }}</p>
          <ul v-if="features.length > 0" class="list-disc list-inside space-y-1 text-amber-800">
            <li v-for="feature in features" :key="feature.name">
              <strong>{{ feature.name }}:</strong> {{ feature.description }}
            </li>
          </ul>
        </div>
      </div>
      <div class="ml-4">
        <component 
          :is="ctaComponent"
          :to="ctaLink" 
          :class="ctaClasses"
          @click="$emit('cta-click')"
        >
          {{ ctaText }}
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </component>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

interface Feature {
  name: string;
  description: string;
}

interface Props {
  show?: boolean;
  title?: string;
  description?: string;
  features?: Feature[];
  ctaText?: string;
  ctaLink?: string;
  ctaIsExternal?: boolean;
}

interface Emits {
  (e: 'cta-click'): void;
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  title: '🚀 Unlock Advanced Features',
  description: 'Your trial account has access to Basic Parameters only. Upgrade to unlock:',
  features: () => [
    { name: 'Advanced Spending Policies', description: 'Smoothing rules, inflation adjustments' },
    { name: 'Stress Testing', description: 'Market shock scenarios and risk analysis' },
    { name: 'Asset Class Customization', description: 'Override default return assumptions' },
    { name: 'Portfolio Benchmarking', description: 'Compare against custom benchmarks' }
  ],
  ctaText: 'Upgrade Now',
  ctaLink: '/pricing',
  ctaIsExternal: false,
});

defineEmits<Emits>();

const ctaComponent = computed(() => {
  return props.ctaIsExternal ? 'a' : RouterLink;
});

const ctaClasses = "inline-flex items-center px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded-md transition-colors";
</script>
