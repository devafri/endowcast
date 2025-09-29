<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const errorMessage = ref('');

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  organizationName: '',
  jobTitle: ''
});

// Multi-tenant organizations get FREE plan by default
const selectedPlan = {
  name: 'Free Plan',
  price: '$0',
  period: '10 simulations/month'
};

// Multi-tenant signup doesn't require plan selection - all new organizations start with FREE plan

const roleOptions = [
  'Investment Committee Member',
  'CFO',
  'Investment Officer', 
  'Board Member',
  'Finance Director',
  'Controller',
  'Financial Advisor',
  'Consultant',
  'Portfolio Manager',
  'Other'
];

async function handleSignup() {
  if (formData.value.password !== formData.value.confirmPassword) {
    errorMessage.value = 'Passwords do not match';
    return;
  }

  try {
    errorMessage.value = '';
    
    const result = await authStore.signup({
      firstName: formData.value.firstName,
      lastName: formData.value.lastName,
      email: formData.value.email,
      password: formData.value.password,
      organizationName: formData.value.organizationName,
      jobTitle: formData.value.jobTitle,
    });
    
    if (result.success) {
      // Redirect to settings page after successful signup
      router.push('/settings');
    } else {
      errorMessage.value = result.error || 'Registration failed. Please try again.';
    }
  } catch (error) {
    console.error('Signup error:', error);
    errorMessage.value = 'An unexpected error occurred. Please try again.';
  }
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <!-- Left Column: Form -->
        <div class="card p-8">
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
            <p class="text-gray-600">Start your journey with EndowCast strategic forecasting</p>
          </div>

          <form @submit.prevent="handleSignup" class="space-y-6">
            <!-- Name Fields -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input 
                  v-model="formData.firstName" 
                  type="text" 
                  required 
                  class="input-field w-full p-3 rounded-md"
                  placeholder="John"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input 
                  v-model="formData.lastName" 
                  type="text" 
                  required 
                  class="input-field w-full p-3 rounded-md"
                  placeholder="Doe"
                />
              </div>
            </div>

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

            <!-- Password Fields -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input 
                  v-model="formData.password" 
                  type="password" 
                  required 
                  minlength="8"
                  class="input-field w-full p-3 rounded-md"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <input 
                  v-model="formData.confirmPassword" 
                  type="password" 
                  required 
                  minlength="8"
                  class="input-field w-full p-3 rounded-md"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <!-- Organization -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
              <input 
                v-model="formData.organizationName" 
                type="text" 
                required 
                class="input-field w-full p-3 rounded-md"
                placeholder="University of Example"
              />
            </div>

            <!-- Role -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select 
                v-model="formData.jobTitle" 
                required 
                class="input-field w-full p-3 rounded-md"
              >
                <option value="">Select your role</option>
                <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
              </select>
            </div>

            <!-- Plan Selection -->
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <label class="block text-sm font-medium text-gray-700 mb-3">Your Plan</label>
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-semibold text-gray-900">{{ selectedPlan.name }}</div>
                  <div class="text-sm text-gray-600">{{ selectedPlan.price }} - {{ selectedPlan.period }}</div>
                  <div class="text-xs text-gray-500 mt-1">You can upgrade after creating your organization</div>
                </div>
              </div>
            </div>

            <!-- Terms -->
            <div class="flex items-start">
              <input type="checkbox" required class="mt-1 mr-3" id="terms" />
              <label for="terms" class="text-sm text-gray-600">
                I agree to the <router-link to="/terms" class="text-blue-600 hover:text-blue-700 underline">Terms of Service</router-link> and <router-link to="/privacy" class="text-blue-600 hover:text-blue-700 underline">Privacy Policy</router-link>
              </label>
            </div>

            <!-- Submit Button -->
            <button 
              type="submit" 
              :disabled="authStore.isLoading"
              class="btn-primary w-full py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div v-if="authStore.isLoading" class="flex items-center justify-center">
                <div class="loading-spinner-small mr-3"></div>
                Creating Account...
              </div>
              <div v-else>
                Create Account
              </div>
            </button>

            <!-- Error Message -->
            <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-md p-4">
              <div class="flex">
                <svg class="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>
                <p class="text-sm text-red-700">{{ errorMessage }}</p>
              </div>
            </div>

            <!-- Login Link -->
            <div class="text-center pt-4 border-t border-gray-200">
              <p class="text-gray-600">
                Already have an account? 
                <RouterLink to="/login" class="text-blue-600 hover:text-blue-700 font-medium">Sign in</RouterLink>
              </p>
            </div>
          </form>
        </div>

        <!-- Right Column: Benefits -->
        <div class="space-y-6">
          <!-- Plan Benefits -->
          <div class="card p-6">
            <h3 class="text-xl font-semibold text-gray-900 mb-4">What you get with {{ selectedPlan.name }}:</h3>
            <div class="space-y-3">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">10 simulations per month</span>
              </div>
              <div class="flex items-center">
                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Multi-user organization</span>
              </div>
              <div class="flex items-center">
                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Basic portfolio allocation</span>
              </div>
              <div class="flex items-center">
                <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">No credit card required</span>
              </div>
            </div>
          </div>

          <!-- Security & Trust -->
          <div class="card p-6">
            <h3 class="text-xl font-semibold text-gray-900 mb-4">Security & Trust</h3>
            <div class="space-y-3">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 1L5 4v6c0 5.55 3.84 12 5 12s5-6.45 5-12V4l-5-3z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Secure password encryption</span>
              </div>
              <div class="flex items-center">
                <svg class="w-5 h-5 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Organization data isolation</span>
              </div>
              <div class="flex items-center">
                <svg class="w-5 h-5 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd"></path>
                </svg>
                <span class="text-gray-700">Multi-tenant architecture</span>
              </div>
            </div>
          </div>

          <!-- Support -->
          <div class="card p-6">
            <h3 class="text-xl font-semibold text-gray-900 mb-4">Need Help?</h3>
            <p class="text-gray-600 mb-4">Our team is here to support your success with EndowCast.</p>
            <div class="flex items-center text-sm text-blue-600">
              <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
              </svg>
              <span>support@endowcast.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
