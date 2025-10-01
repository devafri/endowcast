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
      // Check if there's a redirect query parameter
      const redirectTo = router.currentRoute.value.query.redirect as string;
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        // Default redirect to settings for authenticated users
        router.push('/settings');
      }
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
  <main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12">
    <div class="max-w-md w-full px-4">
      <div class="card p-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="flex items-center justify-center mb-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <span class="text-white font-bold text-xl">E</span>
            </div>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
          <p class="text-gray-600">Sign in to your EndowCast account</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input 
              v-model="formData.email" 
              type="email" 
              required 
              class="input-field w-full p-3 rounded-md"
              placeholder="john.doe@university.edu"
            />
          </div>

          <!-- Password -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">Password</label>
              <a href="#" class="text-sm text-blue-600 hover:text-blue-700">Forgot password?</a>
            </div>
            <input 
              v-model="formData.password" 
              type="password" 
              required 
              class="input-field w-full p-3 rounded-md"
              placeholder="••••••••"
            />
          </div>

          <!-- Remember Me -->
          <div class="flex items-center">
            <input 
              v-model="formData.rememberMe" 
              type="checkbox" 
              id="remember-me" 
              class="mr-3"
            />
            <label for="remember-me" class="text-sm text-gray-600">Remember me</label>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p class="text-red-600 text-sm">{{ errorMessage }}</p>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            :disabled="authStore.isLoading"
            class="btn-primary w-full py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div v-if="authStore.isLoading" class="flex items-center justify-center">
              <div class="loading-spinner-small mr-3"></div>
              Signing in...
            </div>
            <div v-else>
              Sign In
            </div>
          </button>

          <!-- Signup Link -->
          <div class="text-center pt-4 border-t border-gray-200">
            <p class="text-gray-600">
              Don't have an account? 
              <RouterLink to="/signup" class="text-blue-600 hover:text-blue-700 font-medium">Sign up</RouterLink>
            </p>
          </div>
        </form>
      </div>

      <!-- Features Preview -->
      <div class="mt-8 text-center">
        <p class="text-gray-600 text-sm mb-4">Trusted by investment professionals</p>
        <div class="flex justify-center space-x-6 text-xs text-gray-500">
          <div class="flex items-center">
            <svg class="w-4 h-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            Secure & Private
          </div>
          <div class="flex items-center">
            <svg class="w-4 h-4 text-blue-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            Monte Carlo Analysis
          </div>
          <div class="flex items-center">
            <svg class="w-4 h-4 text-purple-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            Professional Reports
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
