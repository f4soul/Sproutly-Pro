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

export interface IncomeColumnDef {
  id: string;
  name: string;
  type: 'rub' | 'percent_base';
  group: 'base' | 'bonus' | 'allowance' | 'other';
}

export interface MonthDataV2 {
  normDays: number;
  factDays: number;
  salary: number;
  values: Record<string, number>;
}

export interface YearDataV2 {
  settings?: {
    showQuarterly?: boolean;
    showAnnual?: boolean;
    showMonthly?: boolean;
    showExtraAnnual?: boolean;
    annualCalcType?: 'rub' | 'percent' | 'coef' | 'percent_annual';
    extraAnnualCalcType?: 'rub' | 'percent' | 'coef' | 'percent_annual';
    quarterCalcType?: 'rub' | 'percent' | 'coef';
    mainCalcType?: 'rub' | 'percent' | 'coef';
  };
  columns: IncomeColumnDef[];
  months: MonthDataV2[];
}

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
  v2?: YearDataV2; // New architecture data
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

export interface ProductionCalendar {
  year: number;
  workingDays: number[]; // Array of 12 numbers
}

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
  purchaseDate?: string;
  updatedAt?: number;
}

export type CryptoTicker = 'USDT' | 'BTC' | 'ETH' | 'TON' | 'CUSTOM';

export interface CryptoAsset {
  id?: string | number;
  userId?: string;
  ticker: string; // "USDT", "BTC", либо произвольный тикер, если пользователь ввёл свой
  quantity: number; // количество монет/токенов в портфеле
  amount: number; // вложено в рублях (себестоимость), по аналогии с InvestmentAsset.amount
  currentValue?: number; // текущая рублёвая оценка позиции, вводится вручную (курс крипты не публикует ЦБ РФ, авто-конвертации нет)
  comment?: string;
  purchaseDate?: string; // Дата приобретения актива, в формате YYYY-MM-DD
  isArchived?: boolean;
  updatedAt?: number;
}

export type InvestmentAccountType = 'brokerage' | 'iis';

export type IISType = 'A' | 'B' | '3'; // A: deduction on deposit, B: tax free profit, 3: both

export interface InvestmentAsset {
  id?: string | number;
  userId?: string;
  name: string; // e.g. "T-Invest", "Sber Broker"
  type: InvestmentAccountType;
  iisType?: IISType;
  startDate: Date | null;
  amount: number; // Total contributed amount (Пополнения - Выводы)
  currentValue: number; // Current portfolio value (Текущая стоимость)
  currency: string;
  deductionsReceived?: number; // Sum of NDFL returns received (for IIS type A/3)
  comment?: string;
  isArchived?: boolean;
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
  historicalIncome?: number; // Income fixed from past balance changes
  lastAmountUpdate?: number; // Timestamp of the last balance change
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
  hiddenAssetTabs?: ('cash' | 'investments' | 'crypto')[];
  assetTabOrder?: ('cash' | 'investments' | 'crypto')[];
  tourCompleted?: boolean;
  tourCompletedAssets?: boolean;
  tourCompletedIncome?: boolean;
  privacyLock?: {
    enabled: boolean;
    pin: string | null;
    pinHash?: string | null;
    useBiometrics: boolean;
    credentialId?: string | null;
    credentialIds?: string[] | null;
    timeoutMinutes?: number;
  };
  updatedAt?: number;
  userId?: string;
}
