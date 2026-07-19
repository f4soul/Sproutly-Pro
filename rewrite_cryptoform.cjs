const fs = require('fs');
let code = fs.readFileSync('src/components/assets/CryptoForm.tsx', 'utf8');

// Remove imports: import { getCryptoRates, CryptoRates } from "../../services/crypto";
code = code.replace(/import\s*\{\s*getCryptoRates,\s*CryptoRates\s*\}\s*from\s*"..\/..\/services\/crypto";\n?/, '');

// Remove rateStatus and cryptoRates state
code = code.replace(/const \[rateStatus,\s*setRateStatus\]\s*=\s*useState<[^>]+>\('[^']+'\);\n?/, '');
code = code.replace(/const \[cryptoRates,\s*setCryptoRates\]\s*=\s*useState<[^>]+>\([^)]+\);\n?/, '');

// Remove useEffect for getCryptoRates
code = code.replace(/useEffect\(\(\)\s*=>\s*\{\s*setRateStatus\('loading'\);\s*getCryptoRates\(\)[\s\S]*?\}\s*,\s*\[\]\);\n?/, '');

// Remove currentValueStr state
code = code.replace(/const\s*\[currentValueStr,\s*setCurrentValueStr\]\s*=\s*useState<string>\(\s*assetToEdit\s*\?\s*assetToEdit\.currentValue(?:\??\.toString\(\))?\s*:\s*"",?\s*\);\n?/, '');
code = code.replace(/const\s*\[currentValueStr,\s*setCurrentValueStr\]\s*=\s*useState<string>\(\s*assetToEdit\s*&&\s*assetToEdit\.currentValue\s*\?\s*assetToEdit\.currentValue\.toString\(\)\s*:\s*"",?\s*\);\n?/, '');
// Might be a multi-line useState for currentValueStr, let's catch it:
code = code.replace(/const \[currentValueStr,\s*setCurrentValueStr\]\s*=\s*useState<string>\([\s\S]*?\);\n/, '');

// Remove currentRate and handleApplyAutoCourse
code = code.replace(/const currentRate = [\s\S]*?;\n\n\s*const handleApplyAutoCourse = \(\) => \{[\s\S]*?\}\s*;\n/g, '');

// Clean up AnimatePresence for market rate
code = code.replace(/<AnimatePresence>[\s\S]*?<\/AnimatePresence>/, '');

// In handleSubmit, remove checking currentValue and writing it to newAsset
code = code.replace(/if \(!formData\.currentValue && formData\.currentValue !== 0\) \{\s*alert\("Введите текущую стоимость"\);\s*return;\s*\}/, '');
code = code.replace(/currentValue:\s*formData\.currentValue\s*as\s*number,/, '');

// Remove Текущая стоимость label and input from grid
// It's in a grid with Себестоимость покупки
const regexGrid = /(<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">\s*<div className="space-y-2">[\s\S]*?<\/div>)\s*<div className="space-y-2">[\s\S]*?Вводится вручную или по кнопке ниже<\/p>\s*<\/div>\s*<\/div>/;
code = code.replace(regexGrid, '$1\n                </div>');

// Write back
fs.writeFileSync('src/components/assets/CryptoForm.tsx', code);
console.log('Done!');
