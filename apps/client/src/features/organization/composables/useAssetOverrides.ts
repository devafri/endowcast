import { computed, type ComputedRef } from 'vue';
import { 
  ensureOverride,
  getOverrideMeanPct,
  setOverrideMeanPct,
  getOverrideSdPct,
  setOverrideSdPct
} from '../utils/settingsHelpers';

export interface UseAssetOverrides {
  getOverrideMean: (key: string, defMean?: number) => number | undefined;
  setOverrideMean: (key: string, e: Event) => void;
  getOverrideStdDev: (key: string, defSd?: number) => number | undefined;
  setOverrideStdDev: (key: string, e: Event) => void;
  hasOverride: (key: string) => boolean;
  clearOverride: (key: string) => void;
  overrideCount: ComputedRef<number>;
}

export function useAssetOverrides(options: any): UseAssetOverrides {
  
  const getOverrideMean = (key: string, defMean?: number): number | undefined => {
    return getOverrideMeanPct(options, key);
  };

  const setOverrideMean = (key: string, e: Event): void => {
    setOverrideMeanPct(options, key, e);
  };

  const getOverrideStdDev = (key: string, defSd?: number): number | undefined => {
    return getOverrideSdPct(options, key);
  };

  const setOverrideStdDev = (key: string, e: Event): void => {
    setOverrideSdPct(options, key, e);
  };

  const hasOverride = (key: string): boolean => {
    return !!(options.assets?.overrides?.[key]?.mean || options.assets?.overrides?.[key]?.sd);
  };

  const clearOverride = (key: string): void => {
    if (options.assets?.overrides?.[key]) {
      delete options.assets.overrides[key];
    }
  };

  const overrideCount = computed(() => {
    if (!options.assets?.overrides) return 0;
    return Object.keys(options.assets.overrides).filter(key => 
      options.assets.overrides[key].mean !== undefined || 
      options.assets.overrides[key].sd !== undefined
    ).length;
  });

  return {
    getOverrideMean,
    setOverrideMean,
    getOverrideStdDev,
    setOverrideStdDev,
    hasOverride,
    clearOverride,
    overrideCount,
  };
}
