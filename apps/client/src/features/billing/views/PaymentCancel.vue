<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goToPricing() {
  router.push('/pricing')
}

function goToOrganization() {
  router.push('/organization')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </div>
      
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Payment Cancelled</h1>
      <p class="text-gray-600 mb-6">
        Your payment was cancelled. No charges were made to your account.
      </p>
      
      <div class="space-y-3">
        <button 
          @click="goToPricing()"
          class="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
        <button 
          @click="goToOrganization()"
          class="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Back to Organization
        </button>
      </div>
      
      <p class="text-sm text-gray-500 mt-6">
        Need help? <RouterLink to="/contact" class="text-blue-600 hover:underline">Contact support</RouterLink>
      </p>
    </div>
  </div>
</template>
