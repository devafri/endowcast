<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { onMounted, computed } from 'vue';
import TheHeader from './shared/components/layout/TheHeader.vue';
import SideNav from './shared/components/layout/SideNav.vue';
import { useAuthStore } from '@/features/auth/stores/auth';

const route = useRoute();
const authStore = useAuthStore();
// Define the paths where TheHeader should be visible
const headerPaths = ['/', '/register', '/privacy','/login','/pricing'];

const shouldShowHeader = computed(() => {
  return headerPaths.includes(route.path);
});

// Define the paths where SideNav should be hidden
const hiddenNavPaths = ['/', '/register', '/privacy', '/login', '/pricing']; 

const shouldHideSideNav = computed(() => {
  return hiddenNavPaths.includes(route.path);
});


// Initialize auth state when app loads
onMounted(async () => {
  console.log('🚀 App.vue mounted');
  await authStore.initializeAuth();
  console.log('✓ Auth initialized in App.vue');
});

async function handleLogout() {
  await authStore.logout();
}
</script>

<template>
  <div id="app" class="min-h-screen flex flex-col">
    
    <!-- Show SideNav on all routes except landing page -->
    <SideNav v-if="!shouldHideSideNav" />
    <div :class="!shouldHideSideNav ? 'lg:pl-64' : ''">
      <!-- Show TheHeader only on landing page -->
      <TheHeader v-if="shouldShowHeader" />
      <main class="min-h-[60vh]">
        <RouterView />
      </main>
    </div>
    
    <!-- Footer moved inside app wrapper -->
    <footer class="mt-16 border-t border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="text-sm text-slate-500">© {{ new Date().getFullYear() }}  EndowCast — Professional endowment analysis platform</div>
        <div class="flex items-center gap-4">
          <router-link class="text-sm text-slate-600" to="/terms">Terms</router-link>
          <router-link to="/privacy" class="text-sm text-slate-600 hover:text-blue-600">Privacy Policy</router-link>
          <router-link class="text-sm text-slate-600" to="/contact">Contact</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

