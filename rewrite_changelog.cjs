const fs = require('fs');
let code = fs.readFileSync('src/data/changelog.ts', 'utf8');

const newImprovement = '"Динамическая оценка криптоактивов: Текущая стоимость криптовалюты теперь пересчитывается автоматически в реальном времени прямо в списке активов (по аналогии с иностранной валютой), а форма добавления стала проще и работает полностью офлайн."';

// Insert it into the improvements array of the first item
code = code.replace(
  /improvements: \[\s*([\s\S]*?)\n\s*\],/,
  (match, p1) => {
    return `improvements: [\n      ${p1},\n      ${newImprovement}\n    ],`;
  }
);

fs.writeFileSync('src/data/changelog.ts', code);
console.log('Done Changelog!');
