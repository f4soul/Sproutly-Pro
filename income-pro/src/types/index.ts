export type MonthData = {
  normDays: number;
  factDays: number;
  salary: number;
};

export type QuarterData = {
  bonusCoef: number;
  bonusAmount: number;
};

export type YearData = {
  year: number;
  additionalIncome: number;
  bonusBase: number;
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
};

export type Toast = {
  id: string;
  message: string;
  type: 'success' | 'info';
};

export type TaxBracketDetail = {
  rate: number;
  amount: number;
  tax: number;
  label: string;
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
