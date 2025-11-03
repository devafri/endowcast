<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '@/features/auth/stores/auth';
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline';

const router = useRouter();
const authStore = useAuthStore();
const errorMessage = ref('');

const formData = ref({
  email: '',
  password: '',
  rememberMe: false
});

// UI state: reveal password
const showPassword = ref(false);

async function handleLogin() {
  try {
    errorMessage.value = '';

    const result = await authStore.login(
      formData.value.email,
      formData.value.password,
      formData.value.rememberMe
    );

    if (result?.success) {
      const redirectTo = (router.currentRoute.value.query.redirect as string) || '/results';
      router.push(redirectTo);
    } else {
      errorMessage.value = result?.error || 'Login failed. Please check your credentials.';
    }
  } catch (error) {
    console.error('Login error:', error);
    errorMessage.value = 'An unexpected error occurred. Please try again.';
  }
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center px-6 py-12 font-inter">
    <div class="w-full max-w-5xl bg-white shadow-2xl rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
<!-- Left Side - Improved Visual Balance -->
<div class="hidden md:flex flex-col justify-center items-center relative bg-gradient-to-br from-white to-blue-50 text-gray-900 p-8 lg:p-12">
  <div class="absolute inset-0 bg-[url('/src/shared/assets/pattern.svg')] opacity-5"></div>
  <div class="relative z-10 text-center space-y-8 w-full max-w-sm">
    <!-- Logo Section - Larger and More Prominent -->
    <RouterLink to="/" class="flex items-center justify-center gap-4 group">
      <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-700 to-slate-200 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M6 5H18V8H6V5ZM6 10H15V13H6V10ZM6 15H18V18H6V15Z" />
        </svg>
      </div>
      <div class="text-left">
        <div class="text-2xl font-bold text-gray-900 leading-tight">EndowCast</div>
        <div class="text-sm text-gray-600 font-medium">Endowment Analytics</div>
      </div>
    </RouterLink>

    <!-- Description - Larger and Better Spaced -->
    <div class="space-y-4">
      <p class="text-gray-600 text-lg leading-relaxed font-light">
        Run thousands of investment scenarios to evaluate sustainability and guide smarter distribution policies.
      </p>
    </div>


  </div>
</div>

      <!-- Right Side (Login Form) -->
<div class="p-8 md:p-14 bg-white flex flex-col justify-center">
        <div class="max-w-md mx-auto w-full">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-semibold text-gray-900">Welcome back</h1>
            <p class="text-gray-500 text-sm mt-2">Sign in to continue your analysis</p>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-6">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                v-model="formData.email"
                type="email"
                required
                autocomplete="email"
                placeholder="you@organization.org"
                class="w-full p-3.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <label for="password" class="text-sm font-medium text-gray-700">Password</label>
                <RouterLink to="/auth/forgot-password" class="text-sm text-blue-700 hover:text-blue-900 font-medium">Forgot?</RouterLink>
              </div>
              <div class="relative">
                <input
                  id="password"
                  v-model="formData.password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  class="w-full p-3.5 pr-12 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-2 my-auto h-8 px-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
                  :aria-pressed="showPassword"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  <component :is="showPassword ? EyeSlashIcon : EyeIcon" class="w-5 h-5" />
                  <span class="sr-only">{{ showPassword ? 'Hide password' : 'Show password' }}</span>
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between text-sm">
              <label class="flex items-center text-gray-600">
                <input v-model="formData.rememberMe" type="checkbox" class="mr-2 rounded border-gray-300 text-blue-700 focus:ring-blue-500" />
                Remember me
              </label>
            </div>

            <div v-if="errorMessage" class="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-lg">
              {{ errorMessage }}
            </div>

            <button
              type="submit"
              :disabled="authStore.isLoading"
              class="w-full py-3.5 bg-sky-800 text-white font-semibold rounded-xl shadow-md hover:opacity-80 focus:ring-4 focus:ring-blue-200 disabled:opacity-60 transition-all"
            >
              <div v-if="authStore.isLoading" class="flex items-center justify-center">
                <svg class="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Signing in...
              </div>
              <div v-else>Sign in to EndowCast</div>
            </button>
<!--
            <div class="text-center pt-4">
              <p class="text-gray-500 text-sm">Or continue with</p>
              <div class="flex gap-3 justify-center mt-3">
                <button type="button" class="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition font-medium text-gray-700">Google</button>
                <button type="button" class="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition font-medium text-gray-700">SSO</button>
              </div>
            </div>
-->
            <p class="text-center text-sm text-gray-500 pt-4">
              Don't have an account?
              <RouterLink to="/register" class="text-blue-700 hover:text-blue-900 font-medium">Create one</RouterLink>
            </p>
          </form>

          <div class="mt-4 text-sm text-center">
            <RouterLink to="/auth/forgot-password" class="font-medium text-brand hover:text-brand-dark">
              Forgot password?
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.bg-brand {
  background: linear-gradient(135deg, #1e293b, #0f172a, #2563eb);
}
</style>