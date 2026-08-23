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

export function getPlural(number: number, words: [string, string, string]): string {
  const n = Math.abs(number) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return words[2];
  if (n1 > 1 && n1 < 5) return words[1];
  if (n1 === 1) return words[0];
  return words[2];
}

export function toISOLocalDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseISOLocalDate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const parts = iso.split('-');
  if (parts.length !== 3) return null;
  const [yyyy, mm, dd] = parts.map(Number);
  const date = new Date(yyyy, mm - 1, dd);
  return isNaN(date.getTime()) ? null : date;
}

export function maskDateInput(rawValue: string | undefined | null): { display: string; isoDate: string | null } {
  if (!rawValue) return { display: "", isoDate: null };
  const digits = rawValue.replace(/\D/g, "").slice(0, 8);
  let display = digits;
  if (digits.length > 4) {
    display = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
  } else if (digits.length > 2) {
    display = `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  let isoDate: string | null = null;
  if (digits.length === 8) {
    const day = parseInt(digits.slice(0, 2), 10);
    const month = parseInt(digits.slice(2, 4), 10) - 1;
    const year = parseInt(digits.slice(4, 8), 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime()) && date.getMonth() === month) {
      isoDate = toISOLocalDate(date);
    }
  }
  return { display, isoDate };
}
