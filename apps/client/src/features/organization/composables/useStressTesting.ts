import { computed, type ComputedRef } from 'vue';
import { 
  addEquityShock,
  removeEquityShock,
  addCpiShock,
  removeCpiShock
} from '../utils/settingsHelpers';
import type { EquityShock, CpiShift, StressTestConfig } from '../types/SettingsTypes';

export interface UseStressTesting {
  // Equity shocks
  addEquityShockHandler: () => void;
  removeEquityShockHandler: (index: number) => void;
  equityShocksCount: ComputedRef<number>;
  
  // CPI shifts
  addCpiShockHandler: () => void;
  removeCpiShockHandler: (index: number) => void;
  cpiShiftsCount: ComputedRef<number>;
  
  // Overall stress testing
  hasStressTests: ComputedRef<boolean>;
  stressTestSummary: ComputedRef<string>;
  clearAllStressTests: () => void;
}

export function useStressTesting(options: any): UseStressTesting {
  
  const addEquityShockHandler = (): void => {
    addEquityShock(options);
  };

  const removeEquityShockHandler = (index: number): void => {
    removeEquityShock(options, index);
  };

  const addCpiShockHandler = (): void => {
    addCpiShock(options);
  };

  const removeCpiShockHandler = (index: number): void => {
    removeCpiShock(options, index);
  };

  const equityShocksCount = computed(() => {
    return options.stress?.equityShocks?.length || 0;
  });

  const cpiShiftsCount = computed(() => {
    return options.stress?.cpiShifts?.length || 0;
  });

  const hasStressTests = computed(() => {
    return equityShocksCount.value > 0 || cpiShiftsCount.value > 0;
  });

  const stressTestSummary = computed(() => {
    const parts: string[] = [];
    
    if (equityShocksCount.value > 0) {
      parts.push(`${equityShocksCount.value} equity shock${equityShocksCount.value !== 1 ? 's' : ''}`);
    }
    
    if (cpiShiftsCount.value > 0) {
      parts.push(`${cpiShiftsCount.value} CPI shift${cpiShiftsCount.value !== 1 ? 's' : ''}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'No stress tests configured';
  });

  const clearAllStressTests = (): void => {
    if (options.stress) {
      options.stress.equityShocks = [];
      options.stress.cpiShifts = [];
    }
  };

  return {
    addEquityShockHandler,
    removeEquityShockHandler,
    equityShocksCount,
    addCpiShockHandler,
    removeCpiShockHandler,
    cpiShiftsCount,
    hasStressTests,
    stressTestSummary,
    clearAllStressTests,
  };
}
