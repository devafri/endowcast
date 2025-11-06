export interface TabConfig {
  id: string;
  label: string;
  icon: string;
  feature: string;
}

export interface AssetOverride {
  mean?: number;
  sd?: number;
}

export interface EquityShock {
  assetKey: string;
  pct: number;
  year: number;
}

export interface CpiShift {
  deltaPct: number;
  from: number;
  to: number;
}

export interface StressTestConfig {
  equityShocks: EquityShock[];
  cpiShifts: CpiShift[];
}

export interface BenchmarkConfig {
  enabled: boolean;
  type: 'cpi_plus' | 'fixed' | 'asset_class' | 'blended';
  value?: number;
  label?: string;
  assetKey?: string;
  blended?: Record<string, number>;
}

export interface FormValidationState {
  isFinancialSectionComplete: boolean;
  hasFinancialErrors: boolean;
  isPortfolioSectionComplete: boolean;
  hasPortfolioErrors: boolean;
}

export interface SettingsFormData {
  initialEndowment: number;
  spendingPolicyRate: number;
  investmentExpenseRate: number;
  riskFreeRate?: number;
  inflationRate?: number;
  initialOperatingExpense: number;
  initialGrant: number;
  portfolioWeights: Record<string, number>;
  grantTargets: number[];
}

// Simulation input and option types to match simulation store
export interface SimulationInputs {
  initialEndowment: number;
  spendingPolicyRate: number;
  investmentExpenseRate: number;
  riskFreeRate?: number;
  inflationRate?: number;
  initialOperatingExpense: number;
  initialGrant: number;
  portfolioWeights: Record<string, number>;
  grantTargets: number[];
}

export interface SimulationOptions {
  years: number;
  startYear: number;
  seed?: number;
  spendingPolicy?: {
    type: string;
    cpiLinked: boolean;
    floorYoY?: number;
    capYoY?: number;
  };
  rebalancing?: {
    bandPct: number;
    frequency: string;
  };
  stress?: StressTestConfig;
  assets?: {
    overrides: Record<string, AssetOverride>;
    limits?: Record<string, any>;
  };
  corpus?: {
    enabled: boolean;
    initialValue: number;
  };
  benchmark?: BenchmarkConfig;
}
