<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount } from 'vue';
const props = defineProps<{ id?: string; content: string }>();
const show = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const popupRef = ref<HTMLElement | null>(null);
const styleObj = ref<Record<string, string>>({ position: 'fixed', top: '0px', left: '0px', transform: 'translateX(-50%)' });

function open() {
  show.value = true;
  // compute position after render
  nextTick(() => positionPopup());
}
function close() {
  show.value = false;
}

function positionPopup() {
  const trigger = triggerRef.value;
  const popup = popupRef.value;
  if (!trigger || !popup) return;
  const rect = trigger.getBoundingClientRect();
  // default: show below trigger, centered
  let left = rect.left + rect.width / 2;
  let top = rect.bottom + 8;

  // temporarily place popup to measure its height
  styleObj.value.left = `${left}px`;
  styleObj.value.top = `${top}px`;
  styleObj.value.transform = 'translateX(-50%)';

  // measure and adjust if it would overflow bottom
  const popupRect = popup.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  if (top + popupRect.height + 8 > viewportHeight) {
    // place above trigger
    top = rect.top - 8 - popupRect.height;
    styleObj.value.top = `${Math.max(8, top)}px`;
  }

  // clamp left to viewport with padding
  const padding = 8;
  const minLeft = padding + popupRect.width / 2;
  const maxLeft = window.innerWidth - padding - popupRect.width / 2;
  if (left < minLeft) left = minLeft;
  if (left > maxLeft) left = maxLeft;
  styleObj.value.left = `${left}px`;
}

function onWindowResize() {
  if (show.value) nextTick(() => positionPopup());
}

window.addEventListener('resize', onWindowResize);
onBeforeUnmount(() => window.removeEventListener('resize', onWindowResize));
</script>

<template>
  <div class="inline-block" ref="triggerRef">
    <slot name="trigger" :open="open" :close="close" :show="show"></slot>
  </div>

  <teleport to="body">
    <div v-if="show" ref="popupRef" :id="props.id" role="tooltip" :style="styleObj" class="z-50 w-72 p-3 bg-white text-sm text-gray-800 border rounded-md shadow-lg pointer-events-auto">
      {{ props.content }}
    </div>
  </teleport>
</template>

<style scoped>
/* ensure the teleported popup uses the inline styles for positioning */
</style>
