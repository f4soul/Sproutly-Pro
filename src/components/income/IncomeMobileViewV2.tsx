import React from 'react';
import { YearData, CalculatedMonth, YearlyTotals, MonthDataV2, MonthData } from '../../types/index';
import { MONTH_NAMES, QUARTERS } from '../../lib/constants';
import { formatCurrency } from '../../lib/taxCalculator';
import { cn } from '../../lib/utils';
import { PrivacyBlur } from '../ui/PrivacyBlur';
import { ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { TableInput } from '../ui/TableInput';

interface Props {
  activeYearData: YearData;
  calculatedMonths: CalculatedMonth[];
  yearlyTotals: YearlyTotals;
  expandedQuarters: Record<number, boolean>;
  onToggleQuarter: (q: number) => void;
  handleAnnualBonusChange: (field: any, value: any) => void;
  handleQuarterChange: (qIndex: number, field: 'bonusCoef' | 'bonusAmount', value: number) => void;
  handleMonthChange: (monthIndex: number, field: keyof MonthData, value: number) => void;
  onValueChange: (monthIndex: number, colId: string, value: number) => void;
  onApplyBaseToAll: () => void;
  isPrivate?: boolean;
}

export function IncomeMobileViewV2({
  activeYearData,
  calculatedMonths,
  yearlyTotals,
  expandedQuarters,
  onToggleQuarter,
  handleAnnualBonusChange,
  handleQuarterChange,
  handleMonthChange,
  onValueChange,
  onApplyBaseToAll,
  isPrivate = false
}: Props) {
  if (!activeYearData.v2) return null;

  return (
    <div className="flex flex-col gap-4 w-full">
      
      {/* Settings Card */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-xl">
        <h4 className="font-extrabold text-sm mb-4 text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
          <span>Настройки года</span>
        </h4>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 relative group p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">Базовый оклад</span>
            <div className="flex items-center gap-2">
              {isPrivate ? (
                <div className="flex-1 bg-white dark:bg-slate-950 font-mono text-base font-bold px-3 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-900 dark:text-white"><PrivacyBlur isPrivate={isPrivate}>{formatCurrency(Math.round(activeYearData.bonusBase || 0))}</PrivacyBlur></div>
              ) : (
                <TableInput 
                  value={Math.round(activeYearData.bonusBase || 0)} 
                  onChange={(v) => handleAnnualBonusChange('bonusBase', v)} 
                  className="flex-1 bg-white dark:bg-slate-950 font-mono text-base font-bold px-3 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 focus:border-primary-500 outline-none text-slate-900 dark:text-white" 
                />
              )}
              <button 
                onClick={onApplyBaseToAll}
                className="bg-primary-50 text-primary-500 dark:bg-primary-500/10 dark:text-primary-400 p-2.5 rounded-xl hover:bg-primary-100 transition-colors"
                title="Применить ко всем месяцам"
              >
                <Zap className="w-5 h-5 fill-current opacity-20" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 pl-1">Примените базу чтобы заполнить все колонки оклада</p>
          </div>
          
          <div className="flex gap-3">
             <div className="flex-1 flex flex-col gap-1.5 min-w-0">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Годовая премия</span>
               <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-2.5 py-2 min-w-0 overflow-hidden">
                 {isPrivate ? (
                    <div className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400 w-full truncate"><PrivacyBlur isPrivate={true}>{formatCurrency(activeYearData.annualBonusAmount || 0)}</PrivacyBlur></div>
                  ) : (
                    <TableInput 
                      value={activeYearData.annualBonusAmount || 0} 
                      onChange={(v) => handleAnnualBonusChange('annualBonusAmount', v)} 
                      className="w-full font-mono text-sm font-bold text-primary-600 dark:text-primary-400 bg-transparent border-none p-0 focus:ring-0 outline-none placeholder:text-primary-500/30 truncate"
                    />
                  )}
               </div>
             </div>
             <div className="flex-1 flex flex-col gap-1.5 min-w-0">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Доп. премия</span>
               <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-2.5 py-2 min-w-0 overflow-hidden">
                 {isPrivate ? (
                    <div className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400 w-full truncate"><PrivacyBlur isPrivate={true}>{formatCurrency(activeYearData.extraBonusAmount || 0)}</PrivacyBlur></div>
                  ) : (
                    <TableInput 
                      value={activeYearData.extraBonusAmount || 0} 
                      onChange={(v) => handleAnnualBonusChange('extraBonusAmount', v)} 
                      className="w-full font-mono text-sm font-bold text-primary-600 dark:text-primary-400 bg-transparent border-none p-0 focus:ring-0 outline-none placeholder:text-primary-500/30 truncate"
                    />
                  )}
               </div>
             </div>
          </div>
        </div>
      </div>

      {QUARTERS.map((q, qIndex) => {
        const isExpanded = expandedQuarters[qIndex];
        const qMonths = q.months.map(mi => calculatedMonths[mi]);
        const qGross = qMonths.reduce((sum, m) => sum + m.gross, 0);

        return (
          <div key={qIndex} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 rounded-3xl overflow-hidden shadow-xl">
            {/* Header / Toggle */}
            <button 
              onClick={() => onToggleQuarter(qIndex)}
              className="w-full flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1 rounded-lg transition-transform text-slate-400",
                  isExpanded ? "bg-slate-200 dark:bg-slate-700" : ""
                )}>
                  <ChevronRight className={cn("w-5 h-5 transition-transform", isExpanded && "rotate-90")} />
                </div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">{q.name}</h3>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Gross за квартал</span>
                <span className="font-mono font-bold text-primary-600 dark:text-primary-400 text-sm leading-none"><PrivacyBlur isPrivate={isPrivate}>{formatCurrency(qGross)}</PrivacyBlur></span>
              </div>
            </button>

            {/* Quarter Bonus Row */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-800/10">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest w-1/3">КВ премия</span>
              <div className="w-2/3 max-w-[120px]">
                {isPrivate ? (
                  <div className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400 text-right"><PrivacyBlur isPrivate={true}>{formatCurrency(activeYearData.quarters?.[qIndex]?.bonusAmount || 0)}</PrivacyBlur></div>
                ) : (
                  <TableInput 
                    value={activeYearData.quarters?.[qIndex]?.bonusAmount || 0} 
                    onChange={(v) => handleQuarterChange(qIndex, 'bonusAmount', v)} 
                    className="w-full font-mono text-sm font-bold text-primary-600 dark:text-primary-400 bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 rounded-lg px-2 py-1.5 focus:border-primary-500 outline-none text-right truncate"
                  />
                )}
              </div>
            </div>

            {/* Months */}
            <div className={cn(
              "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out",
              isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/40 border-t border-slate-100 dark:border-slate-800/50">
                  {q.months.map(monthIndex => {
                    const m = activeYearData.months[monthIndex];
                    const v2Month = activeYearData.v2!.months[monthIndex];
                    const calcM = calculatedMonths[monthIndex];
                    const isProjected = (calcM as any).isProjected;

                    return (
                      <div key={monthIndex} className={cn("p-4 flex flex-col gap-3", isProjected && "bg-primary-500/5 dark:bg-primary-400/5")}>
                        {/* Month Title & Gross */}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-bold text-base text-slate-800 dark:text-slate-200">{MONTH_NAMES[monthIndex]}</span>
                            <span className="text-[10px] text-slate-400 font-medium">Net: <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(calcM.net13)}</PrivacyBlur></span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Gross Итого</span>
                            <span className="font-mono font-bold text-primary-700 dark:text-primary-400 text-lg leading-none"><PrivacyBlur isPrivate={isPrivate}>{formatCurrency(calcM.gross)}</PrivacyBlur></span>
                          </div>
                        </div>

                        {/* Standard Controls */}
                         <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/50">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Дни (факт/норма)</span>
                              <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-2 py-1.5 focus-within:ring-2 focus-within:border-primary-500 transition-all">
                                <TableInput value={m.factDays} onChange={(v) => handleMonthChange(monthIndex, 'factDays', v)} isInteger className="w-full bg-transparent text-center font-mono font-bold text-sm border-none p-0 outline-none" />
                                <span className="text-slate-300 dark:text-slate-600 px-1 font-mono">/</span>
                                <TableInput value={m.normDays} onChange={(v) => handleMonthChange(monthIndex, 'normDays', v)} isInteger className="w-full bg-transparent text-center font-mono font-bold text-sm text-slate-500 border-none p-0 outline-none" />
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Оклад</span>
                              {isPrivate ? (
                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-3 py-1.5 font-mono text-sm font-bold text-right text-slate-800 dark:text-slate-200"><PrivacyBlur isPrivate={true}>{formatCurrency(m.salary)}</PrivacyBlur></div>
                              ) : (
                                <TableInput value={m.salary} onChange={(v) => handleMonthChange(monthIndex, 'salary', v)} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-3 py-1.5 focus:border-primary-500 outline-none text-right font-mono text-sm font-bold truncate text-slate-800 dark:text-slate-200" />
                              )}
                            </div>
                         </div>

                        {/* Custom Columns Grid */}
                        {activeYearData.v2!.columns.length > 0 && (
                          <div className="grid grid-cols-2 gap-3">
                            {activeYearData.v2!.columns.map(col => {
                              const val = v2Month?.values?.[col.id] || 0;
                              return (
                                <div key={col.id} className="flex flex-col gap-1">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate" title={col.name}>{col.name}</span>
                                  {isPrivate ? (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-2 py-1.5 font-mono text-xs font-bold text-right text-primary-600 dark:text-primary-400"><PrivacyBlur isPrivate={true}>{formatCurrency(val)}</PrivacyBlur></div>
                                  ) : (
                                    <div className="relative">
                                      <TableInput value={val} onChange={(v) => onValueChange(monthIndex, col.id, v)} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-2 py-1.5 focus:border-primary-500 outline-none text-right font-mono text-xs font-bold text-primary-600 dark:text-primary-400 truncate pr-5" />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300 pointer-events-none">
                                        {col.type === 'rub' ? '₽' : '%'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
          </div>
        );
      })}
    </div>
  );
}
