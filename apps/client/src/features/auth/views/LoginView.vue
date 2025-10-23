<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const errorMessage = ref('');

const formData = ref({
  email: '',
  password: '',
  rememberMe: false
});

async function handleLogin() {
  try {
    errorMessage.value = '';
    
    const result = await authStore.login(
      formData.value.email, 
      formData.value.password, 
      formData.value.rememberMe
    );
    
    if (result.success) {
      const redirectTo = router.currentRoute.value.query.redirect as string;
      router.push(redirectTo || '/settings');
    } else {
      errorMessage.value = result.error || 'Login failed. Please try again.';
    }
  } catch (error) {
    console.error('Login error:', error);
    errorMessage.value = 'An unexpected error occurred. Please try again.';
  }
}
</script>

<template>
  <main class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-2xl shadow-lg p-10">
        <!-- Logo & Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center mb-4 w-14 h-14 rounded-xl bg-indigo-600">
            <span class="text-white text-xl font-bold">E</span>
          </div>
          <h1 class="text-2xl font-semibold text-gray-900 mb-2">Welcome Back</h1>
          <p class="text-gray-500 text-sm">Sign in to your account</p>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              v-model="formData.email"
              type="email"
              required
              placeholder="you@example.com"
              class="w-full p-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-100 focus:outline-none"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-sm font-medium text-gray-700">Password</label>
              <a href="#" class="text-sm text-indigo-600 hover:text-indigo-700">Forgot password?</a>
            </div>
            <input
              v-model="formData.password"
              type="password"
              required
              placeholder="••••••••"
              class="w-full p-3 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring focus:ring-indigo-100 focus:outline-none"
            />
          </div>

          <div class="flex items-center text-sm text-gray-600">
            <input
              v-model="formData.rememberMe"
              type="checkbox"
              id="remember-me"
              class="mr-2"
            />
            <label for="remember-me">Remember me</label>
          </div>

          <div v-if="errorMessage" class="text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-md">
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            :disabled="authStore.isLoading"
            class="w-full py-3 bg-indigo-700 text-white font-semibold rounded-lg hover:bg-indigo-900 focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <div v-if="authStore.isLoading" class="flex items-center justify-center">
              <svg class="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              Signing in...
            </div>
            <div v-else>Sign In</div>
          </button>

          <p class="text-center text-sm text-gray-500 pt-4">
            Don't have an account? 
            <RouterLink to="/register" class="text-indigo-600 hover:text-indigo-700 font-medium">Sign up</RouterLink>
          </p>
        </form>
      </div>
    </div>
  </main>
</template>
