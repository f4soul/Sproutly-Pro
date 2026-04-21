import React from 'react';
import { motion } from 'motion/react';
import { YearlyTotals } from '../types/index';
import { formatCurrency } from '../lib/taxCalculator';

interface ChartsSectionProps {
  yearlyTotals: YearlyTotals;
}

interface ChartsSectionProps {
  yearlyTotals: YearlyTotals;
  isPrivate?: boolean;
}

export const ChartsSection = ({ yearlyTotals, isPrivate = false }: ChartsSectionProps) => {
  const formatVal = (val: number) => isPrivate ? '••••••' : formatCurrency(val);

  return (
    <>
      {/* Tax Details */}
      <div className="col-span-2 md:col-span-2 xl:col-span-2 apple-card p-6 flex flex-col">
        <p className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest mb-4">Детализация НДФЛ</p>
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[160px] pr-2 custom-scrollbar">
          {yearlyTotals.brackets.map((b, i) => (
            <div key={i} className="flex items-center justify-between border-b border-light-border dark:border-dark-border last:border-0 pb-2 last:pb-0">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-light-text-primary dark:text-dark-text-primary">{b.label}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-[#F5F5F7] dark:bg-white/5 rounded-md text-light-text-secondary dark:text-dark-text-secondary">{b.rate}%</span>
                </div>
                <span className="font-mono opacity-50 text-[10px] text-light-text-secondary dark:text-dark-text-secondary">База: {formatVal(b.amount)}</span>
              </div>
              <span className="font-mono font-medium text-sm text-light-text-primary dark:text-dark-text-primary">{formatVal(b.tax)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="col-span-2 md:col-span-2 xl:col-span-2 apple-card p-6 flex flex-col">
        <h3 className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest mb-6 text-center">Структура дохода</h3>
        
        <div className="space-y-6">
          {/* Stacked Bar */}
          <div className="h-4 w-full bg-[#F5F5F7] dark:bg-white/5 rounded-full flex shadow-inner">
            {(() => {
              const total = yearlyTotals.totalGross;
              const netPercent = total > 0 ? (yearlyTotals.finalNet / total) * 100 : 0;
              const taxPercent = total > 0 ? (yearlyTotals.progressiveTax / total) * 100 : 0;
              
              return (
                <>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${netPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-indigo-500 relative group rounded-l-full"
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl whitespace-nowrap z-10 pointer-events-none transform group-hover:-translate-y-1">
                      На руки: {Math.round(netPercent)}%
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${taxPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-rose-500 relative group rounded-r-full"
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl whitespace-nowrap z-10 pointer-events-none transform group-hover:-translate-y-1">
                      Налог: {Math.round(taxPercent)}%
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                    </div>
                  </motion.div>
                </>
              );
            })()}
          </div>

          {/* Legend List */}
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">На руки</span>
              </div>
              <span className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary font-mono">{formatVal(yearlyTotals.finalNet)}</span>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Налог (НДФЛ)</span>
              </div>
              <span className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary font-mono">{formatVal(yearlyTotals.progressiveTax)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
