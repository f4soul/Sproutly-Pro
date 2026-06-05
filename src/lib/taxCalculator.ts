import { TaxBracket } from '../types';
import { DEFAULT_TAX_BRACKETS } from './constants';

export const calculateProgressiveTaxDetailed = (
  gross: number, 
  year: number, 
  taxBrackets: Record<number, TaxBracket[]>,
  deduction: number = 0
) => {
  // gross here should be the total taxable income (e.g. Salary + Taxable Deposit Interest)
  // deduction reduces the taxable base
  let taxableBase = Math.max(0, gross - deduction);
  let remaining = taxableBase;
  let tax = 0;
  const brackets = [];
  const scale = taxBrackets[year] || taxBrackets[2025] || DEFAULT_TAX_BRACKETS[2025];

  let previousLimit = 0;

  for (const bracket of scale) {
    if (remaining > 0) {
      const bracketSize = bracket.limit - previousLimit;
      const amountInBracket = Math.min(remaining, bracketSize);
      const t = amountInBracket * bracket.rate;
      tax += t;
      brackets.push({ rate: bracket.rate * 100, amount: amountInBracket, tax: t, label: bracket.label });
      remaining -= amountInBracket;
    }
    previousLimit = bracket.limit;
  }

  return { tax, brackets };
};

export const formatCurrency = (value: number, currencyCode: string = 'RUB') => {
  let validCurrency = currencyCode;
  
  if (validCurrency === '₽') {
    validCurrency = 'RUB'; // Map old stored values
  }

  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: validCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (err) {
    console.error('Invalid currency code:', validCurrency);
    // Fallback if the code is really invalid
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
};

export const formatNumber = (value: number) => {
  return new Intl.NumberFormat('ru-RU', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};
