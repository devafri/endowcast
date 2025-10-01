import { computed, type ComputedRef } from 'vue';
import { normalizeBenchmarkWeights } from '../utils/settingsHelpers';
import type { BenchmarkConfig } from '../types/SettingsTypes';

export interface UseBenchmarkConfig {
  normalizeBenchmarkWeightsHandler: () => void;
  benchmarkTotal: ComputedRef<number>;
  isBenchmarkEnabled: ComputedRef<boolean>;
  benchmarkSummary: ComputedRef<string>;
  toggleBenchmark: () => void;
  setBenchmarkType: (type: string) => void;
}

export function useBenchmarkConfig(options: any): UseBenchmarkConfig {
  
  const normalizeBenchmarkWeightsHandler = (): void => {
    normalizeBenchmarkWeights(options);
  };

  const benchmarkTotal = computed(() => {
    if (!options.benchmark?.blended) return 0;
    return Object.values(options.benchmark.blended).reduce(
      (sum: number, val: any) => sum + (Number(val) || 0), 
      0
    );
  });

  const isBenchmarkEnabled = computed(() => {
    return options.benchmark?.enabled === true;
  });

  const benchmarkSummary = computed(() => {
    if (!isBenchmarkEnabled.value) return 'Benchmarking disabled';
    
    const type = options.benchmark?.type;
    const value = options.benchmark?.value;
    
    switch (type) {
      case 'cpi_plus':
        return `CPI + ${value || 0}%`;
      case 'fixed':
        return `Fixed ${value || 0}% annual return`;
      case 'asset_class':
        return `Single asset class: ${options.benchmark?.assetKey || 'Not selected'}`;
      case 'blended':
        return `Blended portfolio (${benchmarkTotal.value.toFixed(1)}% total)`;
      default:
        return 'Benchmark type not configured';
    }
  });

  const toggleBenchmark = (): void => {
    if (!options.benchmark) {
      options.benchmark = { enabled: true, type: 'cpi_plus', value: 6, label: 'CPI + 6%' };
    } else {
      options.benchmark.enabled = !options.benchmark.enabled;
    }
  };

  const setBenchmarkType = (type: string): void => {
    if (!options.benchmark) {
      options.benchmark = { enabled: true, type, value: 6, label: '' };
    } else {
      options.benchmark.type = type;
    }
    
    // Set default values based on type
    switch (type) {
      case 'cpi_plus':
        if (!options.benchmark.value) options.benchmark.value = 6;
        options.benchmark.label = `CPI + ${options.benchmark.value}%`;
        break;
      case 'fixed':
        if (!options.benchmark.value) options.benchmark.value = 7;
        options.benchmark.label = `Fixed ${options.benchmark.value}%`;
        break;
      case 'blended':
        if (!options.benchmark.blended) options.benchmark.blended = {};
        break;
    }
  };

  return {
    normalizeBenchmarkWeightsHandler,
    benchmarkTotal,
    isBenchmarkEnabled,
    benchmarkSummary,
    toggleBenchmark,
    setBenchmarkType,
  };
}
