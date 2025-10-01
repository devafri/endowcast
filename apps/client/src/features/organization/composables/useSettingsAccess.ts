import { computed, type ComputedRef } from 'vue';
import type { TabConfig } from '../types/SettingsTypes';

export interface UseSettingsAccess {
  availableTabs: ComputedRef<TabConfig[]>;
  restrictedTabs: ComputedRef<TabConfig[]>;
  isTrialUser: ComputedRef<boolean>;
  canAccessTab: (tabId: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
  getUpgradeMessage: (feature: string) => string;
}

export function useSettingsAccess(
  tabs: TabConfig[], 
  authStore: any
): UseSettingsAccess {
  
  const availableTabs = computed(() => {
    return tabs.filter(tab => authStore.hasFeature(tab.feature));
  });

  const restrictedTabs = computed(() => {
    return tabs.filter(tab => !authStore.hasFeature(tab.feature));
  });

  const isTrialUser = computed(() => {
    return authStore.subscription?.planType === 'FREE';
  });

  const canAccessTab = (tabId: string): boolean => {
    const tab = tabs.find(t => t.id === tabId);
    return tab ? authStore.hasFeature(tab.feature) : false;
  };

  const canAccessFeature = (feature: string): boolean => {
    return authStore.hasFeature(feature);
  };

  const getUpgradeMessage = (feature: string): string => {
    const featureMessages: Record<string, string> = {
      'stress': 'Upgrade to access advanced spending policies and stress testing features.',
      'advanced': 'Upgrade to access asset class customization and portfolio benchmarking.',
      'premium': 'Upgrade to Professional or Enterprise plan for full access to all features.',
    };
    
    return featureMessages[feature] || 'Upgrade your plan to access this feature.';
  };

  return {
    availableTabs,
    restrictedTabs,
    isTrialUser,
    canAccessTab,
    canAccessFeature,
    getUpgradeMessage,
  };
}
