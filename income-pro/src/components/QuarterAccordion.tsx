import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { TableInput } from './TableInput';
import { YearData, MonthData } from '../types/index';
import { formatCurrency } from '../lib/taxCalculator';
import { MONTH_NAMES } from '../lib/constants';

interface QuarterAccordionProps {
  key?: React.Key;
  q: { name: string, months: number[] };
  qIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  activeYearData: YearData;
  calculatedMonths: any[];
  handleQuarterChange: (qIndex: number, field: string, value: number) => void;
  handleMonthChange: (mIndex: number, field: string, value: number) => void;
}

export const QuarterAccordion = ({
  q,
  qIndex,
  isExpanded,
  onToggle,
  activeYearData,
  calculatedMonths,
  handleQuarterChange,
  handleMonthChange
}: QuarterAccordionProps) => {
  const qMonths = q.months.map(mi => calculatedMonths[mi]);
  const qNet13 = qMonths.reduce((sum, m) => sum + m.net13, 0);

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
      <div 
        className="p-4 flex justify-between items-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
            <ChevronDown size={18} className="text-slate-400" />
          </motion.div>
          <span className="font-bold text-slate-800 dark:text-slate-200">{q.name}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">Net за квартал</div>
          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(qNet13)}</div>
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
            <div className="p-3 space-y-3 bg-slate-50/30 dark:bg-transparent">
              {/* Quarter Bonus */}
              <div className="bg-white dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 flex justify-between items-center shadow-sm">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Премия за квартал</span>
                <div className="w-32">
                  <TableInput 
                    value={activeYearData.quarters?.[qIndex]?.bonusAmount || 0} 
                    onChange={(v) => handleQuarterChange(qIndex, 'bonusAmount', v)} 
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-right text-sm font-bold text-blue-600 dark:text-blue-400" 
                  />
                </div>
              </div>

              {/* Months */}
              {q.months.map((monthIndex) => {
                const m = activeYearData.months[monthIndex];
                const calcM = calculatedMonths[monthIndex];
                return (
                  <div key={monthIndex} className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/50 pb-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{MONTH_NAMES[monthIndex]}</span>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider mr-2">Net</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(calcM.net13)}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Оклад</span>
                        <TableInput 
                          value={m.salary} 
                          onChange={(v) => handleMonthChange(monthIndex, 'salary', v)} 
                          className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-right text-sm" 
                        />
                        <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                          <span>Gross:</span>
                          <span className="font-mono font-medium text-indigo-500">{formatCurrency(calcM.gross)}</span>
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
                          <div className="text-[10px] text-slate-500 mt-2 flex justify-between">
                            <span>Премия:</span>
                            <span className="font-mono font-medium text-indigo-500">{formatCurrency(calcM.bonus)}</span>
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
