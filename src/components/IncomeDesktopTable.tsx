import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { YearData, YearlyTotals } from '../types';
import { QUARTERS } from '../lib/constants';
import { BonusConfigControls } from './BonusConfigControls';
import { QuarterRow } from './QuarterRow';
import { AnnualBonusSection } from './AnnualBonusSection';

interface IncomeDesktopTableProps {
  yearKey: number;
  activeYearData: YearData;
  calculatedMonths: Array<any>;
  yearlyTotals: YearlyTotals;
  onBonusBaseChange: (value: number) => void;
  onQuarterCoefChange: (quarterIndex: number, value: number) => void;
  onAnnualCoefChange: (value: number) => void;
  handleQuarterChange: (qIndex: number, field: 'bonusCoef' | 'bonusAmount', value: number) => void;
  handleMonthChange: (monthIndex: number, field: 'normDays' | 'factDays' | 'salary', value: number) => void;
  handleAnnualBonusChange: (field: 'annualBonusCoef' | 'annualBonusAmount' | 'extraBonusAmount' | 'bonusBase' | 'baseSalary' | 'iisContribution' | 'deductions', value: any) => void;
}

export function IncomeDesktopTable({
  yearKey,
  activeYearData,
  calculatedMonths,
  yearlyTotals,
  onBonusBaseChange,
  onQuarterCoefChange,
  onAnnualCoefChange,
  handleQuarterChange,
  handleMonthChange,
  handleAnnualBonusChange
}: IncomeDesktopTableProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={yearKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="hidden md:block bg-white dark:bg-slate-900/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 p-2"
      >
        <div className="overflow-x-auto custom-scrollbar relative rounded-2xl">
          <table className="w-full text-sm text-left border-separate border-spacing-0 min-w-full">
            <thead className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-20">
              <tr>
                <th colSpan={6} className="px-2 py-1.5 md:px-3 md:py-2 shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b]">
                  <BonusConfigControls
                    activeYearData={activeYearData}
                    onBonusBaseChange={onBonusBaseChange}
                    onQuarterCoefChange={onQuarterCoefChange}
                    onAnnualCoefChange={onAnnualCoefChange}
                  />
                </th>
              </tr>
              <tr>
                <th className="px-1 md:px-2 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-left shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap w-auto min-w-[80px] lg:min-w-[100px]">Месяц</th>
                <th className="px-1 md:px-2 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap w-auto min-w-[90px] lg:min-w-[120px]" title="Фактически отработано / Норма">Дни (Факт/Норма)</th>
                <th className="px-1 md:px-1.5 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap w-auto min-w-[80px] lg:min-w-[110px]">Оклад (₽)</th>
                <th className="px-1 md:px-1.5 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap w-auto min-w-[80px] lg:min-w-[110px]">Премия (₽)</th>
                <th className="px-1 md:px-2 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-indigo-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap w-auto min-w-[90px] lg:min-w-[120px]">Gross (₽)</th>
                <th className="px-1 md:px-2 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-emerald-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap w-auto min-w-[90px] lg:min-w-[120px]">Net 13% (₽)</th>
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
      </motion.div>
    </AnimatePresence>
  );
}
