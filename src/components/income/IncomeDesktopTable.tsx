import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';
import { YearData, YearlyTotals, CalculatedMonth } from '../../types';
import { QUARTERS } from '../../lib/constants';
import { BonusConfigControls } from './BonusConfigControls';
import { QuarterRow } from './QuarterRow';
import { AnnualBonusSection } from './AnnualBonusSection';

interface IncomeDesktopTableProps {
  yearKey: number;
  activeYearData: YearData;
  calculatedMonths: CalculatedMonth[];
  yearlyTotals: YearlyTotals;
  onBonusBaseChange: (value: number) => void;
  onQuarterCoefChange: (quarterIndex: number, value: number) => void;
  onAnnualCoefChange: (value: number) => void;
  onApplyBaseToAll?: () => void;
  handleQuarterChange: (qIndex: number, field: 'bonusCoef' | 'bonusAmount', value: number) => void;
  handleMonthChange: (monthIndex: number, field: 'normDays' | 'factDays' | 'salary', value: number) => void;
  handleAnnualBonusChange: (field: any, value: any) => void;
  onShowTaxInfo: () => void;
  isPrivate?: boolean;
}

export function IncomeDesktopTable({
  yearKey,
  activeYearData,
  calculatedMonths,
  yearlyTotals,
  onBonusBaseChange,
  onQuarterCoefChange,
  onAnnualCoefChange,
  onApplyBaseToAll,
  handleQuarterChange,
  handleMonthChange,
  handleAnnualBonusChange,
  onShowTaxInfo,
  isPrivate = false
}: IncomeDesktopTableProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={yearKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="hidden lg:block relative isolate"
      >
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 p-1 md:p-2 relative z-10">
          <div className="overflow-x-auto custom-scrollbar relative rounded-2xl overflow-visible no-scrollbar">
          <table className="w-full text-sm text-left border-separate border-spacing-0 min-w-full">
            <thead className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-20">
              <tr>
                <th colSpan={6} className="px-2 py-2 shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] relative">
                  <div className="w-full">
                    <BonusConfigControls
                      compact
                      activeYearData={activeYearData}
                      onBonusBaseChange={onBonusBaseChange}
                      onQuarterCoefChange={onQuarterCoefChange}
                      onAnnualCoefChange={onAnnualCoefChange}
                      onApplyBaseToAll={onApplyBaseToAll}
                    />
                  </div>
                </th>
              </tr>
              <tr>
                <th className="px-1 md:px-2 py-1.5 text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-left shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap">Месяц</th>
                <th className="px-1 md:px-2 py-1.5 text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap" title="Фактически отработано / Норма">Дни (ф/н)</th>
                <th className="px-1 md:px-2 py-1.5 text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap">Оклад (₽)</th>
                <th className="px-1 md:px-2 py-1.5 text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap">Премия (₽)</th>
                <th className="px-1 md:px-2 py-1.5 text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-indigo-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap min-w-[110px] lg:min-w-[130px]">Gross (₽)</th>
                <th className="px-1 md:px-2 py-1.5 text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap group/tax-header relative min-w-[110px] lg:min-w-[130px]">
                  <button 
                    onClick={onShowTaxInfo}
                    className="inline-flex items-center gap-1.5 ml-auto text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-emerald-500 font-semibold transition-all hover:opacity-80 active:scale-95 focus:outline-none"
                  >
                    <span>{yearKey >= 2025 ? 'Net (₽)' : 'Net 13% (₽)'}</span>
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-full scale-0 group-hover/tax-header:scale-150 transition-transform duration-500" />
                      <Info size={10} className="text-emerald-500/40 group-hover/tax-header:text-emerald-500 group-hover/tax-header:rotate-[15deg] transition-all duration-300" />
                    </div>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {QUARTERS.map((q, qIndex) => (
                <QuarterRow
                  key={qIndex}
                  q={q}
                  qIndex={qIndex}
                  activeYearData={activeYearData}
                  calculatedMonths={calculatedMonths}
                  handleQuarterChange={handleQuarterChange}
                  handleMonthChange={handleMonthChange}
                />
              ))}

              <AnnualBonusSection
                activeYearData={activeYearData}
                handleAnnualBonusChange={handleAnnualBonusChange}
                calculatedMonths={calculatedMonths}
                yearlyTotals={yearlyTotals}
              />
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  </AnimatePresence>
);
}
