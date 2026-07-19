const fs = require('fs');
let content = fs.readFileSync('src/services/crypto.ts', 'utf8');

const replacement = `import { getExchangeRates, convertToRub } from './currency';

export interface CryptoRates {
  [ticker: string]: {
    usd: number;
    rub: number;
  };
}

let cachedCryptoRates: CryptoRates | null = null;
let lastCryptoFetchTime = 0;
const CRYPTO_CACHE_DURATION = 1000 * 60 * 60; // 1 hour

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

const TICKER_TO_BINANCE: Record<string, string> = {
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT',
  'USDT': 'USDTUSDT', // special case
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
  let fetchSuccess = false;

  try {
    const ids = Object.values(TICKER_TO_COINGECKO).join(',');
    const url = \`https://api.coingecko.com/api/v3/simple/price?ids=\${ids}&vs_currencies=usd,rub\`;
    
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('CoinGecko network error');
    
    const data = await res.json();
    for (const [ticker, id] of Object.entries(TICKER_TO_COINGECKO)) {
      if (data[id]) {
        rates[ticker] = {
          usd: data[id].usd,
          rub: data[id].rub
        };
      }
    }
    fetchSuccess = true;
  } catch (err) {
    console.error('CoinGecko fetch failed, falling back to Binance:', err);
    
    try {
      // Fallback to Binance + CBR USD rate
      const currencyRates = await getExchangeRates();
      const symbols = Object.values(TICKER_TO_BINANCE).filter(s => s !== 'USDTUSDT');
      const binanceUrl = \`https://api.binance.com/api/v3/ticker/price?symbols=\${JSON.stringify(symbols)}\`;
      
      const res = await fetch(binanceUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error('Binance network error');
      
      const data: { symbol: string, price: string }[] = await res.json();
      
      rates['USDT'] = {
        usd: 1,
        rub: convertToRub(1, 'USD', currencyRates)
      };
      
      for (const item of data) {
        const ticker = Object.keys(TICKER_TO_BINANCE).find(k => TICKER_TO_BINANCE[k] === item.symbol);
        if (ticker) {
          const usdPrice = parseFloat(item.price);
          rates[ticker] = {
            usd: usdPrice,
            rub: convertToRub(usdPrice, 'USD', currencyRates)
          };
        }
      }
      fetchSuccess = true;
    } catch (binanceErr) {
      console.error('Binance fallback also failed:', binanceErr);
    }
  }

  if (fetchSuccess && Object.keys(rates).length > 0) {
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
`;

fs.writeFileSync('src/services/crypto.ts', replacement);
console.log('crypto.ts updated with Binance fallback');
