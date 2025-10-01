<template>
  <OnboardingHelper 
    variant="info"
    title="Getting Started"
    description="Configure your endowment parameters in order:"
    :steps="settingsSteps"
    tip="💡 Tip: Default assumptions are based on institutional best practices"
    :show-dismiss="showDismiss"
    @dismiss="$emit('dismiss')"
  />
</template>

<script setup lang="ts">
import OnboardingHelper from './OnboardingHelper.vue';

interface Props {
  showDismiss?: boolean;
}

interface Emits {
  (e: 'dismiss'): void;
}

withDefaults(defineProps<Props>(), {
  showDismiss: false
});

defineEmits<Emits>();

const settingsSteps = [
  { title: 'Basic Parameters', description: 'Set your endowment size and spending policy' },
  { title: 'Asset Allocation', description: 'Define your investment mix across asset classes' },
  { title: 'Market Assumptions', description: 'Adjust expected returns and volatility (optional)' },
  { title: 'Advanced Settings', description: 'Fine-tune simulation parameters (optional)' }
];
</script>
