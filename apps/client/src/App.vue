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
  <!-- Primary navigation moved into TheHeader to avoid double nav bars -->
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
