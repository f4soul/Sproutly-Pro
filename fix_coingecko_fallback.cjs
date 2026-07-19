const fs = require('fs');
let content = fs.readFileSync('src/services/crypto.ts', 'utf-8');

content = content.replace(
  /const res = await fetch\(url, \{ cache: 'no-store' \}\);\s*if \(res\.ok\) \{/,
  `let res = await fetch(url, { cache: 'no-store' });
      
      // Fallback 1: Try without API key if unauthorized (maybe key is invalid)
      if (!res.ok && res.status === 401 && COINGECKO_API_KEY) {
        const fallbackUrl = \`https://api.coingecko.com/api/v3/simple/price?ids=\${ids}&vs_currencies=usd,rub\`;
        res = await fetch(fallbackUrl, { cache: 'no-store' });
      }
      
      // Fallback 2: Try Pro API if still failing (maybe they provided a Pro key)
      if (!res.ok && res.status === 401 && COINGECKO_API_KEY) {
        const proUrl = \`https://pro-api.coingecko.com/api/v3/simple/price?ids=\${ids}&vs_currencies=usd,rub&x_cg_pro_api_key=\${COINGECKO_API_KEY}\`;
        res = await fetch(proUrl, { cache: 'no-store' });
      }
      
      if (res.ok) {`
);

fs.writeFileSync('src/services/crypto.ts', content);
console.log('Fixed CoinGecko fallback');
