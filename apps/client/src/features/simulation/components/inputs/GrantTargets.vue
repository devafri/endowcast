<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => Array(10).fill(0),
  },
  years: {
    type: Number,
    default: 10,
  },
  startYear: {
    type: Number,
    default: undefined,
  },
});
const emit = defineEmits(['update:modelValue']);

// Local copy to avoid mutating prop directly
const targets = ref([...props.modelValue.slice(0, props.years), ...Array(Math.max(0, props.years - props.modelValue.length)).fill(0)]);

// Watch for changes to both modelValue and years
watch(() => ({ modelValue: props.modelValue, years: props.years }), 
  ({ modelValue, years }) => {
    // Resize targets array to match current years value
    const newTargets = [...modelValue.slice(0, years)];
    // Pad with zeros if needed
    while (newTargets.length < years) {
      newTargets.push(0);
    }
    targets.value = newTargets;
  }, 
  { deep: true }
);

// Emit updates when targets change
watch(targets, (nv) => {
  emit('update:modelValue', nv.map(v => Number(v) || 0));
}, { deep: true });
</script>

<template>
  <!-- Intentionally no outer card wrapper. The parent provides the card and title. -->
  <div>
    <p class="text-sm text-text-secondary mb-6">Set a target total grant amount for each year. The model will add grants as needed to meet this target, but will not reduce grants if the spending policy already provides more.</p>
    <div class="grant-grid">
      <div v-for="(val, idx) in targets" :key="idx" class="grant-item">
        <label class="year-chip" :aria-label="props.startYear ? String((props.startYear||0) + idx) : `Year ${idx+1}`">
          {{ props.startYear ? ((props.startYear||0) + idx) : `Y${idx + 1}` }}
        </label>
        <div class="prefix-group">
          <span class="prefix">$</span>
          <input
            type="number"
            class="input-field with-prefix text-base rounded-md font-mono"
            :value="val"
            @input="targets[idx] = Number(($event.target).value)"
            min="0"
            step="10000"
            placeholder="0"
            style="min-width: 140px;"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grant-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  margin-bottom: 1rem;
}

.grant-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.year-chip {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  padding: 0.25rem 0.5rem;
  background-color: #f3f4f6;
  border-radius: 0.25rem;
  border: 1px solid #e5e7eb;
}

.prefix-group {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
  min-width: 160px;
}

.prefix {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
  z-index: 10;
  pointer-events: none;
}

.input-field {
  width: 100%;
  min-width: 140px;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s ease-in-out;
  background-color: white;
}

.input-field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.input-field:hover {
  border-color: #9ca3af;
}

.with-prefix {
  padding-left: 2.25rem;
}

/* Ensure number formatting looks good for large values */
.input-field[type="number"] {
  text-align: right;
  padding-right: 0.75rem;
}

/* Hide number input arrows for cleaner look */
.input-field[type="number"]::-webkit-outer-spin-button,
.input-field[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input-field[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>