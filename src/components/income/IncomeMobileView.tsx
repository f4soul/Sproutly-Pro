import React, { useState, useEffect } from 'react';
import { YearData, CalculatedMonth, YearlyTotals, MonthDataV2, MonthData } from '../../types/index';
import { MONTH_NAMES, QUARTERS } from '../../lib/constants';
import { formatCurrency } from '../../lib/taxCalculator';
import { cn } from '../../lib/utils';
import { PrivacyBlur } from '../ui/PrivacyBlur';
import { ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { TableInput } from '../ui/TableInput';
import { CalculatedTableInput } from '../ui/CalculatedTableInput';
import { motion, AnimatePresence } from 'motion/react';

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
  isSimulationOpen?: boolean;
}

export function IncomeMobileView({
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
  isPrivate = false,
  isSimulationOpen = false
}: Props) {
  const [showStickyFooter, setShowStickyFooter] = useState(false);
  const formatVal = (val: number) => <PrivacyBlur isPrivate={isPrivate}>{`${new Intl.NumberFormat('ru-RU').format(Math.round(val))} ₽`}</PrivacyBlur>;

  useEffect(() => {
    const handleScroll = () => {
      if (isSimulationOpen || window.scrollY > 300) {
        setShowStickyFooter(true);
      } else {
        setShowStickyFooter(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSimulationOpen]);

  if (!activeYearData.v2) return null;
  const settings = activeYearData.v2.settings || { showQuarterly: true, showAnnual: true };
  const showAnnual = settings.showAnnual ?? true;
  const showExtraAnnual = settings.showExtraAnnual ?? true;
  const totalBaseSalary = activeYearData.bonusBase || 0;

  let firstExpandedMonthIndex = -1;
  for (let qIndex = 0; qIndex < 4; qIndex++) {
    if (expandedQuarters[qIndex]) {
      firstExpandedMonthIndex = QUARTERS[qIndex].months[0];
      break;
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full md:max-w-2xl md:mx-auto pb-36 sm:pb-40 relative">
      {/* Annual Summary Card */}
      {(settings.showAnnual ?? true) && (
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/[0.05] rounded-3xl overflow-hidden shadow-xl transition-all duration-300 p-5 w-full">
          <h4 className="font-extrabold text-sm mb-4 text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span>Годовые бонусы</span>
          </h4>
          <div className="flex gap-4">
               {showAnnual && (() => {
                 const type = activeYearData.v2?.settings?.annualCalcType || 'rub';
                 const val = activeYearData.annualBonusAmount || 0;
                 let computedVal = val;
                 if (type === 'percent') computedVal = totalBaseSalary * (val / 100);
                 else if (type === 'coef') computedVal = totalBaseSalary * val;

                 return (
                   <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Годовая премия</span>
                     <div className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/50 dark:border-slate-800/80 shadow-inner rounded-xl px-3 py-2 min-w-0 overflow-hidden group/cell relative h-10 flex items-center">
                       {isPrivate ? (
                          <div className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400 w-full truncate text-right"><PrivacyBlur isPrivate={true}>{formatCurrency(computedVal)}</PrivacyBlur></div>
                        ) : (
                          type === 'rub' ? (
                            <div className="relative flex flex-col justify-center h-full flex-1 min-w-0 pr-1">
                              <TableInput 
                                value={val} 
                                onChange={(v) => handleAnnualBonusChange('annualBonusAmount', v)} 
                                className="w-full font-mono text-sm font-bold text-primary-600 dark:text-primary-400 bg-transparent border-none p-0 focus:ring-0 outline-none placeholder:text-primary-500/30 truncate text-right"
                              />
                            </div>
                          ) : (
                            <CalculatedTableInput 
                              value={val} 
                              computedValue={computedVal} 
                              baseAmount={type === 'percent_annual' ? calculatedMonths.reduce((sum, m) => sum + m.gross, 0) : totalBaseSalary}
                              onChange={(v) => handleAnnualBonusChange('annualBonusAmount', v)} 
                              type={type as any} 
                              label="Годовая премия" 
                              className="w-full pr-1 h-full" 
                              mobileOnly 
                            />
                          )
                        )}
                     </div>
                   </div>
                 );
               })()}

               {showExtraAnnual && (() => {
                 const type = activeYearData.v2?.settings?.extraAnnualCalcType || 'rub';
                 const val = activeYearData.extraBonusAmount || 0;
                 let computedVal = val;
                 if (type === 'percent') computedVal = totalBaseSalary * (val / 100);
                 else if (type === 'coef') computedVal = totalBaseSalary * val;

                 return (
                   <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Доп. премия</span>
                     <div className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/50 dark:border-slate-800/80 shadow-inner rounded-xl px-3 py-2 min-w-0 overflow-hidden group/cell relative h-10 flex items-center">
                       {isPrivate ? (
                          <div className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400 w-full truncate text-right"><PrivacyBlur isPrivate={true}>{formatCurrency(computedVal)}</PrivacyBlur></div>
                        ) : (
                          type === 'rub' ? (
                            <div className="relative flex flex-col justify-center h-full flex-1 min-w-0 pr-1">
                              <TableInput 
                                value={val} 
                                onChange={(v) => handleAnnualBonusChange('extraBonusAmount', v)} 
                                className="w-full font-mono text-sm font-bold text-primary-600 dark:text-primary-400 bg-transparent border-none p-0 focus:ring-0 outline-none placeholder:text-primary-500/30 truncate text-right"
                              />
                            </div>
                          ) : (
                            <CalculatedTableInput 
                              value={val} 
                              computedValue={computedVal}
                              baseAmount={type === 'percent_annual' ? (calculatedMonths.reduce((sum, m) => sum + m.gross, 0) + (activeYearData.annualBonusAmount || 0)) : totalBaseSalary}
                              onChange={(v) => handleAnnualBonusChange('extraBonusAmount', v)} 
                              type={type as any} 
                              label="Доп. премия" 
                              className="w-full pr-1 h-full" 
                              mobileOnly 
                            />
                          )
                        )}
                     </div>
                   </div>
                 );
               })()}
            </div>
            {/* Can add deductions and IIS here later if user needs them in V2 on mobile */}
        </div>
      )}

      {QUARTERS.map((q, qIndex) => {
        const isExpanded = expandedQuarters[qIndex];
        const qMonths = q.months.map(mi => calculatedMonths[mi]);
        const qNet13 = qMonths.reduce((sum, m) => sum + m.net13, 0);

        return (
          <div key={qIndex} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/[0.05] rounded-3xl overflow-hidden shadow-xl transition-all duration-300">
            {/* Header / Toggle */}
            <div 
              className="p-3 sm:p-4 flex justify-between items-center cursor-pointer transition-colors shadow-sm bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/30" 
              onClick={() => onToggleQuarter(qIndex)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleQuarter(qIndex);
                }
              }}
            >
              <div className="flex items-center gap-3">
                <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }} className="text-slate-400">
                   <ChevronDown className="w-5 h-5" />
                </motion.div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-200 leading-tight">{q.name}</h3>
                  <span className="text-[10px] text-deposit-500 dark:text-deposit-400 font-mono font-bold leading-tight mt-1"><PrivacyBlur isPrivate={isPrivate}>{formatCurrency(qNet13)}</PrivacyBlur> Net</span>
                </div>
              </div>

              {(settings.showQuarterly ?? true) && (() => {
               const val = activeYearData.quarters?.[qIndex]?.bonusAmount || 0;
               const qType = settings.quarterCalcType || 'rub';
               const calcBase = activeYearData.bonusBase || 0;
               let computedVal = val;
               if (qType === 'percent') computedVal = calcBase * (val / 100);
               else if (qType === 'coef') computedVal = calcBase * val;

               return (
                 <div className="flex flex-col items-end" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[9px] text-primary-400 uppercase font-bold tracking-widest mb-1">
                      ПРЕМИЯ {qType === 'percent' ? '(%)' : qType === 'coef' ? '(x)' : '(₽)'}
                    </span>
                    <div className="w-24 sm:w-28 relative flex flex-col justify-center">
                      {isPrivate ? (
                        <div className="h-8 sm:h-9 flex items-center justify-end pr-2 font-bold text-primary-700 dark:text-primary-300 text-xs sm:text-sm"><PrivacyBlur isPrivate={true}>{formatCurrency(computedVal)}</PrivacyBlur></div>
                      ) : (
                        qType === 'rub' ? (
                          <div className="relative">
                            <TableInput 
                              value={val} 
                              onChange={(v) => handleQuarterChange(qIndex, 'bonusAmount', v)} 
                              className="w-full text-right text-xs sm:text-sm font-bold bg-primary-50/50 dark:bg-[#1A1F2E] border border-primary-200 dark:border-primary-900 h-8 sm:h-9 px-2 rounded-lg text-primary-700 dark:text-primary-300 focus:border-primary-500/50 outline-none"
                            />
                          </div>
                        ) : (
                          <div className="relative">
                            <CalculatedTableInput 
                              value={val} 
                              computedValue={computedVal} 
                              baseAmount={calcBase}
                              onChange={(v) => handleQuarterChange(qIndex, 'bonusAmount', v)} 
                              type={qType as any} 
                              label={`Премия за ${q.name}`} 
                              className="w-full pr-2 pt-1 border border-primary-200 bg-primary-50/50 rounded-lg h-9 dark:bg-[#1A1F2E] dark:border-primary-900" 
                              mobileOnly 
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
               );
              })()}
            </div>

            {/* Months */}
            <div 
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-in-out",
                isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-black/20 border-t border-slate-200/50 dark:border-white/[0.05]">
                    {q.months.map(monthIndex => {
                      const m = activeYearData.months[monthIndex];
                      const v2Month = activeYearData.v2!.months[monthIndex];
                      const calcM = calculatedMonths[monthIndex];
                      const isProjected = (calcM as any).isProjected;

                      return (
                        <div key={monthIndex} className={cn("p-4 rounded-[1.5rem] border shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all flex flex-col gap-3 backdrop-blur-md", isProjected ? "bg-primary-50/50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/20" : "bg-white/80 dark:bg-slate-800/50 border-slate-200/50 dark:border-white/[0.05]")}>
                        {/* Month Title & Net Pill */}
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">{MONTH_NAMES[monthIndex]}</span>
                          </div>
                          <div className="bg-deposit-500/10 px-2 py-1 rounded-md flex items-center">
                            <span className="text-[10px] text-deposit-600 dark:text-deposit-400 uppercase tracking-widest font-bold mr-1.5">Net</span>
                            <span className="font-mono font-bold text-deposit-600 dark:text-deposit-400 text-sm"><PrivacyBlur isPrivate={isPrivate}>{formatCurrency(calcM.net13)}</PrivacyBlur></span>
                          </div>
                        </div>

                        {/* Standard Controls */}
                        <div className="grid grid-cols-[1.25fr_1fr] md:grid-cols-2 gap-3 sm:gap-4 pb-3 border-b border-slate-100 dark:border-white/[0.05]">
                          <div className="flex flex-col h-full justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Оклад</span>
                              {isPrivate ? (
                                <div className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/50 dark:border-slate-800/80 rounded-xl px-3 h-10 font-mono text-sm font-bold text-right text-slate-800 dark:text-white flex items-center justify-end shadow-inner"><PrivacyBlur isPrivate={true}>{formatCurrency(m.salary)}</PrivacyBlur></div>
                              ) : (
                                <TableInput value={m.salary} onChange={(v) => handleMonthChange(monthIndex, 'salary', v)} className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/50 dark:border-slate-800/80 rounded-xl px-3 h-10 focus:border-primary-500/50 outline-none text-right font-mono text-sm font-bold truncate text-slate-800 dark:text-white shadow-inner transition-colors" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-2 flex items-end justify-between px-1">
                              <span>Gross:</span>
                              <span className="font-mono font-medium text-primary-500 dark:text-primary-400"><PrivacyBlur isPrivate={isPrivate}>{formatCurrency(calcM.gross)}</PrivacyBlur></span>
                            </div>
                          </div>

                          <div className="flex flex-col justify-start">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Дни (факт/норма)</span>
                              <div 
                                className="flex items-center bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/50 dark:border-slate-800/80 rounded-xl px-1 h-10 focus-within:ring-1 focus-within:border-primary-500/50 transition-colors shadow-inner"
                                {...(monthIndex === firstExpandedMonthIndex ? { 'data-tour': 'working-days-mobile' } : {})}
                              >
                                <TableInput value={m.factDays} onChange={(v) => handleMonthChange(monthIndex, 'factDays', v)} isInteger className="w-full h-full bg-transparent text-center font-mono font-bold text-sm border-none p-0 outline-none text-slate-800 dark:text-white" />
                                <span className="text-slate-300 dark:text-slate-700 px-1 font-mono">/</span>
                                <TableInput value={m.normDays} onChange={(v) => handleMonthChange(monthIndex, 'normDays', v)} isInteger className="w-full h-full bg-transparent text-center font-mono font-bold text-sm text-slate-500 border-none p-0 outline-none" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Custom Columns Grid */}
                        {(activeYearData.v2!.columns.length > 0 || settings.showMonthly) && (
                          <div className="grid grid-cols-2 gap-3">
                            {settings.showMonthly && (() => {
                              const mainType = settings.mainCalcType || 'rub';
                              const mainVal = v2Month?.values?.['system_main_bonus'] || 0;
                              let computedMainVal = mainVal;
                              let baseForMobileMain = calcM.salary;
                              if (mainType === 'percent') {
                                computedMainVal = (calcM.salary > 0 ? (calcM.factDays < calcM.normDays ? calcM.salary * (calcM.factDays / calcM.normDays) : calcM.salary) : 0) * (mainVal / 100);
                              } else if (mainType === 'coef') {
                                computedMainVal = (calcM.salary > 0 ? calcM.salary : 0) * mainVal;
                              }

                              return (
                                <div className="flex flex-col gap-1 relative group/cell">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate" title="Осн. премия">
                                    Осн. премия <span className="text-slate-400 opacity-60">
                                      {mainType === 'percent' ? '%' : mainType === 'coef' ? 'x' : '₽'}
                                    </span>
                                  </span>
                                  {isPrivate ? (
                                    <div className="flex items-center justify-end bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/50 dark:border-slate-800/80 rounded-xl px-3 h-10 font-mono text-sm font-bold text-right text-primary-600 dark:text-primary-400 shadow-inner"><PrivacyBlur isPrivate={true}>{formatCurrency(computedMainVal)}</PrivacyBlur></div>
                                  ) : (
                                    mainType === 'rub' ? (
                                      <div className="relative flex flex-col justify-center flex-1 min-w-0 pr-1">
                                        <TableInput 
                                          value={mainVal} 
                                          onChange={(v) => onValueChange(monthIndex, 'system_main_bonus', v)} 
                                          className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/50 dark:border-slate-800/80 rounded-xl px-3 h-10 focus:border-primary-500/50 outline-none text-right font-mono text-sm font-bold truncate text-primary-600 dark:text-primary-400 shadow-inner transition-colors" 
                                        />
                                      </div>
                                    ) : (
                                      <CalculatedTableInput 
                                        value={mainVal} 
                                        computedValue={computedMainVal} 
                                        baseAmount={baseForMobileMain}
                                        onChange={(v) => onValueChange(monthIndex, 'system_main_bonus', v)} 
                                        type={mainType as any} 
                                        label="Осн. премия" 
                                        className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/50 dark:border-slate-800/80 rounded-xl px-3 h-10 shadow-inner" 
                                        mobileOnly 
                                      />
                                    )
                                  )}
                                </div>
                              );
                            })()}
                            
                            {activeYearData.v2!.columns.map(col => {
                              const val = v2Month?.values?.[col.id] || 0;
                              let baseForMobileCol = m.salary > 0 ? (m.factDays < m.normDays ? m.salary * (m.factDays / m.normDays) : m.salary) : 0;
                              const amountComputed = col.type === 'percent_base' ? baseForMobileCol * (val / 100) : val;
                              return (
                                <div key={col.id} className="flex flex-col gap-1 group/cell relative">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate" title={col.name}>{col.name}</span>
                                  {isPrivate ? (
                                    <div className="flex items-center justify-end bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/50 dark:border-slate-800/80 rounded-xl px-2 h-10 font-mono text-xs font-bold text-right text-primary-600 dark:text-primary-400 shadow-inner"><PrivacyBlur isPrivate={true}>{formatCurrency(amountComputed)}</PrivacyBlur></div>
                                  ) : (
                                    col.type === 'rub' ? (
                                      <div className="relative flex flex-col justify-center flex-1 min-w-0 pr-1">
                                        <TableInput value={val} onChange={(v) => onValueChange(monthIndex, col.id, v)} className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/50 dark:border-slate-800/80 rounded-xl px-2 h-10 focus:border-primary-500/50 outline-none text-right font-mono text-xs font-bold text-primary-600 dark:text-primary-400 truncate pr-5 shadow-inner transition-colors" />
                                        <span className="absolute right-2 top-2.5 text-[9px] font-bold text-slate-400 pointer-events-none">
                                          ₽
                                        </span>
                                      </div>
                                    ) : (
                                      <CalculatedTableInput 
                                        value={val} 
                                        computedValue={amountComputed} 
                                        baseAmount={baseForMobileCol}
                                        onChange={(v) => onValueChange(monthIndex, col.id, v)} 
                                        type={col.type as any} 
                                        label={col.name} 
                                        className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/50 dark:border-slate-800/80 rounded-xl px-2 h-10 shadow-inner" 
                                        mobileOnly 
                                      />
                                    )
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

      {/* Sticky Bottom Summary for Mobile/Tablet */}
      <AnimatePresence>
        {showStickyFooter && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-4 right-4 sm:left-6 sm:right-6 xl:hidden z-40 pointer-events-none max-w-2xl mx-auto md:left-[calc(17rem+1.5rem)] md:right-6"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
          >
            <div className="bg-white/80 dark:bg-[#050505]/95 backdrop-blur-3xl text-slate-800 dark:text-white rounded-3xl p-4 sm:p-5 shadow-[0_12px_36px_rgba(0,0,0,0.08)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] border border-slate-200/60 dark:border-white/[0.05] flex justify-between items-center pointer-events-auto transition-colors duration-300">
              <div className="flex flex-col">
                <span className="text-[9px] sm:text-[10px] text-primary-600 dark:text-slate-500 font-black uppercase tracking-[0.1em] leading-tight mb-1">Финальный Net за год</span>
                <span className="text-xl sm:text-2xl font-bold font-mono tracking-tighter text-slate-900 dark:text-white drop-shadow-sm transition-colors duration-300">
                  {formatVal(yearlyTotals.finalNet)}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-500 font-black uppercase tracking-[0.1em] leading-tight mb-1">Total Gross</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-slate-300 transition-colors duration-300">
                  {formatVal(yearlyTotals.totalGross)}
                </span>
                <span className="text-[9px] sm:text-[10px] text-rose-500/90 dark:text-rose-400/90 font-mono font-medium mt-1">
                  -{formatVal(yearlyTotals.progressiveTax || 0)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
