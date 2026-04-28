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

export const generateEmptyYear = (year: number): YearData => {
  const norms = DEFAULT_NORMS[year] || DEFAULT_NORMS[2026];
  const defaultQuarters = Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }));

  return {
    year,
    additionalIncome: 0,
    bonusBase: 169500, // Default base
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

export const generateDefaultYear = (year: number, forceEmpty: boolean = false): YearData => {
  if (forceEmpty) return generateEmptyYear(year);
  
  const norms = DEFAULT_NORMS[year] || DEFAULT_NORMS[2026];
  
  const defaultQuarters = Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }));

  if (year === 2024) {
    const salary2024 = [
      86233.66, 126195.58, 142025.00, 153059.52, 210248.82, 89700.00,
      142315.79, 152750.00, 145940.48, 179666.67, 195000.00, 145211.62
    ];
    return {
      year,
      additionalIncome: 0,
      bonusBase: 169500,
      baseSalary: 0,
      iisContribution: 0,
      deductions: { social: 0, property: 0, standard: 0 },
      months: Array.from({ length: 12 }, (_, i) => ({
        normDays: norms[i] || 21,
        factDays: norms[i] || 21,
        salary: salary2024[i],
      })),
      quarters: [
        { bonusCoef: 0, bonusAmount: 39418.50 },
        { bonusCoef: 0, bonusAmount: 59012.88 },
        { bonusCoef: 0, bonusAmount: 149500.01 },
        { bonusCoef: 0, bonusAmount: 149500.00 }
      ],
      annualBonusCoef: 0,
      annualBonusAmount: 371765.70,
      extraBonusAmount: 0,
    };
  }

  if (year === 2025) {
    const salary2025 = [
      43970.58, 180279.42, 193815.69, 143389.74, 122416.67, 174951.76,
      164457.66, 155111.79, 165464.29, 143706.52, 124315.67, 243301.43
    ];

    return {
      year,
      additionalIncome: 0,
      bonusBase: 169500,
      baseSalary: 0,
      iisContribution: 0,
      deductions: { social: 0, property: 0, standard: 0 },
      months: Array.from({ length: 12 }, (_, i) => ({
        normDays: norms[i] || 21,
        factDays: norms[i] || 21,
        salary: salary2025[i],
      })),
      quarters: [
        { bonusCoef: 0, bonusAmount: 0 },
        { bonusCoef: 0, bonusAmount: 139882.13 },
        { bonusCoef: 0, bonusAmount: 164169.10 },
        { bonusCoef: 0, bonusAmount: 274157.00 }
      ],
      annualBonusCoef: 0,
      annualBonusAmount: 414765.52,
      extraBonusAmount: 0,
    };
  }

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
