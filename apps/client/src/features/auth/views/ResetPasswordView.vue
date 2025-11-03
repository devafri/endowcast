<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-slate-800">Reset Your Password</h2>
        <p class="text-slate-600 mt-2">Enter and confirm your new password.</p>
      </div>

      <form @submit.prevent="handleResetPassword">
        <div v-if="message" class="mb-4 p-3 rounded-md bg-green-50 text-green-700 border border-green-200">
          {{ message }}
        </div>
        <div v-if="error" class="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          {{ error }}
        </div>

        <div class="space-y-6">
          <div>
            <label for="password" class="block text-sm font-medium text-slate-700">New Password</label>
            <div class="mt-1">
              <input
                v-model="password"
                id="password"
                name="password"
                type="password"
                required
                class="input-field w-full p-3 rounded-md bg-white border border-gray-300 focus:ring-2 focus:ring-brand focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-slate-700">Confirm New Password</label>
            <div class="mt-1">
              <input
                v-model="confirmPassword"
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                class="input-field w-full p-3 rounded-md bg-white border border-gray-300 focus:ring-2 focus:ring-brand focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full btn-primary disabled:bg-slate-400"
            >
              <span v-if="isLoading">Resetting...</span>
              <span v-else>Reset Password</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApi } from '@/shared/services/api';

const route = useRoute();
const router = useRouter();
const api = useApi();

const password = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);
const message = ref('');
const error = ref('');

const token = ref('');
const userId = ref('');

onMounted(() => {
  token.value = route.query.token;
  userId.value = route.query.uid;

  if (!token.value || !userId.value) {
    error.value = 'Invalid password reset link. The token or user ID is missing.';
  }
});

async function handleResetPassword() {
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.';
    return;
  }
  if (!token.value || !userId.value) {
    error.value = 'Cannot reset password without a valid token and user ID.';
    return;
  }

  isLoading.value = true;
  message.value = '';
  error.value = '';

  try {
    const response = await api.post('/auth/reset-password', {
      token: token.value,
      userId: userId.value,
      password: password.value,
    });
    message.value = (response.message || 'Password has been reset successfully.') + ' You will be redirected to login shortly.';
    
    setTimeout(() => {
      router.push('/login');
    }, 3000);

  } catch (err) {
    error.value = err.response?.data?.error || 'An unexpected error occurred. Please try again.';
  } finally {
    isLoading.value = false;
  }
}
</script>
