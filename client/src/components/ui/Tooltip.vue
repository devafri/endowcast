<template>
  <div class="relative inline-block">
    <div 
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
      class="cursor-help"
    >
      <slot name="trigger">
        <svg class="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
      </slot>
    </div>
    
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div 
        v-if="showTooltip"
        :class="[
          'absolute z-50 px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg shadow-sm',
          'max-w-6xl min-w-[10rem] break-words leading-relaxed',
          position === 'top' ? 'bottom-full left-1/2 transform -translate-x-1/2 mb-2' :
          position === 'bottom' ? 'top-full left-1/2 transform -translate-x-1/2 mt-2' :
          position === 'left' ? 'right-full top-1/2 transform -translate-y-1/2 mr-2' :
          'left-full top-1/2 transform -translate-y-1/2 ml-2'
        ]"
      >
        <slot>{{ text }}</slot>
        
        <!-- Arrow -->
        <div 
          :class="[
            'absolute w-2 h-2 bg-gray-600 transform rotate-45',
            position === 'top' ? 'top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2' :
            position === 'bottom' ? 'bottom-full left-1/2 transform -translate-x-1/2 translate-y-1/2' :
            position === 'left' ? 'left-full top-1/2 transform -translate-x-1/2 -translate-y-1/2' :
            'right-full top-1/2 transform translate-x-1/2 -translate-y-1/2'
          ]"
        ></div>
      </div>
    </Transition>
  </div>

  <!-- Current tagline is small and hard to read -->
  <div class="text-xs text-gray-500">Strategic Forecasting Platform</div>

  <!-- Suggested improvement -->
  <div class="text-sm text-gray-600 font-medium">Endowment Analytics</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  text?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}>();

const showTooltip = ref(false);
</script>
