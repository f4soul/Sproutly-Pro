import { YearData, TaxBracket } from '../types';
import { DEFAULT_NORMS } from './constants';
import { calculateProgressiveTaxDetailed } from './taxCalculator';

export const calculateYearTotals = (yearData: YearData, taxBrackets: Record<number, TaxBracket[]>) => {
  const calcMonths = yearData.months.map((m, index) => {
    const base = m.factDays < m.normDays ? m.salary * (m.factDays / m.normDays) : m.salary;
    let bonus = 0;
    if (index % 3 === 2) {
      const qIndex = Math.floor(index / 3);
      bonus += yearData.quarters?.[qIndex]?.bonusAmount || 0;
    }
    if (index === 11) {
      bonus += yearData.annualBonusAmount || 0;
      bonus += yearData.extraBonusAmount || 0;
    }
    return base + bonus;
  });
  const totalGross = calcMonths.reduce((a, b) => a + b, 0) + yearData.additionalIncome;
  
  const totalDeductions = (yearData.iisContribution || 0) + 
    (yearData.deductions?.social || 0) + 
    (yearData.deductions?.property || 0) + 
    (yearData.deductions?.standard || 0);

  const { tax: progressiveTax } = calculateProgressiveTaxDetailed(totalGross, yearData.year, taxBrackets, totalDeductions);
  const finalNet = totalGross - progressiveTax;
  return { totalGross, finalNet };
};

export const generateEmptyYear = (year: number, customNorms?: number[]): YearData => {
  const norms = customNorms || DEFAULT_NORMS[year] || DEFAULT_NORMS[2026];
  const defaultQuarters = Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }));

  return {
    year,
    additionalIncome: 0,
    bonusBase: 0,
    baseSalary: 0,
    iisContribution: 0,
    deductions: { social: 0, property: 0, standard: 0 },
    months: Array.from({ length: 12 }, (_, i) => ({
      normDays: norms[i] || 21,
      factDays: norms[i] || 21,
      salary: 0,
    })),
    quarters: defaultQuarters,
    annualBonusCoef: 0,
    annualBonusAmount: 0,
    extraBonusAmount: 0,
  };
};

export const generateDefaultYear = (year: number, _forceEmpty?: boolean, customNorms?: number[]): YearData => {
  return generateEmptyYear(year, customNorms);
};

export const getDefaultExpandedQuarters = (year: number) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3);

  if (year < currentYear) {
    return { 0: false, 1: false, 2: false, 3: false };
  } else if (year === currentYear) {
    return {
      0: currentQuarter === 0,
      1: currentQuarter === 1,
      2: currentQuarter === 2,
      3: currentQuarter === 3,
    };
  } else {
    return { 0: true, 1: false, 2: false, 3: false };
  }
};

export const getPlural = (count: number, one: string, two: string, five: string) => {
  let n = Math.abs(count);
  n %= 100;
  if (n >= 5 && n <= 20) return five;
  n %= 10;
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return two;
  return five;
};
