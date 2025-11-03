<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
      <div class="text-center mb-8">
        <h2 class="text-2xl font-bold text-slate-800">Forgot Password</h2>
        <p class="text-slate-600 mt-2">Enter your email address and we'll send you a link to reset your password.</p>
      </div>

      <form @submit.prevent="handleForgotPassword">
        <div v-if="message" class="mb-4 p-3 rounded-md bg-green-50 text-green-700 border border-green-200">
          {{ message }}
        </div>
        <div v-if="error" class="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          {{ error }}
        </div>

        <div class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-slate-700">Email address</label>
            <div class="mt-1">
              <input
                v-model="email"
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                class="input-field w-full p-3 rounded-md bg-white border border-gray-300 focus:ring-2 focus:ring-brand focus:outline-none"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full btn-primary disabled:bg-slate-400"
            >
              <span v-if="isLoading">Sending...</span>
              <span v-else>Send Reset Link</span>
            </button>
          </div>
        </div>
      </form>

      <div class="mt-6 text-center">
        <RouterLink to="/login" class="text-sm font-medium text-brand hover:text-brand-dark">
          Back to Login
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useApi } from '@/shared/services/api';

const email = ref('');
const isLoading = ref(false);
const message = ref('');
const error = ref('');

const api = useApi();

async function handleForgotPassword() {
  isLoading.value = true;
  message.value = '';
  error.value = '';

  try {
    const response = await api.post('/auth/forgot-password', { email: email.value });
    // useApi returns parsed JSON directly, not an axios Response
    message.value = response.message || 'If an account with that email exists, a password reset link has been sent.';
  } catch (err) {
    error.value = err.response?.data?.error || 'An unexpected error occurred. Please try again.';
  } finally {
    isLoading.value = false;
  }
}
</script>
