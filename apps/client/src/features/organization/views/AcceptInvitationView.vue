<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div v-if="!invitationDetails" class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">Loading invitation details...</p>
      </div>

      <div v-else-if="invitationExpired" class="text-center">
        <div class="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Invitation Expired</h2>
        <p class="text-gray-600 mb-6">This invitation has expired or is no longer valid.</p>
        <router-link to="/" class="text-blue-600 hover:text-blue-500">
          Return to Home
        </router-link>
      </div>

      <div v-else>
        <div class="text-center mb-8">
          <div class="text-blue-500 text-6xl mb-4">📨</div>
          <h2 class="text-3xl font-bold text-gray-900">Join {{ invitationDetails.organizationName }}</h2>
          <p class="mt-2 text-gray-600">
            {{ invitationDetails.inviterName }} has invited you to join their organization on EndowCast
          </p>
        </div>

        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="text-blue-500 text-2xl">🏢</div>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-blue-800">Organization Details</h3>
              <div class="mt-1 text-sm text-blue-700">
                <p><strong>Organization:</strong> {{ invitationDetails.organizationName }}</p>
                <p><strong>Invited by:</strong> {{ invitationDetails.inviterName }}</p>
                <p><strong>Role:</strong> {{ invitationDetails.role }}</p>
              </div>
            </div>
          </div>
        </div>

        <form @submit.prevent="acceptInvitation" class="space-y-6">
          <div>
            <label for="firstName" class="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              id="firstName"
              v-model="form.firstName"
              type="text"
              required
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter your first name"
            />
          </div>

          <div>
            <label for="lastName" class="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              id="lastName"
              v-model="form.lastName"
              type="text"
              required
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter your last name"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              required
              minlength="8"
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Create a secure password (min 8 characters)"
            />
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              required
              class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Confirm your password"
            />
          </div>

          <div v-if="error" class="text-red-600 text-sm">
            {{ error }}
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading || !isFormValid"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              </span>
              {{ loading ? 'Creating Account...' : 'Accept Invitation & Create Account' }}
            </button>
          </div>
        </form>

        <div class="mt-6 text-center">
          <p class="text-xs text-gray-500">
            By accepting this invitation, you agree to our 
            <router-link to="/terms" class="text-blue-600 hover:text-blue-500">Terms of Service</router-link>
            and 
            <router-link to="/privacy" class="text-blue-600 hover:text-blue-500">Privacy Policy</router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiService } from '../../../shared/services/api'

const route = useRoute()
const router = useRouter()

const invitationDetails = ref<any>(null)
const invitationExpired = ref(false)
const loading = ref(false)
const error = ref('')

const form = ref({
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: ''
})

const isFormValid = computed(() => {
  return form.value.firstName.trim() &&
         form.value.lastName.trim() &&
         form.value.password.length >= 8 &&
         form.value.password === form.value.confirmPassword
})

const acceptInvitation = async () => {
  if (!isFormValid.value) {
    error.value = 'Please fill all fields correctly'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const response = await apiService.post('/organization/accept-invitation', {
      token: route.query.token,
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      password: form.value.password
    })

    if (response.success) {
      // Redirect to login with success message
      router.push({
        name: 'Login',
        query: { 
          message: 'Account created successfully! Please log in with your new credentials.',
          email: response.user.email
        }
      })
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to accept invitation'
  } finally {
    loading.value = false
  }
}

const validateInvitation = async () => {
  const token = route.query.token

  if (!token) {
    invitationExpired.value = true
    return
  }

  try {
    // You would implement a validation endpoint here
    // For now, we'll show the form and handle validation during submission
    invitationDetails.value = {
      organizationName: 'Organization Name', // This would come from API
      inviterName: 'Inviter Name',
      role: 'User'
    }
  } catch (err) {
    invitationExpired.value = true
  }
}

onMounted(() => {
  validateInvitation()
})
</script>
