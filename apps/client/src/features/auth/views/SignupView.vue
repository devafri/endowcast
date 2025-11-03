<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/stores/auth';

// Heroicons Outline
import { CheckCircleIcon, ShieldCheckIcon, EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline';

const router = useRouter();
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

// UI state: reveal password fields
const showPassword = ref(false);
const showConfirmPassword = ref(false);

// Default free plan
const selectedPlan = {
  name: 'Free Plan',
  price: '$0',
  period: '10 simulations/month'
};

// Role options
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
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        <!-- Left Column: Form -->
        <div class="bg-white shadow-2xl rounded-2xl p-10">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">Create Your Account</h1>
          <p class="text-gray-600 mb-8">Start your journey with EndowCast strategic forecasting</p>

          <form @submit.prevent="handleSignup" class="space-y-6">
            <!-- Name -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input v-model="formData.firstName" type="text" required placeholder="John" class="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-700 focus:outline-none" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input v-model="formData.lastName" type="text" required placeholder="Doe" class="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-700 focus:outline-none" />
              </div>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div class="relative">
                <EnvelopeIcon class="absolute w-5 h-5 text-indigo-700 top-3 left-3" />
                <input v-model="formData.email" type="email" required placeholder="john.doe@university.edu" class="w-full rounded-lg border border-gray-300 pl-10 p-3 focus:ring-2 focus:ring-indigo-700 focus:outline-none" />
              </div>
            </div>

            <!-- Password -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div class="relative">
                  <LockClosedIcon class="absolute w-5 h-5 text-indigo-700 top-3 left-3" />
                  <input v-model="formData.password" :type="showPassword ? 'text' : 'password'" required minlength="8" placeholder="••••••••" class="w-full rounded-lg border border-gray-300 pl-10 pr-16 p-3 focus:ring-2 focus:ring-indigo-700 focus:outline-none" />
                  <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100" :aria-pressed="showPassword" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
                    <component :is="showPassword ? EyeSlashIcon : EyeIcon" class="w-5 h-5" />
                    <span class="sr-only">{{ showPassword ? 'Hide password' : 'Show password' }}</span>
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <div class="relative">
                  <LockClosedIcon class="absolute w-5 h-5 text-indigo-700 top-3 left-3" />
                  <input v-model="formData.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" required minlength="8" placeholder="••••••••" class="w-full rounded-lg border border-gray-300 pl-10 pr-16 p-3 focus:ring-2 focus:ring-indigo-700 focus:outline-none" />
                  <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100" :aria-pressed="showConfirmPassword" :aria-label="showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'" @click="showConfirmPassword = !showConfirmPassword">
                    <component :is="showConfirmPassword ? EyeSlashIcon : EyeIcon" class="w-5 h-5" />
                    <span class="sr-only">{{ showConfirmPassword ? 'Hide confirm password' : 'Show confirm password' }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Organization -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
              <input v-model="formData.organizationName" type="text" required placeholder="University of Example" class="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-700 focus:outline-none" />
            </div>

            <!-- Role -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select v-model="formData.jobTitle" required class="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-indigo-700 focus:outline-none">
                <option value="">Select your role</option>
                <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
              </select>
            </div>

            <!-- Plan -->
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div class="font-semibold text-indigo-900">{{ selectedPlan.name }}</div>
              <div class="text-sm text-indigo-700">{{ selectedPlan.price }} - {{ selectedPlan.period }}</div>
              <div class="text-xs text-indigo-500 mt-1">You can upgrade after creating your organization</div>
            </div>

            <!-- Terms -->
            <div class="flex items-start">
              <input type="checkbox" required class="mt-1 mr-3" id="terms" />
              <label for="terms" class="text-sm text-gray-600">
                I agree to the <router-link to="/terms" class="text-indigo-700 hover:text-indigo-800 underline">Terms of Service</router-link> and <router-link to="/privacy" class="text-indigo-700 hover:text-indigo-800 underline">Privacy Policy</router-link>
              </label>
            </div>

            <!-- Submit -->
            <button type="submit" :disabled="authStore.isLoading" class="w-full btn-primary text-white font-semibold py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center">
              <span v-if="authStore.isLoading" class="flex items-center gap-2">
                <svg class="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582M20 20v-5h-.582M4 20v-5h.582M20 4v5h-.582"></path></svg>
                Creating Account...
              </span>
              <span v-else class="flex items-center gap-2">
                <CheckCircleIcon class="w-5 h-5 text-white" /> Create Account
              </span>
            </button>

            <!-- Error -->
            <transition name="fade">
              <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-md p-4 mt-2 shadow-sm flex items-center gap-2 text-red-700">
                <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                <span>{{ errorMessage }}</span>
              </div>
            </transition>

            <!-- Login Link -->
            <p class="text-center text-gray-600 pt-4 border-t border-gray-200">
              Already have an account? <router-link to="/login" class="text-indigo-700 font-medium hover:text-indigo-800">Sign in</router-link>
            </p>
          </form>
        </div>

        <!-- Right Column: Benefits -->
        <div class="space-y-6">
          <!-- Plan Benefits -->
          <div class="bg-white shadow-md rounded-xl p-6 space-y-3">
            <h3 class="text-xl font-semibold text-gray-900">What you get with {{ selectedPlan.name }}:</h3>
            <ul class="space-y-2">
              <li class="flex items-center gap-2"><CheckCircleIcon class="w-5 h-5 text-indigo-700" /> 10 simulations per month</li>
              <li class="flex items-center gap-2"><CheckCircleIcon class="w-5 h-5 text-indigo-700" /> Multi-user organization</li>
              <li class="flex items-center gap-2"><CheckCircleIcon class="w-5 h-5 text-indigo-700" /> Basic portfolio allocation</li>
              <li class="flex items-center gap-2"><CheckCircleIcon class="w-5 h-5 text-indigo-700" /> No credit card required</li>
            </ul>
          </div>

          <!-- Security & Trust -->
          <div class="bg-white shadow-md rounded-xl p-6 space-y-3">
            <h3 class="text-xl font-semibold text-gray-900">Security & Trust</h3>
            <ul class="space-y-2">
              <li class="flex items-center gap-2"><ShieldCheckIcon class="w-5 h-5 text-indigo-700" /> Secure password encryption</li>
              <li class="flex items-center gap-2"><ShieldCheckIcon class="w-5 h-5 text-indigo-700" /> Organization data isolation</li>
              <li class="flex items-center gap-2"><ShieldCheckIcon class="w-5 h-5 text-indigo-700" /> Multi-tenant architecture</li>
            </ul>
          </div>

          <!-- Support -->
          <div class="bg-white shadow-md rounded-xl p-6 space-y-3">
            <h3 class="text-xl font-semibold text-gray-900">Need Help?</h3>
            <p class="text-gray-600">Our team is here to support your success with EndowCast.</p>
            <div class="flex items-center text-indigo-700 gap-2 text-sm">
              <EnvelopeIcon class="w-4 h-4" />
              <span>support@endowcast.com</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </main>
</template>
