export interface CurrencyRates {
  Date: string;
  PreviousDate: string;
  PreviousURL: string;
  Timestamp: string;
  Valute: {
    [key: string]: {
      ID: string;
      NumCode: string;
      CharCode: string;
      Nominal: number;
      Name: string;
      Value: number;
      Previous: number;
    }
  }
}

let cachedRates: CurrencyRates | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Try to hydrate cached rates from localStorage immediately on load
try {
  const storedRates = localStorage.getItem('cbr_cached_rates');
  const storedTime = localStorage.getItem('cbr_rates_fetch_time');
  if (storedRates) {
    cachedRates = JSON.parse(storedRates);
  }
  if (storedTime) {
    lastFetchTime = Number(storedTime) || 0;
  }
} catch (e) {
  console.error('Failed to load cached exchange rates from localStorage:', e);
}

export async function getExchangeRates(): Promise<CurrencyRates | null> {
  const now = Date.now();
  const isSameDay = new Date(lastFetchTime).getDate() === new Date(now).getDate();
  
  if (cachedRates && isSameDay && now - lastFetchTime < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', { cache: 'no-store' });
    if (!res.ok) throw new Error('Network error');
    const data: CurrencyRates = await res.json();
    cachedRates = data;
    lastFetchTime = now;
    
    // Save to localStorage
    try {
      localStorage.setItem('cbr_cached_rates', JSON.stringify(data));
      localStorage.setItem('cbr_rates_fetch_time', String(lastFetchTime));
    } catch (e) {
      console.error('Failed to write exchange rates to localStorage:', e);
    }
    
    return data;
  } catch (err) {
    console.error('Failed to load CBR exchange rates:', err);
    return cachedRates;
  }
}

export function convertToRub(amount: number, currency: string, rates: CurrencyRates | null): number {
  if (currency === 'RUB' || !currency) return amount;
  
  // Use loaded or cached rates if available
  const activeRates = rates || cachedRates;
  if (activeRates && activeRates.Valute && activeRates.Valute[currency]) {
    const valute = activeRates.Valute[currency];
    const rateForOne = valute.Value / valute.Nominal;
    return amount * rateForOne;
  }
  
  // Hardcoded realistic approximate fallback rates for first-time render before API completes
  const fallbacks: { [key: string]: number } = {
    USD: 90.0,
    EUR: 98.0,
    CNY: 12.5,
  };
  return amount * (fallbacks[currency] || 1);
}
