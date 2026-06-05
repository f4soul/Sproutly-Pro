export type MonthData = {
  normDays: number;
  factDays: number;
  salary: number;
};

export type CalculatedMonth = MonthData & {
  base: number;
  bonus: number;
  gross: number;
  tax13: number;
  net13: number;
};

export type QuarterData = {
  bonusCoef: number;
  bonusAmount: number;
};

export type YearData = {
  year: number;
  additionalIncome: number;
  bonusBase: number;
  baseSalary?: number; // Base salary for auto-filling
  iisContribution?: number; // Contribution to IIS (Type A deduction)
  deductions?: {
    social?: number; // Medical, Education, etc.
    property?: number; // Home purchase
    standard?: number; // Children, etc.
  };
  months: MonthData[];
  quarters: QuarterData[];
  annualBonusCoef: number;
  annualBonusAmount: number;
  extraBonusAmount: number;
};

export type TaxBracket = {
  limit: number;
  rate: number;
  label: string;
};

export type AppState = {
  years: Record<number, YearData>;
  activeYear: number;
  taxBrackets: Record<number, TaxBracket[]>;
  simulation?: SimulationState;
};

export type Toast = {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error' | 'loading';
};

export type TaxBracketDetail = {
  rate: number;
  amount: number;
  tax: number;
  label: string;
};

export type SimulationState = {
  isActive: boolean;
  salaryIncrease: number; // percentage, e.g. 10 for 10%
  bonusMultiplier: number; // multiplier, e.g. 1.2 for 20% increase
  extraIncome: number; // flat amount to add to total gross
  projectedSalary?: number; // custom base salary for autonomous mode
  projectedBonusCoef?: number; // custom bonus coef for autonomous mode
  bonusFrequency?: 'none' | 'monthly' | 'quarterly' | 'annual';
  bonusType?: 'fixed' | 'coef';
  bonusValue?: number; // amount or coef value
};

export type YearlyTotals = {
  totalGross: number;
  progressiveTax: number;
  flatTax: number;
  finalNet: number;
  flatNet: number;
  effectiveRate: number;
  taxDifference: number;
  brackets: TaxBracketDetail[];
};

export type CalculationFormula = 'simple_days' | 'simple_months' | 'compound_monthly' | 'daily_balance' | 'min_balance' | '';

export interface Bank {
  id?: string | number;
  name: string;
  color: string;
  logoText: string;
  logoUrl: string;
  iconScale?: number;
  iconOffsetX?: number;
  iconOffsetY?: number;
  isCustom?: boolean;
  isTest?: boolean;
  userId?: string;
  updatedAt?: number;
}

export interface CashAsset {
  id?: string | number;
  userId?: string;
  amount: number;
  currency: string;
  name: string; // e.g. "Копилка дома", "Сейф"
  comment?: string;
  isArchived?: boolean;
  exchangeRateOnOpen?: number;
  updatedAt?: number;
}

export interface Deposit {
  id?: string | number;
  userId?: string; // For Firebase sync
  bank: string;
  startDate: Date;
  endDate: Date | null;
  amount: number;
  currency: string;
  exchangeRateOnOpen?: number;
  sourceNote?: string;
  rate: number;
  formula: CalculationFormula;
  comment?: string;
  factIncome?: number; // Factual exact income defined by user
  isClosed: boolean;
  isArchived?: boolean | number; // New field for Archive
  splitIncome?: boolean;
  updatedAt?: number;
  isTest?: boolean;
}

export interface DeletedRecord {
  id?: number;
  collection: string;
  docId: string;
  timestamp: number;
}

export interface DayDensity {
  date: string; // ISO string or YYYY-MM-DD
  amount: number;
  count: number;
  maturingCount: number;
  openingCount: number;
  maturingNames: { bank: string; amount: number }[];
  openingNames: { bank: string; amount: number }[];
}

export interface HeatmapData {
  days: Record<string, DayDensity>;
  maxAmount: number;
  minAmount: number;
}

export interface TaxYearSettings {
  year: number;
  limit: number;
  ndflRate: number; // 13 or 15
  updatedAt?: number;
  userId?: string;
}

export interface AppSettings {
  id: string;
  theme: 'light' | 'dark';
  defaultNdflRate: number;
  defaultLimit2025: number;
  incomeCalculationMode?: 'salary' | 'combined';
  bankSortOrder?: 'asc' | 'desc';
  bankSortBy?: 'amount' | 'date';
  privacyLock?: {
    enabled: boolean;
    pin: string | null;
    useBiometrics: boolean;
    credentialId?: string | null;
    credentialIds?: string[] | null;
    timeoutMinutes?: number;
  };
  updatedAt?: number;
  userId?: string;
}
