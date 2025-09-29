import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiService, ApiError } from '@/services/api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'USER' | 'ADMIN';
  organizationId: string;
  jobTitle?: string;
  emailVerified: boolean;
  createdAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  industry?: string;
  userCount?: number;
  simulationCount?: number;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planType: 'FREE' | 'ANALYST_PRO' | 'FOUNDATION' | 'FOUNDATION_PRO';
  status: string; // 'active', 'canceled', 'past_due'
  currentPeriodStart: Date;
  currentPeriodEnd?: Date;
  simulationsUsed: number;
  simulationsReset: Date;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const organization = ref<Organization | null>(null);
  const subscription = ref<Subscription | null>(null);
  const usageStats = ref<any>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  const isAuthenticated = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  
  // Plan-based limits and features  
  const planLimits = {
    FREE: { simulations: 10, features: ['basic'] },
    ANALYST_PRO: { simulations: 100, features: ['basic', 'stress', 'export', 'advanced'] },
    FOUNDATION: { simulations: 500, features: ['basic', 'stress', 'export', 'advanced', 'priority'] },
    FOUNDATION_PRO: { simulations: -1, features: ['basic', 'stress', 'export', 'advanced', 'priority', 'analytics'] }
  };

  const currentPlanLimits = computed(() => {
    if (!subscription.value) return planLimits.FREE;
    return planLimits[subscription.value.planType];
  });

  const canRunSimulation = computed(() => {
    if (!usageStats.value) return false;
    if (currentPlanLimits.value.simulations === -1) return true; // unlimited
    return usageStats.value.remainingSimulations > 0;
  });

  const remainingSimulations = computed(() => {
    if (!usageStats.value) return 0;
    if (currentPlanLimits.value.simulations === -1) return 'unlimited';
    return usageStats.value.remainingSimulations || 0;
  });

  const hasFeature = (feature: string) => {
    const limits = currentPlanLimits.value;
    return limits.features.includes(feature);
  };

  async function login(email: string, password: string, rememberMe = false) {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await apiService.login(email, password, rememberMe);
      
      // Store user, organization, and subscription data from multi-tenant response
      user.value = response.user;
      organization.value = response.organization;
      subscription.value = response.subscription;
      
      // Fetch usage statistics
      await refreshUsage();

      return { success: true };
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
        return { success: false, error: err.message };
      }
      error.value = 'Login failed. Please try again.';
      return { success: false, error: 'Login failed. Please try again.' };
    } finally {
      isLoading.value = false;
    }
  }

  async function signup(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    jobTitle?: string;
  }) {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await apiService.register(userData);
      
      // Store user, organization, and subscription data from multi-tenant response
      user.value = response.user;
      organization.value = response.organization;
      subscription.value = response.subscription;
      
      // Fetch usage statistics
      await refreshUsage();

      return { success: true };
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
        return { success: false, error: err.message };
      }
      error.value = 'Registration failed. Please try again.';
      return { success: false, error: 'Registration failed. Please try again.' };
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    try {
      await apiService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      user.value = null;
      organization.value = null;
      subscription.value = null;
      usageStats.value = null;
      error.value = null;
    }
  }

  async function verifyToken() {
    try {
      const response = await apiService.verifyToken();
      if (response.valid && response.user) {
        user.value = response.user;
        organization.value = response.organization;
        subscription.value = response.subscription;
        await refreshUsage();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Token verification failed:', err);
      await logout();
      return false;
    }
  }

  async function updateProfile(userData: {
    firstName?: string;
    lastName?: string;
    organization?: string;
    jobTitle?: string;
  }) {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await apiService.updateUserProfile(userData);
      if (user.value) {
        Object.assign(user.value, response.user);
      }

      return { success: true };
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
        return { success: false, error: err.message };
      }
      error.value = 'Failed to update profile. Please try again.';
      return { success: false, error: 'Failed to update profile. Please try again.' };
    } finally {
      isLoading.value = false;
    }
  }

  async function refreshUsage() {
    try {
      const usage = await apiService.getOrganizationUsage();
      usageStats.value = usage.usage;
      if (usage.subscription) {
        subscription.value = { ...subscription.value, ...usage.subscription };
      }
    } catch (err) {
      console.error('Failed to refresh usage:', err);
    }
  }

  async function incrementSimulationUsage() {
    if (usageStats.value && canRunSimulation.value) {
      usageStats.value.monthlySimulations += 1;
      if (currentPlanLimits.value.simulations !== -1) {
        usageStats.value.remainingSimulations = Math.max(0, usageStats.value.remainingSimulations - 1);
      }
    }
  }

  // Initialize auth state from token on app start
  async function initializeAuth() {
    const token = localStorage.getItem('endowcast_token');
    if (token) {
      await verifyToken();
    }
  }

  // Organization management functions
  async function getOrganization() {
    try {
      const response = await apiService.getOrganization();
      organization.value = response.organization;
      subscription.value = response.subscription;
      return response;
    } catch (err) {
      console.error('Failed to get organization:', err);
      throw err;
    }
  }

  async function updateOrganization(data: { name?: string; industry?: string }) {
    try {
      const response = await apiService.updateOrganization(data);
      organization.value = response.organization;
      return { success: true };
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
        return { success: false, error: err.message };
      }
      error.value = 'Failed to update organization.';
      return { success: false, error: 'Failed to update organization.' };
    }
  }

  return {
    user,
    organization,
    subscription,
    usageStats,
    isLoading,
    error,
    isAuthenticated,
    isAdmin,
    currentPlanLimits,
    canRunSimulation,
    remainingSimulations,
    hasFeature,
    login,
    signup,
    logout,
    verifyToken,
    updateProfile,
    refreshUsage,
    incrementSimulationUsage,
    initializeAuth,
    getOrganization,
    updateOrganization,
  };
});
