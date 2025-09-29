<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
          Verify Your Email
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Check your inbox and click the verification link
        </p>
      </div>

      <!-- Verification Status -->
      <div v-if="verificationStatus" class="rounded-md p-4" :class="statusClasses">
        <div class="flex">
          <div class="flex-shrink-0 text-2xl">
            {{ statusIcon }}
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium" :class="titleClasses">
              {{ verificationStatus.title }}
            </h3>
            <div class="mt-2 text-sm" :class="messageClasses">
              <p>{{ verificationStatus.message }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isVerifying" class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Verifying your email...</p>
      </div>

      <!-- Resend Verification -->
      <div v-if="showResendOption" class="text-center space-y-4">
        <p class="text-gray-600">Didn't receive the email?</p>
        
        <form @submit.prevent="resendVerification" class="space-y-4">
          <div>
            <input
              v-model="email"
              type="email"
              required
              class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Your email address"
            />
          </div>
          
          <button
            type="submit"
            :disabled="isResending"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <span v-if="isResending">Sending...</span>
            <span v-else>Resend Verification Email</span>
          </button>
        </form>
      </div>

      <!-- Navigation -->
      <div class="text-center space-y-2">
        <router-link
          to="/login"
          class="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
        >
          ← Back to Login
        </router-link>
        
        <div v-if="verificationStatus?.success">
          <router-link
            to="/simulation"
            class="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Start Using EndowCast →
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()

const isVerifying = ref(false)
const isResending = ref(false)
const verificationStatus = ref<{
  success: boolean
  title: string
  message: string
} | null>(null)
const email = ref('')
const showResendOption = ref(false)

const statusClasses = computed(() => {
  if (!verificationStatus.value) return ''
  
  return verificationStatus.value.success
    ? 'bg-green-50 border border-green-200'
    : 'bg-red-50 border border-red-200'
})

const statusIcon = computed(() => {
  if (!verificationStatus.value) return ''
  
  return verificationStatus.value.success
    ? '✅'
    : '❌'
})

const titleClasses = computed(() => {
  if (!verificationStatus.value) return ''
  
  return verificationStatus.value.success
    ? 'text-green-800'
    : 'text-red-800'
})

const messageClasses = computed(() => {
  if (!verificationStatus.value) return ''
  
  return verificationStatus.value.success
    ? 'text-green-700'
    : 'text-red-700'
})

const verifyEmail = async (token: string) => {
  isVerifying.value = true
  
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    const data = await response.json()

    if (response.ok) {
      verificationStatus.value = {
        success: true,
        title: 'Email Verified Successfully!',
        message: data.message || 'Your account is now active. Welcome to EndowCast!'
      }

      // Auto-login user if token is provided
      if (data.token && data.user) {
        authStore.login(data.user, data.token)
        toastStore.success('Email verified successfully! Welcome to EndowCast!')
        
        // Redirect to simulation page after a short delay
        setTimeout(() => {
          router.push('/simulation')
        }, 2000)
      }
    } else {
      verificationStatus.value = {
        success: false,
        title: 'Verification Failed',
        message: data.error || 'The verification link is invalid or has expired.'
      }
      showResendOption.value = true
    }
  } catch (error) {
    console.error('Email verification error:', error)
    verificationStatus.value = {
      success: false,
      title: 'Verification Error',
      message: 'Unable to verify your email. Please check your connection and try again.'
    }
    showResendOption.value = true
  } finally {
    isVerifying.value = false
  }
}

const resendVerification = async () => {
  if (!email.value) {
    toastStore.error('Please enter your email address')
    return
  }

  isResending.value = true

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.value }),
    })

    const data = await response.json()

    if (response.ok) {
      toastStore.success('Verification email sent! Please check your inbox.')
      showResendOption.value = false
    } else {
      toastStore.error(data.error || 'Failed to send verification email')
    }
  } catch (error) {
    console.error('Resend verification error:', error)
    toastStore.error('Network error. Please try again.')
  } finally {
    isResending.value = false
  }
}

onMounted(() => {
  const token = route.query.token as string
  
  if (token) {
    // Verify the email with the token from URL
    verifyEmail(token)
  } else {
    // No token provided, show resend option
    showResendOption.value = true
    verificationStatus.value = {
      success: false,
      title: 'Verification Required',
      message: 'Please check your email for the verification link, or request a new one below.'
    }
  }
})
</script>
