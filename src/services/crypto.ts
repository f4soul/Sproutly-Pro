import { getExchangeRates, convertToRub } from './currency';

export interface CryptoRates {
  [ticker: string]: {
    usd: number;
    rub: number;
  };
}

let cachedCryptoRates: CryptoRates | null = null;
let lastCryptoFetchTime = 0;
const CRYPTO_CACHE_DURATION = 1000 * 60 * 60; // 1 hour
const COINGECKO_API_KEY = import.meta.env.VITE_COINGECKO_API_KEY as string | undefined;

try {
  const storedRates = localStorage.getItem('coingecko_cached_rates');
  const storedTime = localStorage.getItem('coingecko_fetch_time');
  if (storedRates) {
    cachedCryptoRates = JSON.parse(storedRates);
  }
  if (storedTime) {
    lastCryptoFetchTime = Number(storedTime) || 0;
  }
} catch (e) {
  console.error('Failed to load cached crypto rates from localStorage:', e);
}

const TICKER_TO_COINGECKO: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'TON': 'the-open-network',
  'NOT': 'notcoin',
  'SOL': 'solana'
};

const TICKER_TO_BYBIT: Record<string, string> = {
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT',
  'TON': 'TONUSDT',
  'NOT': 'NOTUSDT',
  'SOL': 'SOLUSDT'
};

export async function getCryptoRates(): Promise<CryptoRates | null> {
  const now = Date.now();
  const isSameDay = new Date(lastCryptoFetchTime).toDateString() === new Date().toDateString();
  
  if (cachedCryptoRates && isSameDay && now - lastCryptoFetchTime < CRYPTO_CACHE_DURATION) {
    return cachedCryptoRates;
  }
  
  let rates: CryptoRates = {};
  
  // Need to get currency rates first to convert USD to RUB
  const currencyRates = await getExchangeRates();
  
  // USDT is always 1:1 to USD
  rates['USDT'] = {
    usd: 1,
    rub: convertToRub(1, 'USD', currencyRates)
  };

  const targetTickers = Object.keys(TICKER_TO_COINGECKO);

  // 1. Bybit (Primary) - Fetch individually so one failure doesn't break others
  try {
    const promises = Object.entries(TICKER_TO_BYBIT).map(async ([ticker, symbol]) => {
      if (rates[ticker]) return; // Skip if already populated
      try {
        const url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.retCode === 0 && data.result?.list?.[0]?.lastPrice) {
          const usdPrice = parseFloat(data.result.list[0].lastPrice);
          rates[ticker] = { usd: usdPrice, rub: convertToRub(usdPrice, 'USD', currencyRates) };
        }
      } catch (e) {
        // Silently ignore individual Bybit fetch failures
      }
    });
    await Promise.all(promises);
  } catch (e) {
    console.error('Bybit batch error:', e);
  }

  // 2. CoinGecko (Secondary) - Fetch any missing tickers
  const missingCoinGecko = targetTickers.filter(t => !rates[t] && TICKER_TO_COINGECKO[t]);
  if (missingCoinGecko.length > 0) {
    try {
      const ids = missingCoinGecko.map(t => TICKER_TO_COINGECKO[t]).join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,rub`;
      
      const headers = COINGECKO_API_KEY ? { 'x-cg-demo-api-key': COINGECKO_API_KEY } : {};
      const res = await fetch(url, { cache: 'no-store', headers });
      
      if (res.ok) {
        const data = await res.json();
        for (const ticker of missingCoinGecko) {
          const id = TICKER_TO_COINGECKO[ticker];
          if (data[id]) {
            rates[ticker] = {
              usd: data[id].usd,
              rub: data[id].rub
            };
          }
        }
      }
    } catch (err) {
      console.error('CoinGecko fallback error:', err);
    }
  }

    // Consider it a success if we fetched at least one real rate (more than just USDT)
  if (Object.keys(rates).length > 1) {
    cachedCryptoRates = rates;
    lastCryptoFetchTime = now;
    
    try {
      localStorage.setItem('coingecko_cached_rates', JSON.stringify(rates));
      localStorage.setItem('coingecko_fetch_time', String(lastCryptoFetchTime));
    } catch (e) {
      console.error('Failed to write crypto rates to localStorage:', e);
    }
    return rates;
  }

  return cachedCryptoRates;
}

export function getCryptoRate(ticker: string, currency: 'usd' | 'rub', rates: CryptoRates | null): number | null {
  const activeRates = rates || cachedCryptoRates;
  if (activeRates && activeRates[ticker]) {
    return activeRates[ticker][currency];
  }
  return null;
}
