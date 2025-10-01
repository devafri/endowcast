import { computed, type ComputedRef } from 'vue';
import { validateFinancialInputs, validateAllInputs, hasRequiredFields } from '../utils/settingsHelpers';
import type { FormValidationState } from '../types/SettingsTypes';

export interface UseSettingsValidation {
  // Financial validation
  hasFinancialErrors: ComputedRef<boolean>;
  isFinancialSectionComplete: ComputedRef<boolean>;
  
  // Portfolio validation
  isPortfolioSectionComplete: ComputedRef<boolean>;
  hasPortfolioErrors: ComputedRef<boolean>;
  portfolioTotal: ComputedRef<number>;
  
  // Overall validation
  hasValidationErrors: ComputedRef<boolean>;
  hasRequiredFieldsComputed: ComputedRef<boolean>;
  
  // Validation state object
  validationState: ComputedRef<FormValidationState>;
}

export function useSettingsValidation(inputs: any): UseSettingsValidation {
  
  // Financial validation
  const financialValidation = computed(() => validateFinancialInputs(inputs));
  const hasFinancialErrors = computed(() => financialValidation.value.hasErrors);
  const isFinancialSectionComplete = computed(() => financialValidation.value.isComplete);
  
  // Portfolio validation
  const portfolioTotal = computed(() => {
    const weights = inputs.portfolioWeights || {};
    return Object.values(weights).reduce((sum: number, weight: any) => sum + (Number(weight) || 0), 0);
  });
  
  const isPortfolioSectionComplete = computed(() => {
    return Math.abs(portfolioTotal.value - 100) < 0.01; // Allow for small rounding errors
  });
  
  const hasPortfolioErrors = computed(() => {
    return portfolioTotal.value > 100.01 || portfolioTotal.value < 99.99;
  });
  
  // Overall validation
  const hasValidationErrors = computed(() => validateAllInputs(inputs));
  const hasRequiredFieldsComputed = computed(() => hasRequiredFields(inputs));
  
  // Combined validation state
  const validationState = computed((): FormValidationState => ({
    isFinancialSectionComplete: isFinancialSectionComplete.value,
    hasFinancialErrors: hasFinancialErrors.value,
    isPortfolioSectionComplete: isPortfolioSectionComplete.value,
    hasPortfolioErrors: hasPortfolioErrors.value,
  }));
  
  return {
    hasFinancialErrors,
    isFinancialSectionComplete,
    isPortfolioSectionComplete,
    hasPortfolioErrors,
    portfolioTotal,
    hasValidationErrors,
    hasRequiredFieldsComputed,
    validationState,
  };
}
