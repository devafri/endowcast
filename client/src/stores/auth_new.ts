import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiService, ApiError } from '@/services/api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organization?: string;
  jobTitle?: string;
  planType: 'FREE_TRIAL' | 'PROFESSIONAL' | 'INSTITUTION';
  planExpires?: Date;
  simulationsUsed: number;
  simulationLimit: number;
  simulationsRemaining: number;
  emailVerified: boolean;
  createdAt: Date;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  const isAuthenticated = computed(() => user.value !== null);
  
  // Plan-based limits and features
  const planLimits = {
    FREE_TRIAL: { simulations: 3, features: ['basic'] },
    PROFESSIONAL: { simulations: 50, features: ['basic', 'stress', 'export', 'advanced'] },
    INSTITUTION: { simulations: 200, features: ['basic', 'stress', 'export', 'advanced', 'priority', 'analytics'] }
  };

  const currentPlanLimits = computed(() => {
    if (!user.value) return planLimits.FREE_TRIAL;
    return planLimits[user.value.planType];
  });

  const canRunSimulation = computed(() => {
    if (!user.value) return false;
    return user.value.simulationsRemaining > 0;
  });

  const remainingSimulations = computed(() => {
    return user.value?.simulationsRemaining || 0;
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
      const planType = response.user.planType as keyof typeof planLimits;
      
      user.value = {
        ...response.user,
        simulationLimit: planLimits[planType].simulations,
        simulationsRemaining: Math.max(0, planLimits[planType].simulations - response.user.simulationsUsed)
      };

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
    planType?: string;
    organization?: string;
    jobTitle?: string;
  }) {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await apiService.register(userData);
      const planType = response.user.planType as keyof typeof planLimits;
      
      user.value = {
        ...response.user,
        simulationLimit: planLimits[planType].simulations,
        simulationsRemaining: Math.max(0, planLimits[planType].simulations - response.user.simulationsUsed)
      };

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
      error.value = null;
    }
  }

  async function verifyToken() {
    try {
      const response = await apiService.verifyToken();
      if (response.valid && response.user) {
        const planType = response.user.planType as keyof typeof planLimits;
        user.value = {
          ...response.user,
          simulationLimit: planLimits[planType].simulations,
          simulationsRemaining: Math.max(0, planLimits[planType].simulations - response.user.simulationsUsed)
        };
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
      const usage = await apiService.getUserUsage();
      if (user.value) {
        user.value.simulationsUsed = usage.simulationsUsed;
        user.value.simulationsRemaining = usage.simulationsRemaining;
        user.value.simulationLimit = usage.simulationLimit;
      }
    } catch (err) {
      console.error('Failed to refresh usage:', err);
    }
  }

  async function incrementSimulationUsage() {
    if (user.value && canRunSimulation.value) {
      user.value.simulationsUsed += 1;
      user.value.simulationsRemaining = Math.max(0, user.value.simulationsRemaining - 1);
    }
  }

  // Initialize auth state from token on app start
  async function initializeAuth() {
    const token = localStorage.getItem('endowcast_token');
    if (token) {
      await verifyToken();
    }
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
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
  };
});
