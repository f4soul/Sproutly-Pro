import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';
import { YearData, YearlyTotals, CalculatedMonth } from '../../types';
import { QUARTERS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { QuarterRow } from './QuarterRow';
import { AnnualBonusSection } from './AnnualBonusSection';

interface IncomeDesktopTableProps {
  yearKey: number;
  activeYearData: YearData;
  calculatedMonths: CalculatedMonth[];
  yearlyTotals: YearlyTotals;
  handleQuarterChange: (qIndex: number, field: 'bonusCoef' | 'bonusAmount', value: number) => void;
  handleMonthChange: (monthIndex: number, field: 'normDays' | 'factDays' | 'salary', value: number) => void;
  onValueChange: (monthIndex: number, colId: string, value: number) => void;
  handleAnnualBonusChange: (field: any, value: any) => void;
  onShowTaxInfo: () => void;
  isPrivate?: boolean;
}

export function IncomeDesktopTable({
  yearKey,
  activeYearData,
  calculatedMonths,
  yearlyTotals,
  handleQuarterChange,
  handleMonthChange,
  onValueChange,
  handleAnnualBonusChange,
  onShowTaxInfo,
  isPrivate = false
}: IncomeDesktopTableProps) {
  if (!activeYearData.v2) return null;
  
  const settings = activeYearData.v2.settings || { showQuarterly: true, showAnnual: true };
  const hasAnyBonusColumn = !!(settings.showQuarterly || settings.showMonthly || settings.showAnnual || settings.showExtraAnnual);
  const colCount = 5 + (hasAnyBonusColumn ? 1 : 0) + activeYearData.v2.columns.length;

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
        <div className="bg-white dark:bg-slate-950 lg:bg-transparent lg:dark:bg-transparent rounded-3xl lg:rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:shadow-none dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 lg:border-none dark:border-slate-800/60 p-1 md:p-2 lg:p-0 relative z-10 w-full overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar relative rounded-2xl no-scrollbar block w-full">
            <table className="w-full text-sm text-left border-separate border-spacing-0 min-w-full">
              <thead className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-20">
                <tr>
                  <th className="px-2 lg:px-3 py-3 text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-left shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap align-middle">Месяц</th>
                  <th className="px-1 py-3 text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap align-middle" title="Фактически отработано / Норма">Дни</th>
                  <th className="px-1 py-3 text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap align-middle">Оклад</th>
                  
                  {hasAnyBonusColumn && (
                    <th className="px-1 py-3 text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap align-middle">
                      <span className="flex items-center justify-end gap-1.5 w-full">
                        Премия
                        {!!settings.showMonthly && (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[9px] xl:text-[10px] font-bold bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20 leading-none">
                            {settings.mainCalcType === 'percent' ? '%' : settings.mainCalcType === 'coef' ? 'Кф' : '₽'}
                          </span>
                        )}
                      </span>
                    </th>
                  )}

                  {activeYearData.v2.columns.map(col => (
                    <th key={col.id} className="px-1 py-3 text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap align-middle">
                      <span className="truncate w-full text-right" title={col.name}>
                        {col.name} {col.type === 'rub' ? '' : '%'}
                      </span>
                    </th>
                  ))}

                  <th className="px-1 py-3 text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap align-middle">Gross</th>
                  <th className={cn(
                    "pl-1 pr-3 lg:pr-4 py-3 text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap group/tax-header relative align-middle",
                    activeYearData.v2.columns.length > 0 && "shadow-[0_1px_0_0_#e2e8f0,-12px_0_15px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_#1e293b,-12px_0_15px_-10px_rgba(0,0,0,0.2)] border-l border-slate-100 dark:border-slate-800 sticky right-0 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md z-30"
                  )}>
                    <button 
                      onClick={onShowTaxInfo}
                      className="inline-flex items-center gap-1.5 ml-auto text-[11px] lg:text-xs xl:text-sm tracking-widest uppercase text-deposit-600 dark:text-deposit-400 font-semibold transition-all hover:opacity-80 active:scale-95 focus:outline-none"
                    >
                      <span>{yearKey >= 2025 ? 'Net' : 'Net 13%'}</span>
                      <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-deposit-500/15 rounded-full scale-0 group-hover/tax-header:scale-150 transition-transform duration-500" />
                        <Info size={10} className="text-deposit-500/50 group-hover/tax-header:text-deposit-500 group-hover/tax-header:rotate-[15deg] transition-all duration-300" />
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
                    v2Data={activeYearData.v2!}
                    calculatedMonths={calculatedMonths}
                    handleQuarterChange={handleQuarterChange}
                    handleMonthChange={handleMonthChange}
                    onValueChange={onValueChange}
                    isPrivate={isPrivate}
                    showQuarterlyRow={settings.showQuarterly ?? true}
                    hasAnyBonusColumn={hasAnyBonusColumn}
                  />
                ))}

                {(settings.showAnnual || settings.showExtraAnnual) && (
                  <AnnualBonusSection
                    activeYearData={activeYearData}
                    handleAnnualBonusChange={handleAnnualBonusChange}
                    calculatedMonths={calculatedMonths}
                    yearlyTotals={yearlyTotals}
                    isPrivate={isPrivate}
                    hasAnyBonusColumn={hasAnyBonusColumn}
                    showAnnual={settings.showAnnual ?? true}
                    showExtraAnnual={settings.showExtraAnnual ?? true}
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
