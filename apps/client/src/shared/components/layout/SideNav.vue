<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { computed, ref } from 'vue';
import { useAuthStore } from '@/features/auth/stores/auth';

const route = useRoute();
const authStore = useAuthStore();
const collapsed = ref(false);

const navItems = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/pricing', label: 'Pricing', icon: 'tag' },
  { to: '/instructions', label: 'Guide', icon: 'book' },
  { to: '/allocation', label: 'Allocation', icon: 'chart' },
  { to: '/results', label: 'Results', icon: 'play' },
  { to: '/simulation/history', label: 'Scenarios', icon: 'layers' },
];

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/');
}

function handleLogout() {
  authStore.logout();
}
</script>

<template>
  <aside class="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:top-0 lg:left-0 lg:h-screen lg:z-20 bg-white border-r border-gray-200">
    <div class="flex items-center justify-between px-4 py-4 border-b border-gray-100">
      <RouterLink to="/" class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-800 to-slate-800 flex items-center justify-center shadow">
          <span class="text-white font-bold">E</span>
        </div>
        <div>
          <div class="text-sm font-bold">EndowCast</div>
          <div class="text-xs text-gray-500">Endowment Analytics</div>
        </div>
      </RouterLink>
      <button @click="collapsed = !collapsed" class="p-2 rounded-md hover:bg-gray-100" aria-label="Toggle navigation">
        <svg v-if="!collapsed" class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        <svg v-else class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto py-4">
      <ul class="space-y-1 px-2">
        <li v-for="item in navItems" :key="item.to">
          <RouterLink :to="item.to" class="flex items-center gap-3 px-3 py-2 rounded-md text-sm" :class="isActive(item.to) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'">
            <span class="w-5 h-5 text-gray-400">●</span>
            <span>{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="px-4 py-4 border-t border-gray-100">
      <div v-if="authStore.isAuthenticated" class="flex items-center gap-3">
        <div class="flex-1">
          <div class="text-sm font-medium">{{ authStore.user?.firstName || 'User' }}</div>
          <div class="text-xs text-gray-500">{{ authStore.organization?.name || '' }}</div>
        </div>
        <button @click="handleLogout" class="text-gray-500 hover:text-red-600" aria-label="Sign out">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"/></svg>
        </button>
      </div>
      <div v-else class="flex space-x-2">
        <RouterLink to="/login" class="btn btn-outline">Login</RouterLink>
        <RouterLink to="/register" class="btn btn-primary">Sign Up</RouterLink>
      </div>
    </div>
  </aside>

  <!-- mobile header is provided by TheHeader component -->
</template>

<style scoped>
.btn { padding: 8px 12px; border-radius: 6px; font-weight: 500; }
.btn-outline { color: rgb(55, 65, 81); border: 1px solid rgb(209, 213, 219); background-color: white; }
.btn-primary { color: white; background-color: rgb(59, 130, 246); padding: 8px 12px; border-radius: 6px; }
</style>
