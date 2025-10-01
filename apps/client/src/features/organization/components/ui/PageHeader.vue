<template>
  <div class="text-center mb-8">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">{{ title }}</h1>
    <p v-if="description" class="text-lg text-gray-600 max-w-2xl mx-auto">
      {{ description }}
    </p>
    <div v-if="showStepIndicator" class="mt-6 flex items-center justify-center">
      <div class="flex items-center bg-white rounded-full px-4 py-2 shadow-md">
        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
          <span class="text-blue-600 font-semibold text-sm">{{ stepNumber }}</span>
        </div>
        <span class="text-gray-700 font-medium">{{ stepLabel }}</span>
      </div>
    </div>
    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  description?: string;
  showStepIndicator?: boolean;
  stepNumber?: number;
  stepLabel?: string;
}

withDefaults(defineProps<Props>(), {
  showStepIndicator: false,
  stepNumber: 1,
  stepLabel: 'Step'
});
</script>
