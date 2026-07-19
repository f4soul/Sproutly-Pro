const fs = require('fs');
const content = `import { getExchangeRates, convertToRub } from './currency';

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
  const targetTickers = Object.keys(TICKER_TO_COINGECKO);
  const hasAllTickers = cachedCryptoRates && targetTickers.every(t => cachedCryptoRates![t]);

  if (cachedCryptoRates && hasAllTickers && isSameDay && now - lastCryptoFetchTime < CRYPTO_CACHE_DURATION) {
    return cachedCryptoRates;
  }

  let rates: CryptoRates = {};

  // 1. CoinGecko (Primary) - Fetch all tickers with direct RUB conversion
  try {
    const ids = targetTickers.map(t => TICKER_TO_COINGECKO[t]).join(',');
    let url = \`https://api.coingecko.com/api/v3/simple/price?ids=\${ids}&vs_currencies=usd,rub\`;
    
    if (COINGECKO_API_KEY) {
      url += \`&x_cg_demo_api_key=\${COINGECKO_API_KEY}\`;
    }
    
    let res = await fetch(url, { cache: 'no-store' });
    
    // Fallback 1: Try without API key if unauthorized
    if (!res.ok && res.status === 401 && COINGECKO_API_KEY) {
      const fallbackUrl = \`https://api.coingecko.com/api/v3/simple/price?ids=\${ids}&vs_currencies=usd,rub\`;
      res = await fetch(fallbackUrl, { cache: 'no-store' });
    }
    
    // Fallback 2: Try Pro API if still failing
    if (!res.ok && res.status === 401 && COINGECKO_API_KEY) {
      const proUrl = \`https://pro-api.coingecko.com/api/v3/simple/price?ids=\${ids}&vs_currencies=usd,rub&x_cg_pro_api_key=\${COINGECKO_API_KEY}\`;
      res = await fetch(proUrl, { cache: 'no-store' });
    }
    
    if (res.ok) {
      const data = await res.json();
      for (const ticker of targetTickers) {
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
    console.error('CoinGecko fetch error:', err);
  }

  // 2. Bybit (Secondary) - Fetch any missing tickers
  const missingBybit = targetTickers.filter(t => !rates[t] && TICKER_TO_BYBIT[t]);
  if (missingBybit.length > 0 || !rates['USDT']) {
    let currencyRates = null;
    try {
      // Need currency rates to convert USD to RUB for Bybit
      currencyRates = await getExchangeRates();
    } catch (e) {
      console.error('Failed to get currency rates for Bybit fallback');
    }
    
    // If USDT is missing, fallback to 1:1 USD and CBR RUB
    if (!rates['USDT']) {
      rates['USDT'] = {
        usd: 1,
        rub: convertToRub(1, 'USD', currencyRates)
      };
    }

    try {
      const promises = missingBybit.map(async (ticker) => {
        const symbol = TICKER_TO_BYBIT[ticker];
        try {
          const url = \`https://api.bybit.com/v5/market/tickers?category=spot&symbol=\${symbol}\`;
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
      console.error('Bybit fallback error:', e);
    }
  }

  // Consider it a success if we fetched at least one real rate (more than just fallback USDT)
  if (Object.keys(rates).length > 0) {
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

  return cachedCryptoRates || rates;
}

export function getCryptoRate(ticker: string, currency: 'usd' | 'rub', rates: CryptoRates | null): number | null {
  const activeRates = rates || cachedCryptoRates;
  if (activeRates && activeRates[ticker]) {
    return activeRates[ticker][currency];
  }
  return null;
}
`;

fs.writeFileSync('src/services/crypto.ts', content);
console.log('Done CryptoService!');
