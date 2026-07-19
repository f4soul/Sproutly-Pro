const fs = require('fs');
let code = fs.readFileSync('src/components/assets/CryptoList.tsx', 'utf8');

// Add imports
code = code.replace(
  /import \{ PrivacyBlur \} from "\.\.\/ui\/PrivacyBlur";\n/,
  `import { PrivacyBlur } from "../ui/PrivacyBlur";\nimport { getCryptoRates, getCryptoRate, CryptoRates } from "../../services/crypto";\n`
);

// Add state and effect
code = code.replace(
  /const \[deletingAsset, setDeletingAsset\] = useState<CryptoAsset \| undefined>\(\);\n/,
  `const [deletingAsset, setDeletingAsset] = useState<CryptoAsset | undefined>();\n  const [rates, setRates] = useState<CryptoRates | null>(null);\n\n  React.useEffect(() => {\n    getCryptoRates().then(setRates);\n  }, []);\n`
);

// Modify stats calculation
code = code.replace(
  /const stats = useMemo\(\(\) => \{\s*let totalContributed = 0;\s*let totalCurrent = 0;\s*activeAssets\.forEach\(asset => \{\s*totalContributed \+= asset\.amount;\s*totalCurrent \+= asset\.currentValue;\s*\}\);\s*const profit = totalCurrent - totalContributed;\s*const profitPercent = totalContributed > 0 \? \(profit \/ totalContributed\) \* 100 : 0;\s*return \{ totalContributed, totalCurrent, profit, profitPercent \};\s*\}, \[activeAssets\]\);/,
  `const stats = useMemo(() => {
    let totalContributed = 0;
    let totalCurrent = 0;

    activeAssets.forEach(asset => {
      const liveRateRub = getCryptoRate(asset.ticker, 'rub', rates);
      const currentRub = liveRateRub ? asset.quantity * liveRateRub : (asset.currentValue ?? asset.amount);
      
      totalContributed += asset.amount;
      totalCurrent += currentRub;
    });

    const profit = totalCurrent - totalContributed;
    const profitPercent = totalContributed > 0 ? (profit / totalContributed) * 100 : 0;

    return { totalContributed, totalCurrent, profit, profitPercent };
  }, [activeAssets, rates]);`
);

// Modify asset mapping inside render
code = code.replace(
  /\{activeAssets\.map\(\(asset\) => \{\s*const contributedRub = asset\.amount;\s*const currentRub = asset\.currentValue;\s*let profitValue = currentRub - contributedRub;\s*let profitPercent = contributedRub > 0 \? \(profitValue \/ contributedRub\) \* 100 : 0;\s*let isPositive = profitPercent >= 0;\s*return \(\s*<div/g,
  `{activeAssets.map((asset) => {
          const contributedRub = asset.amount;
          const liveRateRub = getCryptoRate(asset.ticker, 'rub', rates);
          const currentRub = liveRateRub ? asset.quantity * liveRateRub : (asset.currentValue ?? asset.amount);
          const hasDynamics = Boolean(liveRateRub);
          
          let profitValue = currentRub - contributedRub;
          let profitPercent = hasDynamics && contributedRub > 0 ? (profitValue / contributedRub) * 100 : 0;
          let isPositive = profitPercent >= 0;

          return (
            <div`
);

// Modify the profit pill logic inside map
// The previous code has:
// <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5 pt-1">
//   <span className={cn(
//     "text-[9px] font-black tracking-tight px-2 py-0.5 rounded-lg shadow-sm font-mono border",
//     isPositive 
//       ? "text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" 
//       : "text-rose-500 bg-rose-500/10 border-rose-500/20"
//   )}>
//     {isPositive ? "+" : ""}{profitPercent.toFixed(2)}%
//   </span>
// </div>

const pillRegex = /(<div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1\.5 pt-1">\s*<span className=\{cn\([\s\S]*?\)\}>\s*\{isPositive \? "\+" : ""\}\{profitPercent\.toFixed\(2\)\}%[\s\S]*?<\/span>\s*<\/div>)/;

// Let's replace the whole top-right div
code = code.replace(pillRegex, `{hasDynamics && profitPercent !== 0 && (
              <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5 pt-1">
                <span className={cn(
                  "text-[9px] font-black tracking-tight px-2 py-0.5 rounded-lg shadow-sm font-mono border",
                  isPositive 
                    ? "text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                    : "text-rose-500 bg-rose-500/10 border-rose-500/20"
                )}>
                  {isPositive ? "+" : ""}{profitPercent.toFixed(2)}%
                </span>
              </div>
            )}`);

// Also update the value displayed in the asset card
// <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight px-0.5 font-mono">
//   <PrivacyBlur isPrivate={isPrivate}>
//     {formatCurrency(asset.currentValue)}
//   </PrivacyBlur>
// </div>
code = code.replace(/\{formatCurrency\(asset\.currentValue\)\}/g, '{formatCurrency(currentRub)}');


fs.writeFileSync('src/components/assets/CryptoList.tsx', code);
console.log('Done CryptoList!');
