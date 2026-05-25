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
  isSimulated?: boolean;
}



export const YearSummary = ({
  yearlyTotals,
  netDiff,
  grossDiff,
  prevYear,
  handleCopy,
  onShowTaxInfo,
  isPrivate = false,
  isSimulated = false
}: YearSummaryProps) => {
  const formatVal = (val: number) => isPrivate ? '••••••' : <AnimatedCurrency value={val} />;

  return (
    <div 
      className={cn(
        "grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-full transition-colors duration-500",
        isSimulated ? "p-1.5 sm:p-2 bg-primary-500/5 border border-primary-500/20 shadow-[0_0_40px_rgba(var(--rgb-primary),0.1)] rounded-[1.25rem] sm:rounded-[1.5rem]" : ""
      )}
    >
      {/* Net (Hero) */}
      <div className={cn(
        "p-3 sm:p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group min-h-[100px] sm:min-h-[110px] md:h-[100px] transition-all duration-500",
        isSimulated 
          ? "bg-gradient-to-br from-primary-600 to-primary-800 shadow-[0_8px_30px_rgb(var(--rgb-primary),0.25)] text-white" 
          : "bg-gradient-to-br from-primary-500 to-primary-700 shadow-[0_8px_30px_rgb(var(--rgb-primary),0.12)] text-white"
      )}>
        <div className="absolute -bottom-2 -right-2 text-white opacity-10 transition-all duration-500 ease-out group-hover:scale-110 pointer-events-none">
          <Calculator className="w-20 h-20" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-2">
          <p className="text-[9px] font-bold text-primary-100 uppercase tracking-widest mb-0.5 truncate flex-shrink-0">Финальный Net</p>
          {isSimulated && (
            <span className="px-1.5 py-0.5 bg-white/20 rounded backdrop-blur-sm text-[8px] font-black tracking-widest text-white uppercase animate-pulse flex-shrink-0">
              Simulation
            </span>
          )}
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
            <div className="mt-0.5 text-[8px] sm:text-[9px] font-medium text-primary-100/80 truncate">
              {netDiff >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(netDiff))} к {prevYear}
            </div>
          )}
        </div>
      </div>

      {/* Gross */}
      <div className={cn(
        "p-3 sm:p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group transition-all min-h-[100px] sm:min-h-[110px] md:h-[100px]",
        isSimulated 
          ? "bg-white dark:bg-slate-950 border border-primary-500/30 shadow-[0_4px_20px_rgba(var(--rgb-primary),0.08)]" 
          : "bg-white dark:bg-slate-950/50 shadow-sm border border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700"
      )}>
        <div className="absolute -bottom-2 -right-2 text-black/5 dark:text-white/5 transition-all duration-500 pointer-events-none group-hover:scale-110">
          <Coins className="w-20 h-20" />
        </div>
        <p className={cn("text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mb-0.5 relative z-10 truncate", isSimulated ? "text-primary-500" : "text-slate-400 dark:text-slate-500")}>Gross (грязными)</p>
        <div 
          onClick={() => !isPrivate && handleCopy(yearlyTotals.totalGross, 'gross')}
          className={cn("relative z-10 group/copy mt-auto min-w-0", !isPrivate && "cursor-pointer")}
          title={isPrivate ? "" : "Нажмите, чтобы скопировать"}
        >
          <h3 className="text-xl sm:text-lg md:text-sm lg:text-2xl xl:text-3xl font-bold text-slate-950 dark:text-white font-mono tracking-tighter transition-opacity group-hover/copy:opacity-70 truncate">
            {formatVal(yearlyTotals.totalGross)}
          </h3>
          {grossDiff !== null && !isPrivate && !isSimulated && (
             <div className={cn("mt-0.5 text-[8px] sm:text-[9px] font-medium truncate", grossDiff >= 0 ? "text-primary-500" : "text-rose-500")}>
               {grossDiff >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(grossDiff))}
             </div>
          )}
        </div>
      </div>

      {/* Tax */}
      <div className={cn(
        "p-3 sm:p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group transition-all min-h-[100px] sm:min-h-[110px] md:h-[100px]",
        isSimulated 
          ? "bg-white dark:bg-slate-950 border border-primary-500/30 shadow-[0_4px_20px_rgba(var(--rgb-primary),0.08)]" 
          : "bg-white dark:bg-slate-950/50 shadow-sm border border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700"
      )}>
        {onShowTaxInfo && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowTaxInfo();
            }}
            className="absolute top-2 right-2 z-20 flex items-center justify-center p-1.5 rounded-lg transition-all duration-300 hover:bg-rose-500/10 group/info focus:outline-none"
            title="Справочник налоговых ставок"
          >
            <Info 
              size={12} 
              className="text-rose-500/50 group-hover/info:text-rose-500 transition-colors" 
            />
          </button>
        )}
        <div className="absolute -bottom-2 -right-2 text-rose-500 opacity-10 transition-all duration-500 pointer-events-none group-hover:scale-110">
          <ReceiptRussianRuble className="w-20 h-20" />
        </div>
        <p className={cn("text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mb-0.5 relative z-10 truncate", isSimulated ? "text-primary-500" : "text-slate-400 dark:text-slate-500")}>НДФЛ</p>
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
          <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
            <span className="text-[8px] sm:text-[9px] font-bold text-rose-600 dark:text-rose-400 opacity-80 truncate">
              {yearlyTotals.effectiveRate.toFixed(1)}% ставка
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
