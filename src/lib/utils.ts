import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currencyCode: string = 'RUB'): string {
  // If the value has decimals, show up to 2. Else 0.
  const hasDecimals = value % 1 !== 0;
  
  let validCurrency = currencyCode;
  if (validCurrency === '₽') {
    validCurrency = 'RUB'; // Map old stored values
  }

  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: validCurrency,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    console.error('Invalid currency code:', validCurrency);
    // Fallback
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
