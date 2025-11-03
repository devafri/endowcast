<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full space-y-8 text-center">
      <div v-if="status === 'loading'" class="space-y-4">
        <h2 class="text-2xl font-bold text-slate-800">Verifying your email...</h2>
        <p class="text-slate-600">Please wait a moment.</p>
        <!-- You can add a spinner here -->
      </div>
      <div v-else-if="status === 'success'" class="bg-white p-8 rounded-lg shadow-md space-y-4">
        <h2 class="text-2xl font-bold text-green-600">Email Verified!</h2>
        <p class="text-slate-600">Your email address has been successfully verified. You can now log in to your account.</p>
        <RouterLink to="/login" class="btn-primary inline-block w-full">
          Proceed to Login
        </RouterLink>
      </div>
      <div v-else-if="status === 'error'" class="bg-white p-8 rounded-lg shadow-md space-y-4">
        <h2 class="text-2xl font-bold text-red-600">Verification Failed</h2>
        <p class="text-slate-600">{{ errorMessage || 'The verification link is invalid or has expired.' }}</p>
        <p class="text-slate-600">You can request a new verification link.</p>
        <RouterLink to="/login" class="text-sm font-medium text-brand hover:text-brand-dark">
          Back to Login
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const status = ref('loading'); // 'loading', 'success', 'error'
const errorMessage = ref('');

onMounted(() => {
  // The backend redirects to /auth/verify-email/success or /auth/verify-email/error
  // We can just check the path to determine the status.
  if (router.currentRoute.value.path.includes('/success')) {
    status.value = 'success';
  } else {
    status.value = 'error';
    errorMessage.value = route.query.message || 'The verification link is invalid or has expired.';
  }
});
</script>
