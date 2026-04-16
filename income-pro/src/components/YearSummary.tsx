import React from 'react';
import { Calculator, Coins, ReceiptRussianRuble } from 'lucide-react';
import { AnimatedCurrency } from './AnimatedCurrency';
import { YearlyTotals } from '../types/index';
import { formatCurrency } from '../lib/taxCalculator';
import { cn } from '../lib/utils';

interface YearSummaryProps {
  yearlyTotals: YearlyTotals;
  netDiff: number | null;
  grossDiff: number | null;
  prevYear: number | null;
  handleCopy: (value: number, type: 'net' | 'gross' | 'tax') => void;
}

export const YearSummary = ({
  yearlyTotals,
  netDiff,
  grossDiff,
  prevYear,
  handleCopy
}: YearSummaryProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-2 gap-4">
      {/* Net (Hero) */}
      <div className="col-span-2 md:col-span-2 xl:col-span-2 bg-gradient-to-br from-indigo-500 to-indigo-700 p-4 sm:p-6 rounded-3xl shadow-[0_8px_30px_rgb(99,102,241,0.2)] text-white flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute bottom-4 right-4 opacity-10 transition-all duration-500 ease-out group-hover:scale-125 group-hover:-rotate-12 group-hover:-translate-y-2 group-hover:-translate-x-2 pointer-events-none">
          <Calculator className="w-20 h-20 sm:w-[100px] sm:h-[100px]" />
        </div>
        <div className="flex justify-between items-start relative z-10">
          <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">Финальный Net</p>
        </div>
        <div 
          onClick={() => handleCopy(yearlyTotals.finalNet, 'net')}
          className="relative z-10 cursor-pointer group/copy w-full mt-1"
          title="Нажмите, чтобы скопировать"
        >
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono tracking-tighter flex items-center gap-3 transition-opacity group-hover/copy:opacity-80">
            <AnimatedCurrency value={yearlyTotals.finalNet} />
          </h3>
        </div>
        {netDiff !== null && (
          <div className="mt-2 text-xs font-medium text-indigo-200 flex items-center gap-1 relative z-10">
            {netDiff >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(netDiff))} к {prevYear} г.
          </div>
        )}
      </div>

      {/* Gross */}
      <div className="col-span-1 md:col-span-1 xl:col-span-1 bg-white dark:bg-slate-900/50 p-4 sm:p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <div className="absolute bottom-4 right-4 text-slate-400 dark:text-slate-500 opacity-20 dark:opacity-10 transition-all duration-500 ease-out group-hover:scale-125 group-hover:rotate-12 group-hover:-translate-y-1 group-hover:-translate-x-1 pointer-events-none">
          <Coins className="w-16 h-16 sm:w-20 sm:h-20" />
        </div>
        <div className="flex justify-between items-start relative z-10">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Gross</p>
        </div>
        <div 
          onClick={() => handleCopy(yearlyTotals.totalGross, 'gross')}
          className="relative z-10 cursor-pointer group/copy w-full mt-1"
          title="Нажмите, чтобы скопировать"
        >
          <h3 className="text-sm sm:text-base xl:text-lg font-bold text-slate-900 dark:text-white font-mono tracking-tighter flex items-center gap-2 transition-opacity group-hover/copy:opacity-70">
            <AnimatedCurrency value={yearlyTotals.totalGross} />
          </h3>
        </div>
        {grossDiff !== null && (
          <div className={cn("mt-2 text-[10px] font-medium flex items-center gap-1 relative z-10", grossDiff >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {grossDiff >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(grossDiff))}
          </div>
        )}
      </div>

      {/* Tax */}
      <div className="col-span-1 md:col-span-1 xl:col-span-1 bg-white dark:bg-slate-900/50 p-4 sm:p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <div className="absolute bottom-4 right-4 text-rose-500 opacity-20 dark:opacity-10 transition-all duration-500 ease-out group-hover:scale-125 group-hover:-rotate-12 group-hover:-translate-y-1 group-hover:-translate-x-1 pointer-events-none">
          <ReceiptRussianRuble className="w-16 h-16 sm:w-20 sm:h-20" />
        </div>
        <div className="flex justify-between items-start relative z-10">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">НДФЛ</p>
        </div>
        <div 
          onClick={() => handleCopy(yearlyTotals.progressiveTax, 'tax')}
          className="relative z-10 cursor-pointer group/copy w-full mt-1"
          title="Нажмите, чтобы скопировать"
        >
          <h3 className="text-sm sm:text-base xl:text-lg font-bold text-rose-500 dark:text-rose-400 font-mono tracking-tighter flex items-center gap-2 transition-opacity group-hover/copy:opacity-70">
            <AnimatedCurrency value={yearlyTotals.progressiveTax} />
          </h3>
        </div>
        <div className="mt-2 flex items-center justify-between relative z-10">
          <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-md text-[10px] font-bold">
            {yearlyTotals.effectiveRate.toFixed(1)}% эфф.
          </span>
        </div>
      </div>
    </div>
  );
};
