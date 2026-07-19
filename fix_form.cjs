const fs = require('fs');
let code = fs.readFileSync('src/components/assets/CryptoForm.tsx', 'utf8');
code = code.replace(
  'import { Bitcoin, ChevronDown, X, Calculator, Calendar as CalendarIcon, RefreshCcw } from "lucide-react";',
  'import { Bitcoin, ChevronDown, X, Calendar as CalendarIcon } from "lucide-react";'
);
code = code.replace(
  /amount: 0,\s+comment: "",/g,
  'amount: 0,\n      comment: "",'
);
code = code.replace(
  /assetToEdit \? assetToEdit.amount.toString\(\) : "",\n  \);\n  \n  \n  const \[isPurchaseDateOpen/g,
  'assetToEdit ? assetToEdit.amount.toString() : "",\n  );\n  const [isPurchaseDateOpen'
);
fs.writeFileSync('src/components/assets/CryptoForm.tsx', code);
console.log('Fixed CryptoForm');
