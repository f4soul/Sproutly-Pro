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
  userId?: string;
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
  sourceNote?: string;
  rate: number;
  formula: CalculationFormula;
  comment?: string;
  isClosed: boolean;
  isArchived?: boolean | number; // New field for Archive
  splitIncome?: boolean;
  updatedAt?: number;
  isTest?: boolean;
}

export interface TaxYearSettings {
  year: number;
  limit: number;
  ndflRate: number; // 13 or 15
}

export interface AppSettings {
  id: string;
  theme: 'light' | 'dark';
  defaultNdflRate: number;
  defaultLimit2025: number;
  bankSortOrder?: 'asc' | 'desc';
  bankSortBy?: 'amount' | 'date';
  showDevTools?: boolean;
  updatedAt?: number;
  userId?: string;
}
