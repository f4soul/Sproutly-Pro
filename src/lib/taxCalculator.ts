import { logger } from '../lib/logger';
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
  const taxableBase = Math.max(0, gross - deduction);
  let remaining = taxableBase;
  let tax = 0;
  const brackets = [];
  const scale = taxBrackets[year] || taxBrackets[2025] || DEFAULT_TAX_BRACKETS[2025];

  let previousLimit = 0;

  for (let index = 0; index < scale.length; index++) {
    const bracket = scale[index];
    const actualLimit = bracket.limit === null ? Infinity : bracket.limit;
    if (remaining > 0) {
      const bracketSize = actualLimit - previousLimit;
      const amountInBracket = Math.min(remaining, bracketSize);
      const t = amountInBracket * bracket.rate;
      tax += t;
      brackets.push({ rate: bracket.rate * 100, amount: amountInBracket, tax: t, label: bracket.label });
      remaining -= amountInBracket;
    }
    previousLimit = actualLimit;
  }

  return { tax, brackets };
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string) {
  if (!formatterCache.has(currency)) {
    formatterCache.set(currency, new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }));
  }
  return formatterCache.get(currency)!;
}

const numberFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCurrency = (value: number, currencyCode: string = 'RUB') => {
  let validCurrency = currencyCode;
  
  if (validCurrency === '₽') {
    validCurrency = 'RUB'; // Map old stored values
  }

  try {
    return getCurrencyFormatter(validCurrency).format(value);
  } catch {
    logger.error('Invalid currency code:', validCurrency);
    // Fallback if the code is really invalid
    return getCurrencyFormatter('RUB').format(value);
  }
};

export const formatNumber = (value: number) => {
  return numberFormatter.format(value);
};
