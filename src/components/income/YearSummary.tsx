import React from 'react';
import { Calculator, Coins, ReceiptRussianRuble, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { YearlyTotals } from '../../types/index';
import { formatCurrency } from '../../lib/taxCalculator';
import { cn } from '../../lib/utils';

interface YearSummaryProps {
  yearlyTotals: YearlyTotals;
  netDiff: number | null;
  grossDiff: number | null;
  prevYear: number | null;
  handleCopy: (value: number, type: 'net' | 'gross' | 'tax') => void;
  onShowTaxInfo?: () => void;
  isPrivate?: boolean;
}

const DASHBOARD_CONTAINER_VARIANTS = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const DASHBOARD_ITEM_VARIANTS = {
  hidden: { opacity: 1, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
} as const;

export const YearSummary = ({
  yearlyTotals,
  netDiff,
  grossDiff,
  prevYear,
  handleCopy,
  onShowTaxInfo,
  isPrivate = false
}: YearSummaryProps) => {
  const formatVal = (val: number) => isPrivate ? '••••••' : <AnimatedCurrency value={val} />;

  return (
    <motion.div 
      variants={DASHBOARD_CONTAINER_VARIANTS}
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-full overflow-hidden"
    >
      {/* Net (Hero) */}
      <motion.div variants={DASHBOARD_ITEM_VARIANTS} className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-3 sm:p-4 rounded-2xl shadow-[0_8px_30px_rgb(99,102,241,0.12)] text-white flex flex-col justify-between relative overflow-hidden group min-h-[100px] sm:min-h-[110px] md:h-[100px]">
        <div className="absolute -bottom-2 -right-2 text-white opacity-10 transition-all duration-500 ease-out group-hover:scale-110 pointer-events-none">
          <Calculator className="w-20 h-20" />
        </div>
        <div className="relative z-10">
          <p className="text-[9px] font-bold text-indigo-100 uppercase tracking-widest mb-0.5 truncate">Финальный Net</p>
        </div>
        <div 
          onClick={() => !isPrivate && handleCopy(yearlyTotals.finalNet, 'net')}
          className={cn("relative z-10 group/copy flex flex-col mt-auto min-w-0", !isPrivate && "cursor-pointer")}
          title={isPrivate ? "" : "Нажмите, чтобы скопировать"}
        >
          <h3 className="text-xl sm:text-lg md:text-sm lg:text-2xl xl:text-3xl font-bold font-mono tracking-tighter flex items-center transition-opacity group-hover/copy:opacity-80 truncate">
            {formatVal(yearlyTotals.finalNet)}
          </h3>
          {netDiff !== null && !isPrivate && (
            <div className="mt-0.5 text-[8px] sm:text-[9px] font-medium text-indigo-100/80 truncate">
              {netDiff >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(netDiff))} к {prevYear}
            </div>
          )}
        </div>
      </motion.div>

      {/* Gross */}
      <motion.div variants={DASHBOARD_ITEM_VARIANTS} className="bg-white dark:bg-slate-900/50 p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-colors min-h-[100px] sm:min-h-[110px] md:h-[100px]">
        <div className="absolute -bottom-2 -right-2 text-black/5 dark:text-white/5 transition-all duration-500 pointer-events-none group-hover:scale-110">
          <Coins className="w-20 h-20" />
        </div>
        <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5 relative z-10 truncate">Gross (грязными)</p>
        <div 
          onClick={() => !isPrivate && handleCopy(yearlyTotals.totalGross, 'gross')}
          className={cn("relative z-10 group/copy mt-auto min-w-0", !isPrivate && "cursor-pointer")}
          title={isPrivate ? "" : "Нажмите, чтобы скопировать"}
        >
          <h3 className="text-xl sm:text-lg md:text-sm lg:text-2xl xl:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tighter transition-opacity group-hover/copy:opacity-70 truncate">
            {formatVal(yearlyTotals.totalGross)}
          </h3>
          {grossDiff !== null && !isPrivate && (
             <div className={cn("mt-0.5 text-[8px] sm:text-[9px] font-medium truncate", grossDiff >= 0 ? "text-emerald-500" : "text-rose-500")}>
               {grossDiff >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(grossDiff))}
             </div>
          )}
        </div>
      </motion.div>

      {/* Tax */}
      <motion.div variants={DASHBOARD_ITEM_VARIANTS} className="bg-white dark:bg-slate-900/50 p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-colors min-h-[100px] sm:min-h-[110px] md:h-[100px]">
        <div className="absolute -bottom-2 -right-2 text-rose-500 opacity-10 transition-all duration-500 pointer-events-none group-hover:scale-110">
          <ReceiptRussianRuble className="w-20 h-20" />
        </div>
        <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5 relative z-10 truncate">НДФЛ</p>
        <div 
          onClick={() => !isPrivate && handleCopy(yearlyTotals.progressiveTax, 'tax')}
          className={cn("relative z-10 group/copy mt-auto min-w-0", !isPrivate && "cursor-pointer")}
          title={isPrivate ? "" : "Нажмите, чтобы скопировать"}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-xl sm:text-lg md:text-sm lg:text-2xl xl:text-3xl font-bold text-rose-500 dark:text-rose-400 font-mono tracking-tighter transition-opacity group-hover/copy:opacity-70 truncate">
              {formatVal(yearlyTotals.progressiveTax)}
            </h3>
          </div>
          <div className="mt-0.5 text-[8px] sm:text-[9px] font-bold text-rose-600 dark:text-rose-400 opacity-80 truncate">
            {yearlyTotals.effectiveRate.toFixed(1)}% ставка
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
