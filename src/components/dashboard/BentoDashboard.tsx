import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  TrendingUp, 
  Receipt, 
  Landmark, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  Plus,
  Settings as SettingsIcon,
  Download,
  Eye,
  EyeOff,
  Shield,
  X as CloseIcon,
  Calculator,
  Activity
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { Deposit, TaxYearSettings, AppSettings } from '../../types';
import { useAppState } from '../../hooks/useAppState';
import { calculateUnifiedFinance } from '../../lib/unifiedFinance';
import { formatCurrency, cn } from '../../lib/utils';
import { DepositHeatmap } from '../deposits/DepositHeatmap';
import { HeatmapIcon } from '../ui/HeatmapIcon';

import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { AnimatedPercentage } from '../ui/AnimatedPercentage';
import { AutoFitText } from '../ui/AutoFitText';

interface BentoDashboardProps {
  deposits: Deposit[];
  taxSettings: TaxYearSettings[];
  appSettings: AppSettings;
  isPrivate?: boolean;
  setIsPrivate?: (val: boolean) => void;
}



export function BentoDashboard({ 
  deposits, 
  taxSettings, 
  appSettings, 
  isPrivate = false,
  setIsPrivate 
}: BentoDashboardProps) {
  const { state } = useAppState();
  const selectedYear = state.activeYear;

  const data = useMemo(() => {
    // ... (logic remains same)
    let totalDepositsAmount = 0;
    const upcomingEvents: { date: Date; type: 'deposit_end' | 'salary'; label: string; amount?: number }[] = [];

    deposits.forEach(d => {
      if (d.isArchived) return;
      
      const isClosed = d.isClosed || (() => {
        if (!d.endDate) return false;
        const end = new Date(d.endDate);
        end.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return end.getTime() < today.getTime();
      })();
      
      if (!isClosed) {
        totalDepositsAmount += d.amount;
      }

      if (d.endDate) {
        const endDate = new Date(d.endDate);
        if (endDate.getFullYear() === selectedYear) {
          upcomingEvents.push({
            date: endDate,
            type: 'deposit_end',
            label: `Окончание: ${d.bank}`,
            amount: d.amount
          });
        }
      }
    });

    const yearData = state.years[selectedYear];
    const includeDeposits = true;
    const unified = calculateUnifiedFinance({
      selectedYear,
      yearData,
      deposits,
      taxSettings,
      taxBrackets: state.taxBrackets,
      includeDeposits
    });

    let totalNormDays = 247;
    let totalWorkingHours = 1973;

    if (yearData) {
      totalNormDays = yearData.months.reduce((sum, m) => sum + m.normDays, 0);
      totalWorkingHours = totalNormDays * 8;
      // Salary events removed per user request
    }

    const insights = [];
    if (unified.depositsIncome > unified.depositLimit) {
      insights.push({
        title: "Лимит вкладов превышен",
        text: `Вы заплатите ${formatCurrency(unified.depositsTax)} налога с процентов.`,
        type: 'warning'
      });
    }
    if ((yearData?.iisContribution || 0) < 400000) {
      const remaining = 400000 - (yearData?.iisContribution || 0);
      insights.push({
        title: "Налоговый вычет ИИС",
        text: `Пополнив ИИС на ${formatCurrency(remaining)}, вы вернете ${formatCurrency(remaining * 0.13)}.`,
        type: 'info'
      });
    }

    const now = new Date();
    const sortedEvents = upcomingEvents
      .filter(e => e.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);

    const prevYear = selectedYear - 1;
    const prevYearData = state.years[prevYear];
    const prevUnified = calculateUnifiedFinance({
      selectedYear: prevYear,
      yearData: prevYearData,
      deposits,
      taxSettings,
      taxBrackets: state.taxBrackets,
      includeDeposits
    });

    const netDiffPercent = prevUnified.totalNet > 0 
      ? ((unified.totalNet - prevUnified.totalNet) / prevUnified.totalNet) * 100 
      : 0;

    return {
      ...unified,
      limit: unified.depositLimit,
      totalDepositsAmount,
      upcomingEvents: sortedEvents,
      insights,
      netDiffPercent,
      totalNormDays,
      totalWorkingHours
    };
  }, [deposits, selectedYear, taxSettings, state]);

  const incomeChartData = [
    { name: 'Зарплата', value: data.salaryGross, color: 'var(--color-primary-500)' },
    { name: 'Вклады', value: data.depositsIncome, color: 'var(--color-deposit-500)' },
  ];

  const formatVal = (val: number) => isPrivate ? '••••••' : <AnimatedCurrency value={val} />;
  const formatValPlain = (val: number) => isPrivate ? '••••••' : formatCurrency(val);
  const limitProgress = Math.min(100, (data.depositsIncome / data.limit) * 100);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 w-full min-w-0">
      {/* Bento Grid */}
      <motion.div 
        id="bento-grid" 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 lg:auto-rows-[180px]"
      >
        
        {/* Main Capital Card (2/3 width) */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="col-span-1 md:col-span-2 lg:col-span-4 lg:row-span-2 apple-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group"
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl -translate-y-32 translate-x-32 transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl translate-y-32 -translate-x-32 transition-transform duration-700 group-hover:scale-110" />
          
          {/* Decorative Year Background */}
          <div className="absolute -right-6 -bottom-12 select-none pointer-events-none transition-all duration-700 overflow-hidden">
            <motion.span 
              key={selectedYear}
              initial={{ opacity: 0, scale: 0.8, x: 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="text-[160px] font-black leading-none tracking-tighter whitespace-nowrap text-black/[0.06] dark:text-white/5"
            >
              {selectedYear}
            </motion.span>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className="text-primary-500 dark:text-primary-400" />
                  <span className="text-sm font-bold uppercase tracking-wider">Чистый капитал (Net)</span>
                </div>
              </div>
              
              {setIsPrivate && (
                <button 
                  onClick={() => setIsPrivate(!isPrivate)}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                  title={isPrivate ? "Показать данные" : "Скрыть данные"}
                >
                  {isPrivate ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
            <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tighter mb-2 text-slate-950 dark:text-white">
              {formatVal(data.totalNet)}
            </h2>
            <div className="flex items-center gap-1 font-medium">
              {data.netDiffPercent! >= 0 ? (
                <ArrowUpRight size={16} className="text-primary-500 dark:text-primary-400" />
              ) : (
                <ArrowDownRight size={16} className="text-rose-500 dark:text-rose-400" />
              )}
              <AnimatedPercentage 
                value={data.netDiffPercent!} 
                showPlus={true} 
                className={cn(
                  "font-bold",
                  data.netDiffPercent! >= 0 ? "text-primary-600 dark:text-primary-400" : "text-rose-600 dark:text-rose-400"
                )}
              />
              <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">к прошлому году</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 relative z-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Грязный доход</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatVal(data.totalGross)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Всего налогов</p>
              <p className="text-xl font-bold text-rose-500 dark:text-rose-400">{formatVal(data.totalTax)}</p>
            </div>
          </div>
        </motion.div>

        {/* Averages Block */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="@container col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-1 apple-card p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden h-full min-h-[130px] group"
        >
          {/* Subtle Accent Glow */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary-500/10 via-primary-500/5 to-transparent dark:from-primary-900/20 dark:via-primary-900/5 z-0 pointer-events-none"></div>

          {/* Activity Graphic */}
          <div className="absolute top-0 right-0 -mr-4 -mt-4 text-primary-500 opacity-5 dark:opacity-10 group-hover:text-primary-400/20 group-hover:scale-110 transition-all duration-700 pointer-events-none z-0">
             <Activity size={140} strokeWidth={1} />
          </div>

          <div className="relative z-10 h-full flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between mb-3 w-full">
               <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                 Средний доход <span className="opacity-70 ml-0.5 text-[8px]">(NET)</span>
               </h3>
            </div>
            
            <div className="flex flex-col gap-2 mt-auto overflow-hidden">
               <AutoFitText className="flex items-baseline gap-1.5 leading-none mb-0.5 pointer-events-none">
                 <span className="text-3xl sm:text-4xl lg:text-[2.5rem] font-black text-primary-600 dark:text-primary-400 drop-shadow-sm p-0.5">{formatVal(data.totalNet / 12)}</span>
                 <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase shrink-0">/ мес</span>
               </AutoFitText>
               
               <div className="flex flex-wrap items-center gap-1.5 mt-1">
                 <div className="inline-flex items-baseline gap-1.5 leading-none bg-slate-50/50 dark:bg-slate-950/50 px-2.5 py-2 rounded-[8px] border border-slate-200/50 dark:border-white/5 w-max max-w-full">
                   <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{formatVal(data.totalNet / 365)}</span>
                   <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0">/ день</span>
                 </div>
                 
                 <div className="inline-flex items-baseline gap-1.5 leading-none bg-slate-50/50 dark:bg-slate-950/50 px-2.5 py-2 rounded-[8px] border border-slate-200/50 dark:border-white/5 w-max max-w-full">
                   <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{formatVal(data.totalNet / 1973)}</span>
                   <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0">/ час</span>
                 </div>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Income Structure Chart */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2 apple-card p-4 sm:p-5 flex flex-col justify-between min-h-[160px] lg:min-h-0 relative"
        >
          <div className="flex items-center justify-between z-10 relative">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">Структура доходов</h3>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-4 mt-2 mb-2">
            <div className="hidden lg:flex flex-1 items-center justify-center min-h-[140px] relative z-0">
              {(() => {
                const total = incomeChartData.reduce((sum, item) => sum + item.value, 0);
                if (total === 0) return (
                  <div className="flex w-full py-4 items-center justify-center opacity-50 text-slate-400 text-xs font-bold uppercase tracking-widest text-center">
                    Нет данных
                  </div>
                );
                
                return (
                  <div className="w-full flex items-center justify-center h-full max-h-[160px] lg:max-h-[220px]">
                    <svg className="w-full h-full max-w-[220px] max-h-[220px] -rotate-90 overflow-visible" viewBox="0 0 200 200">
                      {incomeChartData.map((item, idx) => {
                        const radius = 95 - (idx * 20);
                        const circumference = 2 * Math.PI * radius;
                        const percent = total > 0 ? item.value / total : 0;
                        const strokeDashoffset = Math.max(0, circumference - percent * circumference);
                        
                        return (
                          <g key={`income-ring-${item.name}-${idx}`}>
                            <circle
                              cx="100"
                              cy="100"
                              r={radius}
                              fill="none"
                              stroke={item.color}
                              strokeWidth="15"
                              className="opacity-[0.08] dark:opacity-[0.15]"
                            />
                            {percent > 0 && (
                              <motion.circle
                                cx="100"
                                cy="100"
                                r={radius}
                                fill="none"
                                stroke={item.color}
                                strokeWidth="15"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset }}
                                transition={{ duration: 1.5, ease: "easeOut", delay: idx * 0.15 }}
                                style={{ filter: `drop-shadow(0 0 8px ${item.color}90)` }}
                              />
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}
            </div>
            
            <div className="lg:hidden space-y-4">
              <div className="relative h-2 bg-slate-50 dark:bg-slate-800/50 rounded-full">
                <div className="flex h-full w-full rounded-full">
                  {(() => {
                    const total = incomeChartData.reduce((sum, item) => sum + item.value, 0);
                    if (total === 0) return null;
                    return incomeChartData.map((item, idx) => (
                      <motion.div
                        key={item.name}
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.value / total) * 100}%` }}
                        transition={{ duration: 1, delay: idx * 0.2 }}
                        style={{ 
                          backgroundColor: item.color,
                          boxShadow: `0 0 8px ${item.color}90`
                        }}
                        className="h-full first:rounded-l-full last:rounded-r-full relative z-10"
                      />
                    ));
                  })()}
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <span>0 ₽</span>
                <span>{(() => {
                  const total = incomeChartData.reduce((sum, item) => sum + item.value, 0);
                  return formatValPlain(total);
                })()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-auto shrink-0 z-10 relative">
            {incomeChartData.map((item, idx) => (
              <div key={`income-item-${item.name}-${idx}`} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{item.name}</span>
                </div>
                <span className="text-xs font-black text-slate-950 dark:text-white" title={formatValPlain(item.value)}>{formatVal(item.value)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tax Limit Progress */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="col-span-1 md:col-span-1 lg:col-span-2 lg:row-span-1 apple-card p-4 sm:p-5 flex flex-col justify-between min-w-0"
        >
          <div className="flex items-center justify-between mb-4 w-full">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">Лимит вкладов</h3>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest shrink-0",
              limitProgress >= 100 ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" : "bg-deposit-50 text-deposit-600 dark:bg-deposit-500/10 dark:text-deposit-400"
            )}>
              {limitProgress.toFixed(1)}%
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-end w-full space-y-4">
            <p className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white truncate">
              {formatVal(data.depositsIncome)}
            </p>
            
            <div className="relative h-2 bg-slate-50 dark:bg-slate-800/50 rounded-full shrink-0 mt-auto">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, limitProgress))}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full transition-colors duration-500",
                  limitProgress >= 100 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "bg-deposit-500 shadow-[0_0_8px_rgba(var(--rgb-deposit),0.6)]"
                )}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 shrink-0">
              <span>0 ₽</span>
              <span>{formatValPlain(data.limit)}</span>
            </div>
          </div>
        </motion.div>

        {/* Total in Deposits */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="col-span-1 md:col-span-1 lg:col-span-2 lg:row-span-1 apple-card p-4 sm:p-5 flex flex-col justify-between items-start min-w-0"
        >
          <div className="w-full flex justify-between items-start mb-auto">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-deposit-100 dark:bg-deposit-500/20 flex items-center justify-center text-deposit-600 dark:text-deposit-400 shrink-0">
              <Landmark size={18} className="sm:w-5 sm:h-5" />
            </div>
            {(() => {
              const activeCount = deposits.filter(d => {
                if (d.isArchived) return false;
                if (d.isClosed) return false;
                if (!d.endDate) return true;
                const end = new Date(d.endDate);
                end.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return end.getTime() >= today.getTime();
              }).length;
              if (activeCount > 0) {
                const lastDigit = activeCount % 10;
                const lastTwo = activeCount % 100;
                const word = (lastDigit === 1 && lastTwo !== 11) ? 'активный' : 'активных';
                return (
                  <div className="bg-slate-50/80 dark:bg-slate-800/80 flex items-center px-2 py-1 rounded-lg backdrop-blur-md border border-slate-200/50 dark:border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      <span className="text-deposit-500 mr-1">{activeCount}</span>{word}
                    </span>
                  </div>
                )
              }
              return null;
            })()}
          </div>
          
          <div className="min-w-0 w-full mt-2">
            <h3 className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1 truncate">Во вкладах</h3>
            <p className="text-[1.35rem] sm:text-2xl font-black text-slate-950 dark:text-white truncate tracking-tight">{formatVal(data.totalDepositsAmount)}</p>
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="col-span-1 md:col-span-2 lg:col-span-6 lg:row-span-2 apple-card p-6 flex flex-col min-h-[300px] lg:min-h-0"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ближайшие события</h3>
            <Calendar size={18} className="text-slate-400" />
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2 cursor-auto">
            {data.upcomingEvents.length > 0 ? (
              data.upcomingEvents.map((event, idx) => (
                <div key={`event-${event.type}-${event.date.getTime()}-${idx}`} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0",
                    event.type === 'salary' ? "bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400" : "bg-deposit-100 text-deposit-600 dark:bg-deposit-500/20 dark:text-deposit-400"
                  )}>
                    <span className="text-[8px] font-black uppercase leading-none">{event.date.toLocaleString('ru', { month: 'short' })}</span>
                    <span className="text-base font-black leading-none">{event.date.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-950 dark:text-white truncate">{event.label}</p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {event.type === 'salary' ? 'Зарплата' : 'Вклад'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-950 dark:text-white">{formatVal(event.amount || 0)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 min-h-[100px]">
                <Calendar size={32} strokeWidth={1} />
                <p className="text-sm font-medium">Нет ближайших событий</p>
              </div>
            )}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
