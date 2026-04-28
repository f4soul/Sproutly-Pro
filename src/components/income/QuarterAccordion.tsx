import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { TableInput } from '../ui/TableInput';
import { YearData, MonthData, CalculatedMonth } from '../../types/index';
import { formatCurrency } from '../../lib/taxCalculator';
import { MONTH_NAMES } from '../../lib/constants';

interface QuarterAccordionProps {
  key?: React.Key;
  q: { name: string, months: number[] };
  qIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  activeYearData: YearData;
  calculatedMonths: CalculatedMonth[];
  handleQuarterChange: (qIndex: number, field: 'bonusCoef' | 'bonusAmount', value: number) => void;
  handleMonthChange: (mIndex: number, field: keyof MonthData, value: number) => void;
  isPrivate?: boolean;
}

export const QuarterAccordion = ({
  q,
  qIndex,
  isExpanded,
  onToggle,
  activeYearData,
  calculatedMonths,
  handleQuarterChange,
  handleMonthChange,
  isPrivate = false
}: QuarterAccordionProps) => {
  const qMonths = q.months.map(mi => calculatedMonths[mi]);
  const qNet13 = qMonths.reduce((sum, m) => sum + m.net13, 0);

  const formatVal = (val: number) => isPrivate ? '••••••' : formatCurrency(val);

  return (
    <div className="apple-card overflow-hidden">
      <div 
        className="p-3 sm:p-4 flex justify-between items-center cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
            <ChevronDown size={20} className="text-slate-400" />
          </motion.div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">{q.name}</span>
            <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-mono font-bold">{formatVal(qNet13)} Net</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end" onClick={(e) => e.stopPropagation()}>
          <span className="text-[9px] text-indigo-400 uppercase font-bold tracking-widest mb-1">Премия (₽)</span>
          {isPrivate ? (
            <div className="h-8 sm:h-9 flex items-center pr-2 font-bold text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm">••••••</div>
          ) : (
            <TableInput 
              value={activeYearData.quarters?.[qIndex]?.bonusAmount || 0} 
              onChange={(v) => handleQuarterChange(qIndex, 'bonusAmount', v)} 
              className="w-20 sm:w-24 text-right text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 h-8 sm:h-9 px-2 rounded-lg" 
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 sm:p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
              {/* Months */}
              {q.months.map((monthIndex) => {
                const m = activeYearData.months[monthIndex];
                const calcM = calculatedMonths[monthIndex];
                return (
                  <div key={monthIndex} className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">{MONTH_NAMES[monthIndex]}</span>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold mr-1.5">Net</span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">{formatVal(calcM.net13)}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Оклад</span>
                        {isPrivate ? (
                          <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 font-mono text-right text-sm h-[34px]">••••••</div>
                        ) : (
                          <TableInput 
                            value={m.salary} 
                            onChange={(v) => handleMonthChange(monthIndex, 'salary', v)} 
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-right text-sm" 
                          />
                        )}
                        <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                          <span>Gross:</span>
                          <span className="font-mono font-medium text-indigo-500">{formatVal(calcM.gross)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Дни (Факт/Норма)</span>
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                          <TableInput 
                            value={m.factDays} 
                            onChange={(v) => handleMonthChange(monthIndex, 'factDays', v)} 
                            className="w-full bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-sm p-0" 
                            isInteger={true} 
                          />
                          <span className="text-slate-300 dark:text-slate-600">/</span>
                          <TableInput 
                            value={m.normDays} 
                            onChange={(v) => handleMonthChange(monthIndex, 'normDays', v)} 
                            className="w-full bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-sm p-0 text-slate-500" 
                            isInteger={true} 
                          />
                        </div>
                        {monthIndex % 3 === 2 && (
                          <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                            <span>Премия:</span>
                            <span className="font-mono font-medium text-indigo-500">{formatVal(calcM.bonus)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
