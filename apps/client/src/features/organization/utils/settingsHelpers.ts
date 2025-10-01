import type { AssetOverride, EquityShock, CpiShift } from '../types/SettingsTypes';

/**
 * Asset Override Utilities
 */
export function ensureOverride(options: any, key: string) {
  if (!options.assets) options.assets = { overrides: {} };
  if (!options.assets.overrides) options.assets.overrides = {};
  if (!options.assets.overrides[key]) options.assets.overrides[key] = {};
}

export function getOverrideMeanPct(options: any, key: string): number | undefined {
  const val = options.assets?.overrides?.[key]?.mean;
  return typeof val === 'number' ? val * 100 : undefined;
}

export function setOverrideMeanPct(options: any, key: string, e: Event) {
  const target = e.target as HTMLInputElement;
  const val = parseFloat(target.value);
  
  if (isNaN(val) || target.value === '') {
    if (options.assets?.overrides?.[key]) {
      delete options.assets.overrides[key].mean;
    }
  } else {
    ensureOverride(options, key);
    options.assets.overrides[key].mean = val / 100;
  }
}

export function getOverrideSdPct(options: any, key: string): number | undefined {
  const val = options.assets?.overrides?.[key]?.sd;
  return typeof val === 'number' ? val * 100 : undefined;
}

export function setOverrideSdPct(options: any, key: string, e: Event) {
  const target = e.target as HTMLInputElement;
  const val = parseFloat(target.value);
  
  if (isNaN(val) || target.value === '') {
    if (options.assets?.overrides?.[key]) {
      delete options.assets.overrides[key].sd;
    }
  } else {
    ensureOverride(options, key);
    options.assets.overrides[key].sd = val / 100;
  }
}

/**
 * Stress Testing Utilities
 */
export function addEquityShock(options: any): void {
  if (!options.stress) options.stress = { equityShocks: [], cpiShifts: [] };
  if (!options.stress.equityShocks) options.stress.equityShocks = [];
  options.stress.equityShocks.push({ assetKey: 'publicEquity', pct: -20, year: 1 });
}

export function removeEquityShock(options: any, index: number): void {
  if (options.stress?.equityShocks) {
    options.stress.equityShocks.splice(index, 1);
  }
}

export function addCpiShock(options: any): void {
  if (!options.stress) options.stress = { equityShocks: [], cpiShifts: [] };
  if (!options.stress.cpiShifts) options.stress.cpiShifts = [];
  options.stress.cpiShifts.push({ deltaPct: 2, from: 1, to: 10 });
}

export function removeCpiShock(options: any, index: number): void {
  if (options.stress?.cpiShifts) {
    options.stress.cpiShifts.splice(index, 1);
  }
}

/**
 * Benchmark Utilities
 */
export function normalizeBenchmarkWeights(options: any): void {
  const blended = options.benchmark?.blended || {};
  const total = Object.values(blended).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
  
  if (total > 0) {
    Object.keys(blended).forEach(key => {
      const value = Number(blended[key]) || 0;
      blended[key] = Math.round((value / total) * 100);
    });
  }
}

/**
 * Form Validation Utilities
 */
export function validateFinancialInputs(inputs: any): { hasErrors: boolean; isComplete: boolean } {
  const hasErrors = (
    (inputs.initialEndowment && inputs.initialEndowment < 1000000) ||
    (inputs.spendingPolicyRate && (inputs.spendingPolicyRate < 0 || inputs.spendingPolicyRate > 15)) ||
    (inputs.investmentExpenseRate && (inputs.investmentExpenseRate < 0 || inputs.investmentExpenseRate > 5))
  );

  const isComplete = (
    inputs.initialEndowment && inputs.initialEndowment >= 1000000 &&
    inputs.spendingPolicyRate && inputs.spendingPolicyRate >= 0 && inputs.spendingPolicyRate <= 15 &&
    inputs.investmentExpenseRate !== undefined && inputs.investmentExpenseRate >= 0 && inputs.investmentExpenseRate <= 5
  );

  return { hasErrors, isComplete };
}

export function validateAllInputs(inputs: any): boolean {
  return (
    (inputs.initialEndowment && inputs.initialEndowment < 1000000) ||
    (inputs.spendingPolicyRate && (inputs.spendingPolicyRate < 0 || inputs.spendingPolicyRate > 15)) ||
    (inputs.investmentExpenseRate && (inputs.investmentExpenseRate < 0 || inputs.investmentExpenseRate > 5)) ||
    (inputs.initialOperatingExpense && inputs.initialOperatingExpense < 0) ||
    (inputs.initialGrant && inputs.initialGrant < 0)
  );
}

export function hasRequiredFields(inputs: any): boolean {
  return (
    inputs.initialEndowment && inputs.initialEndowment >= 1000000 &&
    inputs.spendingPolicyRate && inputs.spendingPolicyRate >= 0 && inputs.spendingPolicyRate <= 15
  );
}
