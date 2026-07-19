const fs = require('fs');
let content = fs.readFileSync('src/services/crypto.ts', 'utf-8');

content = content.replace(
  /const targetTickers = Object\.keys\(TICKER_TO_COINGECKO\);\n  \/\/ 1\. Bybit/,
  `// 1. Bybit`
);

content = content.replace(
  /export async function getCryptoRates\(\): Promise<CryptoRates \| null> \{\n  const now = Date\.now\(\);\n  const isSameDay = new Date\(lastCryptoFetchTime\)\.toDateString\(\) === new Date\(\)\.toDateString\(\);\n  \n  if \(cachedCryptoRates && isSameDay && now - lastCryptoFetchTime < CRYPTO_CACHE_DURATION\) \{\n    return cachedCryptoRates;\n  \}/,
  `export async function getCryptoRates(): Promise<CryptoRates | null> {
  const now = Date.now();
  const isSameDay = new Date(lastCryptoFetchTime).toDateString() === new Date().toDateString();
  const targetTickers = Object.keys(TICKER_TO_COINGECKO);
  const hasAllTickers = cachedCryptoRates && targetTickers.every(t => cachedCryptoRates![t]);
  
  if (cachedCryptoRates && hasAllTickers && isSameDay && now - lastCryptoFetchTime < CRYPTO_CACHE_DURATION) {
    return cachedCryptoRates;
  }`
);

fs.writeFileSync('src/services/crypto.ts', content);
console.log('Fixed cache logic');
