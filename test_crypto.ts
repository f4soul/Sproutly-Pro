const getExchangeRates = async () => null; const convertToRub = (a, b, c) => a * 90;

interface CryptoRates {
  [ticker: string]: {
    usd: number;
    rub: number;
  };
}

let cachedCryptoRates: CryptoRates | null = null;
let lastCryptoFetchTime = 0;
const CRYPTO_CACHE_DURATION = 1000 * 60 * 60; // 1 hour
const COINGECKO_API_KEY = undefined as string | undefined;

try {
  const storedRates = null;
  const storedTime = null;
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

const TICKER_TO_BYBIT: Record<string, string> = {
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT',
  'TON': 'TONUSDT',
  'NOT': 'NOTUSDT',
  'SOL': 'SOLUSDT'
};

async function getCryptoRates(): Promise<CryptoRates | null> {
  const now = Date.now();
  const isSameDay = new Date(lastCryptoFetchTime).toDateString() === new Date().toDateString();
  
  if (cachedCryptoRates && isSameDay && now - lastCryptoFetchTime < CRYPTO_CACHE_DURATION) {
    return cachedCryptoRates;
  }
  
  let rates: CryptoRates = {};
  let fetchSuccess = false;
  
  // Need to get currency rates first to convert USD to RUB
  const currencyRates = await getExchangeRates();

  try {
    // 1. First try Bybit (Primary)
    const promises = Object.entries(TICKER_TO_BYBIT).map(async ([ticker, symbol]) => {
      const url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Bybit network error for ${symbol}`);
      
      const data = await res.json();
      if (data.retCode !== 0 || !data.result?.list?.[0]?.lastPrice) {
        throw new Error(`Bybit API error for ${symbol}`);
      }
      
      const usdPrice = parseFloat(data.result.list[0].lastPrice);
      return { ticker, usdPrice };
    });
    
    const results = await Promise.all(promises);
    
    // Add USDT manually as 1:1
    rates['USDT'] = {
      usd: 1,
      rub: convertToRub(1, 'USD', currencyRates)
    };
    
    for (const result of results) {
      rates[result.ticker] = {
        usd: result.usdPrice,
        rub: convertToRub(result.usdPrice, 'USD', currencyRates)
      };
    }
    
    fetchSuccess = true;
  } catch (bybitErr) {
    console.error('Bybit fetch failed, falling back to CoinGecko:', bybitErr);
    
    // 2. Try CoinGecko (Secondary)
    try {
      const ids = Object.values(TICKER_TO_COINGECKO).join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,rub`;
      
      const headers = COINGECKO_API_KEY ? { 'x-cg-demo-api-key': COINGECKO_API_KEY } : {};
      const res = await fetch(url, { cache: 'no-store', headers });
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
      
      // 3. Try Binance (Tertiary)
      try {
        const symbols = Object.values(TICKER_TO_BINANCE).filter(s => s !== 'USDTUSDT');
        const binanceUrl = `https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(symbols)}`;
        
        const res = await fetch(binanceUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error('Binance network error');
        
        const data = await res.json();
        
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
  }

  if (fetchSuccess && Object.keys(rates).length > 0) {
    cachedCryptoRates = rates;
    lastCryptoFetchTime = now;
    
    try {
      null);
      null);
    } catch (e) {
      console.error('Failed to write crypto rates to localStorage:', e);
    }
    return rates;
  }

  return cachedCryptoRates;
}

function getCryptoRate(ticker: string, currency: 'usd' | 'rub', rates: CryptoRates | null): number | null {
  const activeRates = rates || cachedCryptoRates;
  if (activeRates && activeRates[ticker]) {
    return activeRates[ticker][currency];
  }
  return null;
}

getCryptoRates().then(rates => console.log(rates)).catch(err => console.error(err));