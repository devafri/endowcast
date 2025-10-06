<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isLoading = ref(true)
const error = ref('')
const countdown = ref(5)

onMounted(async () => {
  try {
    console.log('PaymentSuccess: Starting payment processing...')
    console.log('Session ID from URL:', route.query.session_id)
    
    // Wait longer for Stripe webhook to process
    console.log('PaymentSuccess: Waiting for webhook processing...')
    await new Promise(resolve => setTimeout(resolve, 5000)) // Increased to 5 seconds
    
    // Refresh user data to get updated subscription
    console.log('PaymentSuccess: Refreshing user data...')
    console.log('Current subscription before refresh:', JSON.stringify(authStore.subscription, null, 2))
    
    await authStore.refreshCurrentUser()
    
    console.log('Current subscription after refresh:', JSON.stringify(authStore.subscription, null, 2))
    console.log('Plan type after refresh:', authStore.subscription?.planType)
    console.log('Status after refresh:', authStore.subscription?.status)
    console.log('PaymentSuccess: User data refreshed successfully')
    
    isLoading.value = false
    
    // Start countdown
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
        router.push('/organization')
      }
    }, 1000)
  } catch (err) {
    console.error('Error refreshing user data:', err)
    error.value = 'There was an issue updating your account. Please contact support.'
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-4">
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h1 class="text-xl font-semibold text-gray-900">Processing your payment...</h1>
        <p class="text-gray-600">Please wait while we update your account.</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="space-y-4">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h1 class="text-xl font-semibold text-gray-900">Payment Processing</h1>
        <p class="text-gray-600">{{ error }}</p>
        <div class="space-y-2">
          <RouterLink 
            to="/organization" 
            class="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Organization
          </RouterLink>
          <RouterLink 
            to="/contact" 
            class="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Contact Support
          </RouterLink>
        </div>
      </div>

      <!-- Success State -->
      <div v-else class="space-y-6">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        
        <div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p class="text-gray-600 mb-4">
            Your subscription has been upgraded successfully. You now have access to all premium features.
          </p>
          
          <div v-if="authStore.subscription" class="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 class="font-semibold text-blue-900">Your New Plan</h3>
            <p class="text-blue-700">{{ authStore.subscription.planType.replace('_', ' ') }}</p>
          </div>
        </div>
        
        <div class="space-y-3">
          <RouterLink 
            to="/organization" 
            class="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Organization
          </RouterLink>
          <RouterLink 
            to="/settings" 
            class="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Start Modeling
          </RouterLink>
        </div>
        
        <p class="text-sm text-gray-500">
          Redirecting to your organization in {{ countdown }} seconds...
        </p>
      </div>
    </div>
  </div>
</template>
