const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/BentoDashboard.tsx', 'utf8');

if (!code.includes('getCryptoRate')) {
  code = code.replace(
    /import \{ getExchangeRates, convertToRub, CurrencyRates \} from '\.\.\/\.\.\/services\/currency';/,
    `import { getExchangeRates, convertToRub, CurrencyRates } from '../../services/currency';\nimport { getCryptoRate } from '../../services/crypto';`
  );
}

code = code.replace(
  /cryptoAssets\.forEach\(\(c\) => \{\s*if \(!c\.isArchived\) \{\s*totalCryptoAmount \+= c\.currentValue;\s*\}\s*\}\);/,
  `cryptoAssets.forEach((c) => {
      if (!c.isArchived) {
        const liveRateRub = getCryptoRate(c.ticker, 'rub', null);
        totalCryptoAmount += liveRateRub ? c.quantity * liveRateRub : (c.currentValue ?? c.amount);
      }
    });`
);

fs.writeFileSync('src/components/dashboard/BentoDashboard.tsx', code);
console.log('Done Bento!');
