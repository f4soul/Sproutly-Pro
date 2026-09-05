import { logger } from '../lib/logger';
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
  const storedRates = localStorage.getItem('cbr_cached_rates_v2');
  const storedTime = localStorage.getItem('cbr_rates_fetch_time_v2');
  if (storedRates) {
    cachedRates = JSON.parse(storedRates);
  }
  if (storedTime) {
    lastFetchTime = Number(storedTime) || 0;
  }
} catch (e) {
  logger.error('Failed to load cached exchange rates from localStorage:', e);
}

export async function getExchangeRates(): Promise<CurrencyRates | null> {
  const now = Date.now();
  const isSameDay = new Date(lastFetchTime).toDateString() === new Date().toDateString();
  
  if (cachedRates && isSameDay && now - lastFetchTime < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    let res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', { cache: 'no-store' }).catch(() => null);
    
    // Fallback to open.er-api.com if CBR fails (e.g., due to adblockers or CORS)
    if (!res || !res.ok) {
      const erRes = await fetch('https://open.er-api.com/v6/latest/RUB', { cache: 'no-store' }).catch(() => null);
      if (erRes && erRes.ok) {
        const erData = await erRes.json();
        const valute: { [key: string]: any } = {};
        
        if (erData && erData.rates) {
          for (const [currency, rate] of Object.entries(erData.rates)) {
            if (currency === 'RUB') continue;
            const numRate = rate as number;
            valute[currency] = {
              ID: currency,
              NumCode: '',
              CharCode: currency,
              Nominal: 1,
              Name: currency,
              Value: numRate > 0 ? 1 / numRate : 0,
              Previous: numRate > 0 ? 1 / numRate : 0,
            };
          }
        }
        
        const data: CurrencyRates = {
          Date: erData.time_last_update_utc || new Date().toISOString(),
          PreviousDate: erData.time_last_update_utc || new Date().toISOString(),
          PreviousURL: '',
          Timestamp: erData.time_last_update_utc || new Date().toISOString(),
          Valute: valute
        };
        
        cachedRates = data;
        lastFetchTime = now;
        
        try {
          localStorage.setItem('cbr_cached_rates_v2', JSON.stringify(data));
          localStorage.setItem('cbr_rates_fetch_time_v2', String(lastFetchTime));
        } catch (e) {
          logger.error('Failed to write exchange rates to localStorage:', e);
        }
        
        return data;
      }
    }
    
    // Second fallback to allorigins proxy if everything else fails
    if (!res || !res.ok) {
      res = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.cbr-xml-daily.ru/daily_json.js'), { cache: 'no-store' }).catch(() => null);
    }

    if (!res || !res.ok) throw new Error('Network error');
    const data: CurrencyRates = await res.json();
    cachedRates = data;
    lastFetchTime = now;
    
    // Save to localStorage
    try {
      localStorage.setItem('cbr_cached_rates_v2', JSON.stringify(data));
      localStorage.setItem('cbr_rates_fetch_time_v2', String(lastFetchTime));
    } catch (e) {
      logger.error('Failed to write exchange rates to localStorage:', e);
    }
    
    return data;
  } catch (err) {
    logger.error('Failed to load CBR exchange rates:', err);
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
