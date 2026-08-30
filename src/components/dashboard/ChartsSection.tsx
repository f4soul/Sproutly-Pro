import React from 'react';
import { motion } from 'motion/react';
import { YearlyTotals } from '../../types/index';
import { formatCurrency } from '../../lib/taxCalculator';
import { PrivacyBlur } from '../ui/PrivacyBlur';

interface ChartsSectionProps {
  yearlyTotals: YearlyTotals;
  isPrivate?: boolean;
}



export const ChartsSection = ({ yearlyTotals, isPrivate = false }: ChartsSectionProps) => {
  const formatVal = (val: number) => <span className="tabular-nums"><PrivacyBlur isPrivate={isPrivate}>{formatCurrency(val)}</PrivacyBlur></span>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
      {/* Tax Details */}
      <div className="apple-card p-6 flex flex-col h-full">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 text-center">Детализация НДФЛ</h3>
        <div className="flex flex-col overflow-y-auto flex-1 custom-scrollbar min-h-0 justify-end">
          {yearlyTotals.brackets.map((b, i) => (
            <div key={i} className="flex items-center justify-between py-4 border-b border-slate-200 dark:border-slate-800 first:pt-0 last:pb-0 last:border-0">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-950 dark:text-white">{b.label}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800/50 rounded-md text-slate-500 dark:text-slate-400">{b.rate}%</span>
                </div>
                <span className="opacity-50 text-[10px] text-slate-500 dark:text-slate-400">База: {formatVal(b.amount)}</span>
              </div>
              <span className="font-medium text-sm text-slate-950 dark:text-white">{formatVal(b.tax)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="apple-card p-6 flex flex-col h-full">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 text-center">Структура дохода</h3>
        
        <div className="space-y-6 flex-1 flex flex-col justify-center">
          {/* Stacked Bar */}
          <div className="h-2 w-full bg-slate-50 dark:bg-slate-800/50 rounded-full flex shadow-inner overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${yearlyTotals.totalGross > 0 ? (yearlyTotals.finalNet / yearlyTotals.totalGross) * 100 : 0}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-primary-500 relative"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${yearlyTotals.totalGross > 0 ? (yearlyTotals.progressiveTax / yearlyTotals.totalGross) * 100 : 0}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className="h-full bg-rose-500 relative"
            />
          </div>

          {/* Legend List */}
          <div className="grid grid-cols-1 gap-4 mt-auto">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">На руки</span>
              </div>
              <span className="text-sm font-bold text-slate-950 dark:text-white tabular-nums">{formatVal(yearlyTotals.finalNet)}</span>
            </div>
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Налог (НДФЛ)</span>
              </div>
              <span className="text-sm font-bold text-slate-950 dark:text-white tabular-nums">{formatVal(yearlyTotals.progressiveTax)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
