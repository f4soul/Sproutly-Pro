const fs = require('fs');
let code = fs.readFileSync('src/data/changelog.ts', 'utf8');

// 1. Remove "Автоматический курс криптовалют: ..." from 1.7.2 features
code = code.replace(
  /"Автоматический курс криптовалют: Интегрированы Bybit и CoinGecko API для автоматического получения актуальных котировок при добавлении или обновлении криптоактивов \(BTC, ETH, TON, SOL, NOT, USDT\)\.",?\n?\s*/,
  ''
);

// 2. Remove "Динамическая оценка криптоактивов: ..." from 1.7.2 improvements
code = code.replace(
  /"Динамическая оценка криптоактивов: Текущая стоимость криптовалюты теперь пересчитывается автоматически в реальном времени прямо в списке активов \(по аналогии с иностранной валютой\), а форма добавления стала проще и работает полностью офлайн\.",?\n?\s*/,
  ''
);

// 3. Remove commented fixes from 1.7.2
code = code.replace(
  /\s*\/\/\s*"Возвращен маркер-точка.*?\n/g,
  '\n'
);
code = code.replace(
  /\s*\/\/\s*"Исправлен баг, из-за которого переключение видимости.*?\n/g,
  '\n'
);
code = code.replace(
  /\s*\/\/\s*"Исправлена логика каскадной загрузки курсов.*?\n/g,
  '\n'
);
code = code.replace(
  /\s*\/\/\s*"Добавлено явное отображение ошибки.*?\n/g,
  '\n'
);
code = code.replace(
  /\s*\/\/\s*"CoinGecko API key переведен.*?\n/g,
  '\n'
);

// Remove any double commas or trailing commas left in arrays if they occur
// (a bit hard with regex, let's just make sure we didn't break JSON/JS)
// It's a JS object so trailing commas are fine.

// 4. Add 1.7.3 at the beginning of the array
const newVersion = `  {
    version: "1.7.3",
    date: "2026-07-19",
    title: "Раздел Крипто: живая оценка портфеля",
    features: [
      "Автоматический live-курс криптовалют: интегрированы Bybit и CoinGecko API для получения актуальной стоимости портфеля (BTC, ETH, TON, SOL, NOT, USDT) прямо в списке активов, с пилюлей отображения прибыли/убытка относительно суммы покупки."
    ],
    improvements: [
      "Форма добавления криптоактива упрощена и теперь работает полностью офлайн — курс больше не запрашивается в момент ввода данных, а подтягивается отдельно при отображении списка."
    ],
    fixes: []
  },
`;

code = code.replace(
  /export const changelog: ReleaseNote\[\] = \[\n/,
  `export const changelog: ReleaseNote[] = [\n${newVersion}`
);

fs.writeFileSync('src/data/changelog.ts', code);
console.log('Changelog updated');
