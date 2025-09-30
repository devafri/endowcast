<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { onMounted } from 'vue';
import TheHeader from './shared/components/layout/TheHeader.vue';
import { useAuthStore } from '@/features/auth/stores/auth';

const route = useRoute();
const authStore = useAuthStore();

// Initialize auth state when app loads
onMounted(async () => {
  await authStore.initializeAuth();
});

async function handleLogout() {
  await authStore.logout();
  // Redirect to home after logout
  if (route.path !== '/') {
    window.location.href = '/';
  }
}
</script>

<template>
  <div id="app">
    <TheHeader />
    <nav class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        <div class="flex items-center gap-6">
          <RouterLink to="/" class="nav-link font-medium text-sm" :class="route.path === '/' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-600 hover:text-blue-600'">Home</RouterLink>
          <RouterLink to="/pricing" class="nav-link font-medium text-sm" :class="route.path === '/pricing' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-600 hover:text-blue-600'">Pricing</RouterLink>
          <RouterLink to="/instructions" class="nav-link font-medium text-sm" :class="route.path === '/instructions' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-600 hover:text-blue-600'">Guide</RouterLink>
          <RouterLink to="/settings" class="nav-link font-medium text-sm" :class="route.path.startsWith('/settings') ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-600 hover:text-blue-600'">Settings</RouterLink>
          <RouterLink v-if="authStore.isAuthenticated" to="/organization" class="nav-link font-medium text-sm" :class="route.path.startsWith('/organization') ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-600 hover:text-blue-600'">Organization</RouterLink>
          <RouterLink to="/allocation" class="nav-link font-medium text-sm" :class="route.path.startsWith('/allocation') ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-600 hover:text-blue-600'">Allocation</RouterLink>
          <RouterLink to="/results" class="nav-link font-medium text-sm" :class="route.path.startsWith('/results') ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-600 hover:text-blue-600'">Results</RouterLink>
        </div>
        
        <div class="flex items-center gap-3">
          <template v-if="authStore.isAuthenticated && authStore.user">
            <!-- User info and logout -->
            <div class="flex items-center gap-3">
              <div class="text-sm text-gray-600">
                Welcome, {{ authStore.user.firstName }}
                <span v-if="authStore.organization" class="text-xs text-gray-500 ml-1">
                  @ {{ authStore.organization.name }}
                </span>
                <span class="text-xs text-gray-500 ml-2 px-2 py-1 bg-gray-100 rounded">
                  {{ authStore.user.role.toLowerCase() }}
                </span>
              </div>
              <div v-if="authStore.subscription" class="text-xs text-gray-500">
                {{ authStore.currentPlanLimits.simulations === -1 ? 'Unlimited' : authStore.subscription.simulationsUsed + '/' + authStore.currentPlanLimits.simulations }} simulations
              </div>
              <button 
                @click="handleLogout"
                class="text-gray-600 hover:text-red-600 font-medium text-sm transition-colors"
              >
                Sign Out
              </button>
            </div>
          </template>
          <template v-else>
            <!-- Login/signup links for non-authenticated users -->
            <RouterLink to="/login" class="text-gray-600 hover:text-blue-600 font-medium text-sm">Sign In</RouterLink>
            <RouterLink to="/signup" class="btn-primary py-2 px-4 text-sm font-medium hover:shadow-md transition-all">
              Start Free Trial
            </RouterLink>
          </template>
        </div>
      </div>
    </nav>
    <main class="min-h-[60vh]">
      <RouterView />
    </main>
  </div>
  <footer class="bg-gray-50 border-t border-gray-200 mt-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div class="text-gray-600 text-sm">
          © {{ new Date().getFullYear() }} EndowCast — Professional endowment analysis platform
        </div>
        <div class="flex items-center space-x-4 mt-2 md:mt-0">
          <span class="text-xs text-gray-500">Built for institutional investors</span>
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span class="text-xs text-gray-500">Live System</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<style>
/* You can place global styles here or import a main CSS file */
/* For example, import the styles from your original project */
@import './shared/assets/main.css'; 
</style>
