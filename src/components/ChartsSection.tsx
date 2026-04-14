import React from 'react';
import { motion } from 'motion/react';
import { YearlyTotals } from '../types/index';
import { formatCurrency } from '../lib/taxCalculator';

interface ChartsSectionProps {
  yearlyTotals: YearlyTotals;
}

export const ChartsSection = ({ yearlyTotals }: ChartsSectionProps) => {
  return (
    <>
      {/* Tax Details */}
      <div className="col-span-2 md:col-span-2 xl:col-span-2 bg-white dark:bg-slate-900/50 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 flex flex-col">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Детализация НДФЛ</p>
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[160px] pr-2 custom-scrollbar">
          {yearlyTotals.brackets.map((b, i) => (
            <div key={i} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 last:border-0 pb-2 last:pb-0">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{b.label}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400">{b.rate}%</span>
                </div>
                <span className="font-mono opacity-50 text-[10px] text-slate-500 dark:text-slate-400">База: {formatCurrency(b.amount)}</span>
              </div>
              <span className="font-mono font-medium text-sm text-slate-900 dark:text-slate-100">{formatCurrency(b.tax)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="col-span-2 md:col-span-2 xl:col-span-2 bg-white dark:bg-slate-900/50 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 flex flex-col">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 text-center">Структура дохода</h3>
        
        <div className="space-y-6">
          {/* Stacked Bar */}
          <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full flex shadow-inner">
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
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">На руки</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{formatCurrency(yearlyTotals.finalNet)}</span>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Налог (НДФЛ)</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{formatCurrency(yearlyTotals.progressiveTax)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
