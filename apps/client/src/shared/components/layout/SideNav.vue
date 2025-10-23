<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { computed, ref, onMounted, watch } from 'vue';
import { useAuthStore } from '@/features/auth/stores/auth';

const route = useRoute();
const authStore = useAuthStore();
const collapsed = ref(false);

// Persist collapsed state so users keep their preference
const STORAGE_KEY = 'sidenav-collapsed';
onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) collapsed.value = saved === 'true';
  } catch (e) {
    // ignore
  }
});
watch(collapsed, (val) => {
  try { localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false'); } catch (e) {}
});

const navItems = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/pricing', label: 'Pricing', icon: 'tag' },
  { to: '/instructions', label: 'Guide', icon: 'book' },
  { to: '/allocation', label: 'Allocation', icon: 'chart' },
  { to: '/settings', label: 'Portfolio', icon: 'briefcase' },
  { to: '/results', label: 'Results', icon: 'play' },
  { to: '/simulation/history', label: 'Scenarios', icon: 'layers' },
];

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/');
}

async function handleLogout() {
  await authStore.logout();
}
</script>

<template>
  <aside :class="['hidden lg:flex lg:flex-col lg:fixed lg:top-0 lg:left-0 lg:h-screen lg:z-20 bg-white border-r border-gray-200 transition-all duration-200', collapsed ? 'lg:w-20' : 'lg:w-64']" aria-expanded="false">
    <div class="flex items-center justify-between px-4 py-4 border-b border-gray-100">
      <RouterLink to="/" class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-800 to-slate-800 flex items-center justify-center shadow">
          <span class="text-white font-bold">E</span>
        </div>
        <div v-if="!collapsed" class="transition-all duration-150">
          <div class="text-sm font-bold">EndowCast</div>
          <div class="text-xs text-gray-500">Endowment Analytics</div>
        </div>
      </RouterLink>
  <button @click="collapsed = !collapsed" class="p-2 rounded-md hover:bg-gray-100" :aria-expanded="collapsed" aria-label="Toggle navigation">
        <svg v-if="!collapsed" class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        <svg v-else class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>

    <nav class="flex-1 overflow-y-auto py-4">
      <ul class="space-y-1 px-2">
        <li v-for="item in navItems" :key="item.to">
          <RouterLink
            :to="item.to"
            class="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150"
            :class="[
              isActive(item.to) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50',
              collapsed ? 'justify-center' : 'justify-start'
            ]"
            :title="item.label"
          >
            <span class="w-5 h-5 text-gray-400 flex items-center justify-center">
              <!-- Home -->
              <svg v-if="item.icon === 'home'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l9-9 9 9M9 21V9h6v12"/></svg>
              <!-- Tag -->
              <svg v-else-if="item.icon === 'tag'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.59 13.41L13.41 20.59a2 2 0 01-2.83 0L3 13.01V6a2 2 0 012-2h7.01l1.59 1.59"/></svg>
              <!-- Book/Guide -->
              <svg v-else-if="item.icon === 'book'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 20H6a2 2 0 01-2-2V6a2 2 0 012-2h6m6 16h-6a2 2 0 01-2-2V6a2 2 0 012-2h6v16z"/></svg>
              <!-- Chart -->
              <svg v-else-if="item.icon === 'chart'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3v18M20 17v2M4 7v12M16 11v8"/></svg>
              <!-- Portfolio / Briefcase -->
              <svg v-else-if="item.icon === 'briefcase'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12v.01M6 7h12v10a2 2 0 01-2 2H8a2 2 0 01-2-2V7z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7V5a3 3 0 016 0v2"/></svg>
              <!-- Play / Results -->
              <svg v-else-if="item.icon === 'play'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 3.868v16.264A1 1 0 006.555 21.1L19.3 12.99a1 1 0 000-1.78L6.555 2.9A1 1 0 005 3.868z"/></svg>
              <!-- Layers / Scenarios -->
              <svg v-else-if="item.icon === 'layers'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2l9 6-9 6-9-6 9-6z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-6v6l-9 6-9-6v-6l9 6z"/></svg>
            </span>
            <span v-if="!collapsed">{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="px-4 py-4 border-t border-gray-100">
      <div v-if="authStore.isAuthenticated" class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-700">{{ (authStore.user?.firstName || 'U').charAt(0) }}</div>
        <div v-if="!collapsed" class="flex-1">
          <div class="text-sm font-medium">{{ authStore.user?.firstName || 'User' }}</div>
          <div class="text-xs text-gray-500">{{ authStore.organization?.name || '' }}</div>
        </div>
        <button @click="handleLogout" class="text-gray-500 hover:text-red-600" aria-label="Sign out">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"/></svg>
        </button>
      </div>
      <div v-else class="flex space-x-2" v-if="!collapsed">
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
