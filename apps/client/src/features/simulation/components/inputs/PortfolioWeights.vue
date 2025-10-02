<script setup>
import { computed, reactive, watch } from 'vue';

// Props / Emits for v-model usage
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  },
  // Optional custom categories if caller wants to override
  categories: {
    type: Array,
    default: () => ([
      // Defaults and ranges aligned with the vanilla HTML/JS implementation
      { key: 'publicEquity', label: 'Public Equity', default: 50, min: 50, max: 70 },
      { key: 'privateEquity', label: 'Private Equity', default: 15, min: 5, max: 25 },
      { key: 'publicFixedIncome', label: 'Public Fixed Income', default: 18, min: 5, max: 30 },
      { key: 'privateCredit', label: 'Private Credit', default: 4, min: 0, max: 10 },
      { key: 'realAssets', label: 'Real Assets', default: 6, min: 0, max: 20 },
      { key: 'diversifying', label: 'Diversifying Strategies', default: 7, min: 0, max: 20 },
      { key: 'cashShortTerm', label: 'Cash/Short-Term', default: 0, min: 0, max: 10 },
    ])
  }
});
const emit = defineEmits(['update:modelValue']);

// Local reactive state derived from modelValue or defaults
const weights = reactive(Object.fromEntries(
  props.categories.map(c => [c.key, props.modelValue?.[c.key] ?? c.default])
));

// Lock map per asset
const locked = reactive(Object.fromEntries(props.categories.map(c => [c.key, false])));

const categoryList = computed(() => props.categories.map(c => ({ ...c, value: weights[c.key] ?? 0, locked: !!locked[c.key] })));

const total = computed(() => Object.values(weights).reduce((a, b) => a + Number(b || 0), 0));

// Keep external modelValue updated
watch(weights, () => { emit('update:modelValue', { ...weights }); }, { deep: true });

// When the parent modelValue changes externally, sync it back in
watch(() => props.modelValue, (nv) => {
  if (!nv) return;
  for (const k of Object.keys(weights)) {
    if (typeof nv[k] === 'number') weights[k] = nv[k];
  }
}, { deep: true });

// If limits (min/max) change from parent, clamp current weights to the new bounds
watch(() => props.categories, (nv) => {
  if (!Array.isArray(nv)) return;
  for (const c of nv) {
    const min = c.min ?? 0;
    const max = c.max ?? 100;
    const v = Number(weights[c.key] ?? 0);
    if (v < min) weights[c.key] = min;
    if (v > max) weights[c.key] = max;
  }
}, { deep: true });

function onChange(key, val, min, max) {
  const v = Math.max(min ?? 0, Math.min(max ?? 100, Number(val)));
  weights[key] = v;
}

function resetToDefaults() {
  for (const c of props.categories) {
    if (!locked[c.key]) weights[c.key] = c.default;
  }
}

// Preset allocations (percent). These will be normalized to respect min/max and sum to 100.
const PRESETS = {
  Conservative: {
    publicEquity: 40,
    privateEquity: 5,
    publicFixedIncome: 35,
    privateCredit: 5,
    realAssets: 5,
    diversifying: 8,
    cashShortTerm: 2,
  },
  Balanced: {
    publicEquity: 50,
    privateEquity: 15,
    publicFixedIncome: 18,
    privateCredit: 4,
    realAssets: 6,
    diversifying: 7,
    cashShortTerm: 0,
  },
  Growth: {
    publicEquity: 60,
    privateEquity: 20,
    publicFixedIncome: 8,
    privateCredit: 4,
    realAssets: 4,
    diversifying: 3,
    cashShortTerm: 1,
  }
};

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  // 1) Start with preset; 2) clamp to min/max; 3) normalize to 100 while staying within bounds
  const clamped = {};
  const mins = {};
  const maxs = {};
  let sum = 0;
  for (const c of props.categories) {
    // Keep locked at current value, otherwise take preset
    const v = locked[c.key] ? Number(weights[c.key] ?? 0) : Number(preset[c.key] ?? 0);
    const v2 = Math.max(c.min ?? 0, Math.min(c.max ?? 100, v));
    clamped[c.key] = v2;
    mins[c.key] = c.min ?? 0;
    maxs[c.key] = c.max ?? 100;
    sum += v2;
  }
  // If sum already ~100, just assign
  if (Math.abs(sum - 100) < 0.001) {
    for (const k in clamped) weights[k] = clamped[k];
    return;
  }
  // Otherwise scale the free ranges proportionally
  // Determine available upward/downward movement
  const roomUp = {};
  const roomDown = {};
  let totalUp = 0, totalDown = 0;
  for (const c of props.categories) {
    const k = c.key;
    // Locked assets are not adjusted further
    roomUp[k] = locked[k] ? 0 : (maxs[k] - clamped[k]);
    roomDown[k] = locked[k] ? 0 : (clamped[k] - mins[k]);
    totalUp += roomUp[k];
    totalDown += roomDown[k];
  }
  const target = 100;
  if (sum < target && totalUp > 0) {
    const need = target - sum;
    for (const c of props.categories) {
      const k = c.key;
      if (!locked[k]) {
        const add = need * (roomUp[k] / totalUp || 0);
        clamped[k] = Math.min(maxs[k], clamped[k] + add);
      }
    }
  } else if (sum > target && totalDown > 0) {
    const cut = sum - target;
    for (const c of props.categories) {
      const k = c.key;
      if (!locked[k]) {
        const sub = cut * (roomDown[k] / totalDown || 0);
        clamped[k] = Math.max(mins[k], clamped[k] - sub);
      }
    }
  }
  // Final rounding to integers while keeping total 100 by greedy adjust
  const rounded = {};
  let rsum = 0;
  for (const c of props.categories) {
    const k = c.key;
    const r = Math.round(clamped[k]);
    rounded[k] = Math.max(mins[k], Math.min(maxs[k], r));
    rsum += rounded[k];
  }
  // Adjust small drift to exactly 100
  const diff = 100 - rsum;
  if (diff !== 0) {
    // sort by fractional part closeness for fair adjustment
    const order = props.categories
      .map(c => ({ k: c.key, frac: clamped[c.key] - Math.floor(clamped[c.key]) }))
      .sort((a,b) => diff > 0 ? b.frac - a.frac : a.frac - b.frac)
      .filter(item => !locked[item.k]);
    let remaining = Math.abs(diff);
    for (const item of order) {
      if (remaining === 0) break;
      const k = item.k;
      if (diff > 0 && rounded[k] < maxs[k]) { rounded[k]++; remaining--; }
      else if (diff < 0 && rounded[k] > mins[k]) { rounded[k]--; remaining--; }
    }
  }
  for (const k in rounded) weights[k] = rounded[k];
}

function rebalanceTo100() {
  // Start from current weights, clamp to min/max, then adjust only unlocked to total 100
  const mins = {}, maxs = {}, current = {};
  let sum = 0;
  for (const c of props.categories) {
    const min = c.min ?? 0, max = c.max ?? 100;
    const v = Math.max(min, Math.min(max, Number(weights[c.key] ?? 0)));
    current[c.key] = v; mins[c.key] = min; maxs[c.key] = max; sum += v;
  }
  const roomUp = {}, roomDown = {};
  let totalUp = 0, totalDown = 0;
  for (const c of props.categories) {
    const k = c.key;
    roomUp[k] = locked[k] ? 0 : (maxs[k] - current[k]);
    roomDown[k] = locked[k] ? 0 : (current[k] - mins[k]);
    totalUp += roomUp[k]; totalDown += roomDown[k];
  }
  const target = 100;
  if (sum < target && totalUp > 0) {
    const need = target - sum;
    for (const c of props.categories) {
      const k = c.key; if (!locked[k]) {
        const add = need * (roomUp[k] / totalUp || 0);
        current[k] = Math.min(maxs[k], current[k] + add);
      }
    }
  } else if (sum > target && totalDown > 0) {
    const cut = sum - target;
    for (const c of props.categories) {
      const k = c.key; if (!locked[k]) {
        const sub = cut * (roomDown[k] / totalDown || 0);
        current[k] = Math.max(mins[k], current[k] - sub);
      }
    }
  }
  // Round and finalize
  let rounded = {}, rsum = 0;
  for (const c of props.categories) {
    const k = c.key; const r = Math.round(current[k]);
    rounded[k] = Math.max(mins[k], Math.min(maxs[k], r)); rsum += rounded[k];
  }
  let diff = 100 - rsum;
  if (diff !== 0) {
    const order = props.categories
      .map(c => ({ k: c.key, frac: current[c.key] - Math.floor(current[c.key]) }))
      .sort((a,b) => diff > 0 ? b.frac - a.frac : a.frac - b.frac)
      .filter(item => !locked[item.k]);
    for (const item of order) {
      if (diff === 0) break; const k = item.k;
      if (diff > 0 && rounded[k] < maxs[k]) { rounded[k]++; diff--; }
      else if (diff < 0 && rounded[k] > mins[k]) { rounded[k]--; diff++; }
    }
  }
  for (const c of props.categories) weights[c.key] = rounded[c.key];
}
</script>

<template>
  <!-- Intentionally no outer card wrapper: parent provides the card and header -->
  <div>
    <!-- Instruction text with better spacing -->
    <div class="mb-6">
      <p class="text-base text-gray-700 font-medium leading-relaxed">
        Adjust the sliders to set your target allocation (must total 100%).
      </p>
    </div>

    <!-- Controls and total with improved layout -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div class="flex flex-wrap items-center gap-2">
        <div class="hidden sm:flex items-center space-x-2">
          <button type="button" class="btn-secondary py-2 px-4 text-sm font-medium" @click="applyPreset('Conservative')">Conservative</button>
          <button type="button" class="btn-secondary py-2 px-4 text-sm font-medium" @click="applyPreset('Balanced')">Balanced</button>
          <button type="button" class="btn-secondary py-2 px-4 text-sm font-medium" @click="applyPreset('Growth')">Growth</button>
        </div>
        <button type="button" class="btn-secondary py-2 px-4 text-sm font-medium" @click="resetToDefaults">Reset</button>
      </div>
      
      <div class="text-right bg-white rounded-lg px-3 py-2 border-2 border-gray-200 min-w-0 shrink-0">
        <div
          class="text-xl sm:text-2xl font-bold whitespace-nowrap"
          :class="Math.round(total) === 100 ? 'text-green-600' : 'text-amber-600'"
          aria-live="polite"
        >
          {{ total.toFixed(1) }}%
        </div>
        <div class="text-xs sm:text-sm text-gray-500 font-medium whitespace-nowrap">Total Allocation</div>
      </div>
    </div>

    <!-- Mobile preset buttons with better spacing -->
    <div class="sm:hidden mb-6">
      <p class="text-sm font-medium text-gray-600 mb-3">Quick Presets:</p>
      <div class="grid grid-cols-3 gap-2">
        <button type="button" class="btn-secondary py-2 px-3 text-sm" @click="applyPreset('Conservative')">Conservative</button>
        <button type="button" class="btn-secondary py-2 px-3 text-sm" @click="applyPreset('Balanced')">Balanced</button>
        <button type="button" class="btn-secondary py-2 px-3 text-sm" @click="applyPreset('Growth')">Growth</button>
      </div>
    </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
      <div v-for="c in categoryList" :key="c.key" class="space-y-3">
        <div class="flex items-center justify-between mb-2">
          <span class="text-base font-semibold text-gray-800 flex items-center">
            <input 
              type="checkbox" 
              v-model="locked[c.key]" 
              class="mr-3 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" 
              :aria-label="`Lock ${c.label}`" 
            />
            <span :class="c.locked ? 'opacity-60' : ''">{{ c.label }}</span>
          </span>
          <div class="flex items-center space-x-2">
            <span class="badge text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">min {{ c.min ?? 0 }}%</span>
            <span class="badge text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">max {{ c.max ?? 100 }}%</span>
            <span class="value-pill text-sm font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">{{ (weights[c.key] ?? 0).toFixed(0) }}%</span>
          </div>
        </div>
        <input
          type="range"
          class="slider-thumb"
          :min="c.min ?? 0"
          :max="c.max ?? 100"
          step="1"
          :value="weights[c.key]"
          :disabled="c.locked"
          @input="onChange(c.key, $event.target.value, c.min, c.max)"
          :aria-label="`Adjust ${c.label} weight`"
        />
      </div>
    </div>
  </div>
  
</template>