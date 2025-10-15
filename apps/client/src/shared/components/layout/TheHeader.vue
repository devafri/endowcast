<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { ref } from 'vue';
import { useAuthStore } from '@/features/auth/stores/auth';

const route = useRoute();
const authStore = useAuthStore();

// Dropdown state management
const analysisDropdown = ref(false);
const scenariosDropdown = ref(false);
const accountDropdown = ref(false);

// Helper functions
const closeAllDropdowns = () => {
  analysisDropdown.value = false;
  scenariosDropdown.value = false;
  accountDropdown.value = false;
};

const isAnalysisActive = () => {
  return route.path.startsWith('/allocation') || 
         route.path.startsWith('/results') || 
         route.path.startsWith('/settings')
}

const isScenariosActive = () => {
  return route.path.startsWith('/simulation/history') || 
         route.path.startsWith('/simulation/compare')
}

const isAccountActive = () => {
  return route.path.startsWith('/organization')
}

async function handleLogout() {
  await authStore.logout();
}
</script>

<template>
  <header class="bg-white border-b border-gray-200 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex justify-between items-center">
        <RouterLink to="/" class="flex items-center gap-3 group">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-800 to-slate-800 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
          <span class="text-white font-bold text-lg">E</span>
        </div>
        <div>
          <div class="text-xl font-bold text-gray-900 leading-tight">EndowCast</div>
          <div class="text-sm text-gray-600 font-medium">Endowment Analytics</div>
        </div>
        </RouterLink>

        <nav class="hidden lg:flex items-center gap-2 text-sm">
          <template v-if="authStore.isAuthenticated">
            <!-- Basic Navigation -->
            <RouterLink to="/" class="nav-link" :class="route.path==='/' ? 'nav-link-active' : 'nav-link-default'">Home</RouterLink>
            <RouterLink to="/pricing" class="nav-link" :class="route.path==='/pricing' ? 'nav-link-active' : 'nav-link-default'">Pricing</RouterLink>
            <RouterLink to="/instructions" class="nav-link" :class="route.path==='/instructions' ? 'nav-link-active' : 'nav-link-default'">Guide</RouterLink>
            <!-- Analysis Dropdown -->
            <div class="relative" @mouseenter="analysisDropdown = true" @mouseleave="analysisDropdown = false">
              <button class="nav-link flex items-center gap-1" :class="isAnalysisActive() ? 'nav-link-active' : 'nav-link-default'">
                Analysis
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              <div v-if="analysisDropdown" class="dropdown-menu">
                <RouterLink to="/settings" class="dropdown-item" @click="closeAllDropdowns">
                  <div class="dropdown-item-content">
                    <span class="font-medium">Settings</span>
                    <span class="text-xs text-gray-500">Analysis parameters & preferences</span>
                  </div>
                </RouterLink>
                <RouterLink to="/allocation" class="dropdown-item" @click="closeAllDropdowns">
                  <div class="dropdown-item-content">
                    <span class="font-medium">Portfolio Allocation</span>
                    <span class="text-xs text-gray-500">Set asset weights and constraints</span>
                  </div>
                </RouterLink>
                <RouterLink :to="{ path: '/results', query: { run: '1' } }" class="dropdown-item dropdown-item-primary" @click="closeAllDropdowns">
                  <div class="dropdown-item-content">
                    <span class="font-semibold">🚀 Run Monte Carlo Analysis</span>
                    <span class="text-xs text-blue-600">Execute simulation & view results</span>
                  </div>
                </RouterLink>
              </div>
            </div>
            <!-- Scenarios Dropdown -->
            <div class="relative" @mouseenter="scenariosDropdown = true" @mouseleave="scenariosDropdown = false">
              <button class="nav-link flex items-center gap-1" :class="isScenariosActive() ? 'nav-link-active' : 'nav-link-default'">
                Scenarios
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              <div v-if="scenariosDropdown" class="dropdown-menu">
                <RouterLink to="/simulation/history" class="dropdown-item" @click="closeAllDropdowns">
                  <div class="dropdown-item-content">
                    <span class="font-medium">Scenario History</span>
                    <span class="text-xs text-gray-500">Browse saved scenarios</span>
                  </div>
                </RouterLink>
                <RouterLink to="/simulation/compare" class="dropdown-item" @click="closeAllDropdowns">
                  <div class="dropdown-item-content">
                    <span class="font-medium">Compare Scenarios</span>
                    <span class="text-xs text-gray-500">Side-by-side analysis</span>
                  </div>
                </RouterLink>
              </div>
            </div>
          </template>
        </nav>

        <div class="flex items-center gap-4">
          <!-- Account Dropdown (authenticated users) -->
          <div v-if="authStore.isAuthenticated" class="relative" @mouseenter="accountDropdown = true" @mouseleave="accountDropdown = false">
            <button class="nav-link flex items-center gap-1" :class="isAccountActive() ? 'nav-link-active' : 'nav-link-default'">
              Account
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <div v-if="accountDropdown" class="dropdown-menu">
              <RouterLink to="/organization" class="dropdown-item" @click="closeAllDropdowns">
                <div class="dropdown-item-content">
                  <span class="font-medium">Organization</span>
                  <span class="text-xs text-gray-500">Manage your organization</span>
                </div>
              </RouterLink>
            </div>
          </div>

          <!-- User Section -->
          <template v-if="authStore.isAuthenticated && authStore.user">
            <div class="flex items-center gap-3">
              <!-- User Info -->
              <div class="text-right">
                <div class="text-sm font-medium text-gray-900">{{ authStore.user.firstName }}</div>
                <div class="text-xs text-gray-500">
                  <span v-if="authStore.organization">{{ authStore.organization.name }}</span>
                  <span class="mx-1">•</span>
                  <span class="capitalize">{{ authStore.user.role.toLowerCase() }}</span>
                </div>
              </div>
              
              <!-- Simulation Usage -->
              <div v-if="authStore.subscription" class="text-center px-3 py-1 bg-gray-50 rounded-md">
                <div class="text-xs font-medium text-gray-900">
                  {{ (authStore.usageStats?.monthlySimulations || 0) }}/{{ authStore.currentPlanLimits.simulations }}
                </div>
                <div class="text-xs text-gray-500">simulations</div>
              </div>
              
              <!-- Sign Out -->
              <button 
                @click="handleLogout" 
                class="text-gray-500 hover:text-red-600 transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"></path>
                </svg>
              </button>
            </div>
          </template>
          
          <!-- Unauthenticated Users -->
          <template v-else>
            <RouterLink to="/login" class="btn btn-outline">Login</RouterLink>
            <RouterLink to="/register" class="btn btn-primary">Sign Up</RouterLink>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.nav-link {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
  text-decoration: none;
  cursor: pointer;
  border: none;
  background: none;
}

.nav-link-default {
  color: rgb(75, 85, 99);
}

.nav-link-default:hover {
  color: rgb(59, 130, 246);
  background-color: rgb(239, 246, 255);
}

.nav-link-active {
  color: rgb(59, 130, 246);
  background-color: rgb(219, 234, 254);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 50;
  margin-top: 4px;
  min-width: 240px;
  background-color: white;
  border: 1px solid rgb(229, 231, 235);
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: block;
  padding: 12px 16px;
  color: rgb(55, 65, 81);
  text-decoration: none;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid rgb(243, 244, 246);
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background-color: rgb(249, 250, 251);
}

.dropdown-item-primary {
  background-color: rgb(239, 246, 255);
  border-left: 3px solid rgb(59, 130, 246);
}

.dropdown-item-primary:hover {
  background-color: rgb(219, 234, 254);
}

.dropdown-item-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn-outline {
  color: rgb(55, 65, 81);
  border: 1px solid rgb(209, 213, 219);
  background-color: white;
}

.btn-outline:hover {
  background-color: rgb(249, 250, 251);
  border-color: rgb(156, 163, 175);
}

.btn-primary {
  color: white;
  background-color: rgb(59, 130, 246);
  border: 1px solid rgb(59, 130, 246);
}

.btn-primary:hover {
  background-color: rgb(37, 99, 235);
  border-color: rgb(37, 99, 235);
}
</style>