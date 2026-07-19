const fs = require('fs');
let content = fs.readFileSync('src/services/crypto.ts', 'utf-8');

// Remove TICKER_TO_BINANCE block
content = content.replace(/const TICKER_TO_BINANCE: Record<string, string> = {[\s\S]*?};\n\n/, '');

// Remove Binance fallback block
content = content.replace(/\/\/ 3\. Binance \(Tertiary\) - Fetch remaining missing tickers[\s\S]*?\}\n  \}\n\n/, '');

fs.writeFileSync('src/services/crypto.ts', content);
console.log('Removed Binance from crypto.ts');
