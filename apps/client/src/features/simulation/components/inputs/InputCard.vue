<script setup>
defineProps({
  modelValue: Number,
  title: String,
  description: String,
  type: {
    type: String,
    default: 'number', // 'currency' or 'percent'
  },
});
const emit = defineEmits(['update:modelValue']);

function handleInput(event) {
  emit('update:modelValue', parseFloat(event.target.value));
}
</script>

<template>
  <div class="card p-6">
    <h2 class="text-lg font-semibold mb-4 section-title">{{ title }}</h2>
    <div class="flex items-center">
      <span v-if="type === 'currency'" class="text-xl font-medium text-text-secondary mr-2">$</span>
      <input 
        type="number" 
        :value="modelValue" 
        @input="handleInput"
        class="input-field w-full text-xl p-3 rounded-md"
      >
      <span v-if="type === 'percent'" class="text-xl font-medium text-text-secondary ml-2">%</span>
    </div>
    <p v-if="description" class="text-xs text-text-secondary mt-2 italic">{{ description }}</p>
  </div>
</template>