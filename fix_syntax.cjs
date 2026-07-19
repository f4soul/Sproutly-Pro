const fs = require('fs');
let code = fs.readFileSync('src/data/changelog.ts', 'utf8');

// Remove trailing commas before closing brackets
code = code.replace(/,\s+\]/g, '\n    ]');
fs.writeFileSync('src/data/changelog.ts', code);
