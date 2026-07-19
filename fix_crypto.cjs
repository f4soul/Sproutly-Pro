const fs = require('fs');
let content = fs.readFileSync('src/services/crypto.ts', 'utf-8');

content = content.replace(
  /const headers = COINGECKO_API_KEY \? \{ 'x-cg-demo-api-key': COINGECKO_API_KEY \} : \{\};\n\s*const res = await fetch\(url, \{ cache: 'no-store', headers \}\);/,
  `if (COINGECKO_API_KEY) {
        url += \`&x_cg_demo_api_key=\${COINGECKO_API_KEY}\`;
      }
      const res = await fetch(url, { cache: 'no-store' });`
);

fs.writeFileSync('src/services/crypto.ts', content);
console.log('Fixed CoinGecko fetch');
