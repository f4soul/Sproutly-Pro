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
    <div className="apple-card overflow-hidden">
      <div 
        className="p-4 flex justify-between items-center cursor-pointer bg-[#F5F5F7]/50 dark:bg-white/5 hover:bg-[#F5F5F7] dark:hover:bg-white/10 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
            <ChevronDown size={18} className="text-light-text-secondary dark:text-dark-text-secondary" />
          </motion.div>
          <span className="font-bold text-light-text-primary dark:text-dark-text-primary">{q.name}</span>
        </div>
        <div className="text-right">
          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary font-medium">Net за квартал</div>
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
            <div className="p-3 space-y-3 bg-[#F5F5F7]/30 dark:bg-transparent">
              {/* Quarter Bonus */}
              <div className="bg-white dark:bg-dark-card p-3 rounded-xl border border-light-border dark:border-dark-border flex justify-between items-center shadow-sm">
                <span className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary">Премия за квартал</span>
                <div className="w-32">
                  <TableInput 
                    value={activeYearData.quarters?.[qIndex]?.bonusAmount || 0} 
                    onChange={(v) => handleQuarterChange(qIndex, 'bonusAmount', v)} 
                    className="apple-input w-full px-2 py-1.5 font-mono text-right text-sm font-bold text-indigo-600 dark:text-indigo-400" 
                  />
                </div>
              </div>

              {/* Months */}
              {q.months.map((monthIndex) => {
                const m = activeYearData.months[monthIndex];
                const calcM = calculatedMonths[monthIndex];
                return (
                  <div key={monthIndex} className="bg-white dark:bg-dark-card p-4 rounded-xl border border-light-border dark:border-dark-border shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-light-border dark:border-dark-border pb-2">
                      <span className="font-bold text-light-text-primary dark:text-dark-text-primary">{MONTH_NAMES[monthIndex]}</span>
                      <div className="text-right">
                        <span className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider mr-2">Net</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(calcM.net13)}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest">Оклад</span>
                        <TableInput 
                          value={m.salary} 
                          onChange={(v) => handleMonthChange(monthIndex, 'salary', v)} 
                          className="apple-input w-full px-2 py-1.5 font-mono text-right text-sm" 
                        />
                        <div className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary mt-1 flex justify-between">
                          <span>Gross:</span>
                          <span className="font-mono font-medium text-indigo-500">{formatCurrency(calcM.gross)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest">Дни (Факт/Норма)</span>
                        <div className="flex items-center gap-1 bg-[#F5F5F7] dark:bg-white/5 border border-light-border dark:border-dark-border rounded-lg p-1">
                          <TableInput 
                            value={m.factDays} 
                            onChange={(v) => handleMonthChange(monthIndex, 'factDays', v)} 
                            className="w-full bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-sm p-0" 
                            isInteger={true} 
                          />
                          <span className="text-light-text-secondary dark:text-dark-text-secondary">/</span>
                          <TableInput 
                            value={m.normDays} 
                            onChange={(v) => handleMonthChange(monthIndex, 'normDays', v)} 
                            className="w-full bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-sm p-0 text-light-text-secondary" 
                            isInteger={true} 
                          />
                        </div>
                        {monthIndex % 3 === 2 && (
                          <div className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary mt-2 flex justify-between">
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
