import React from 'react';
import { Calculator, Coins, ReceiptRussianRuble, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { YearlyTotals } from '../../types/index';
import { formatCurrency } from '../../lib/taxCalculator';
import { cn } from '../../lib/utils';
import { PrivacyBlur } from '../ui/PrivacyBlur';

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
  const formatVal = (val: number) => <PrivacyBlur isPrivate={isPrivate}><AnimatedCurrency value={val} /></PrivacyBlur>;

  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2 w-full max-w-full"
    >
      {/* Net (Hero) */}
      <div className={cn(
        "p-3 sm:p-4 rounded-card flex flex-col justify-between relative overflow-hidden group min-h-[100px] sm:min-h-[110px] md:h-[100px] transition-all duration-500 border border-transparent shadow-card dark:shadow-card-dark",
        isSimulated 
          ? "bg-gradient-to-br from-primary-600 to-primary-800 text-white" 
          : "bg-gradient-to-br from-primary-500 to-primary-700 text-white"
      )}>
        <div className="absolute -bottom-2 -right-2 text-white opacity-10 transition-all duration-500 ease-out group-hover:scale-110 pointer-events-none">
          <Calculator className="w-20 h-20" />
        </div>
        <div className="relative z-10 flex items-start justify-between gap-1 w-full flex-nowrap">
          <p className="text-[9px] font-bold text-primary-100 uppercase tracking-widest mb-0.5 truncate flex-1 min-w-0 mt-0.5 mr-1">Финальный Net</p>
          {isSimulated && (
            <span className="px-1.5 py-0.5 bg-white/20 rounded backdrop-blur-sm text-[8px] font-black tracking-widest text-white uppercase animate-pulse shrink-0">
              Simulation
            </span>
          )}
        </div>
        <div 
          onClick={() => !isPrivate && handleCopy(yearlyTotals.finalNet, 'net')}
          role={!isPrivate ? "button" : undefined}
          tabIndex={!isPrivate ? 0 : undefined}
          onKeyDown={(e) => {
            if (!isPrivate && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleCopy(yearlyTotals.finalNet, 'net');
            }
          }}
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
        "p-3 sm:p-4 rounded-card flex flex-col justify-between relative overflow-hidden group transition-all min-h-[100px] sm:min-h-[110px] md:h-[100px] border",
        isSimulated 
          ? "bg-primary-50/60 dark:bg-[#0f121b] border-primary-500/35 dark:border-primary-500/40 shadow-card dark:shadow-card-dark" 
          : "bg-white dark:bg-slate-950/50 border-slate-200/60 dark:border-slate-800/60 shadow-card dark:shadow-card-dark hover:border-slate-300 dark:hover:border-slate-700"
      )}>
        <div className="absolute -bottom-2 -right-2 text-black/5 dark:text-white/5 transition-all duration-500 pointer-events-none group-hover:scale-110">
          <Coins className="w-20 h-20" />
        </div>
        <p className={cn("text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mb-0.5 relative z-10 truncate", isSimulated ? "text-primary-500 dark:text-primary-400 font-extrabold" : "text-slate-400 dark:text-slate-500")}>Gross (грязными)</p>
        <div 
          onClick={() => !isPrivate && handleCopy(yearlyTotals.totalGross, 'gross')}
          role={!isPrivate ? "button" : undefined}
          tabIndex={!isPrivate ? 0 : undefined}
          onKeyDown={(e) => {
            if (!isPrivate && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleCopy(yearlyTotals.totalGross, 'gross');
            }
          }}
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
        "p-3 sm:p-4 rounded-card flex flex-col justify-between relative overflow-hidden group transition-all min-h-[100px] sm:min-h-[110px] md:h-[100px] border",
        isSimulated 
          ? "bg-primary-50/60 dark:bg-[#0f121b] border-primary-500/35 dark:border-primary-500/40 shadow-card dark:shadow-card-dark" 
          : "bg-white dark:bg-slate-950/50 border-slate-200/60 dark:border-slate-800/60 shadow-card dark:shadow-card-dark hover:border-slate-300 dark:hover:border-slate-700"
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
        <p className={cn("text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mb-0.5 relative z-10 truncate", isSimulated ? "text-primary-500 dark:text-primary-400 font-extrabold" : "text-slate-400 dark:text-slate-500")}>НДФЛ</p>
        <div 
          onClick={() => !isPrivate && handleCopy(yearlyTotals.progressiveTax, 'tax')}
          role={!isPrivate ? "button" : undefined}
          tabIndex={!isPrivate ? 0 : undefined}
          onKeyDown={(e) => {
            if (!isPrivate && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleCopy(yearlyTotals.progressiveTax, 'tax');
            }
          }}
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
