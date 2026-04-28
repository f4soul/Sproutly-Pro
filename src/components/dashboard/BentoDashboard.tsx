import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
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
  Shield
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
import { exportToPDF } from '../../services/ExportService';

import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { AnimatedPercentage } from '../ui/AnimatedPercentage';

interface BentoDashboardProps {
  deposits: Deposit[];
  taxSettings: TaxYearSettings[];
  appSettings: AppSettings;
  isPrivate?: boolean;
  setIsPrivate?: (val: boolean) => void;
}

const DASHBOARD_CONTAINER_VARIANTS = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const DASHBOARD_ITEM_VARIANTS = {
  hidden: { opacity: 1, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
} as const;

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
      totalDepositsAmount += d.amount;

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
    const includeDeposits = appSettings.incomeCalculationMode === 'combined';
    const unified = calculateUnifiedFinance({
      selectedYear,
      yearData,
      deposits,
      taxSettings,
      taxBrackets: state.taxBrackets,
      simulation: state.simulation,
      includeDeposits
    });

    if (yearData) {
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

    if (state.simulation?.isActive) {
      insights.unshift({
        title: "Режим симуляции",
        text: "Вы видите прогнозные данные. Оклад +" + state.simulation.salaryIncrease + "%, премии x" + state.simulation.bonusMultiplier,
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
      netDiffPercent
    };
  }, [deposits, selectedYear, taxSettings, state]);

  const incomeChartData = [
    { name: 'Зарплата', value: data.salaryGross, color: '#6366f1' },
    { name: 'Вклады', value: data.depositsIncome, color: '#10b981' },
  ];

  const formatVal = (val: number) => isPrivate ? '••••••' : <AnimatedCurrency value={val} />;
  const formatValPlain = (val: number) => isPrivate ? '••••••' : formatCurrency(val);
  const limitProgress = Math.min(100, (data.depositsIncome / data.limit) * 100);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 w-full min-w-0">
      {/* Bento Grid */}
      <motion.div 
        id="bento-grid" 
        variants={DASHBOARD_CONTAINER_VARIANTS}
        className="grid grid-cols-1 lg:grid-cols-6 gap-4 lg:auto-rows-[180px]"
      >
        
        {/* Main Capital Card (2/3 width) */}
        <motion.div 
          variants={DASHBOARD_ITEM_VARIANTS}
          whileHover={{ y: -4 }}
          className="col-span-1 lg:col-span-4 lg:row-span-2 apple-card p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group"
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl -translate-y-32 translate-x-32 transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl translate-y-32 -translate-x-32 transition-transform duration-700 group-hover:scale-110" />
          
          {/* Decorative Year Background */}
          <div className="absolute -right-6 -bottom-12 select-none pointer-events-none transition-all duration-700 overflow-hidden">
            <motion.span 
              key={selectedYear}
              initial={{ opacity: 0, scale: 0.8, x: 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="text-[160px] font-black leading-none tracking-tighter whitespace-nowrap text-slate-100 dark:text-slate-800/50"
            >
              {selectedYear}
            </motion.span>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className="text-indigo-500 dark:text-indigo-400" />
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
            <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tighter mb-2 text-slate-900 dark:text-white">
              {formatVal(data.totalNet)}
            </h2>
            <div className="flex items-center gap-2 font-medium">
              {state.simulation?.isActive ? (
                <>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold animate-pulse">
                    SIMULATION
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  {data.netDiffPercent! >= 0 ? (
                    <ArrowUpRight size={16} className="text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <ArrowDownRight size={16} className="text-rose-500 dark:text-rose-400" />
                  )}
                  <AnimatedPercentage 
                    value={data.netDiffPercent!} 
                    showPlus={true} 
                    className={cn(
                      "font-bold",
                      data.netDiffPercent! >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}
                  />
                  <span className="text-sm text-slate-500 dark:text-slate-400">к прошлому году</span>
                </div>
              )}
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

        {/* Quick Actions */}
        <motion.div 
          variants={DASHBOARD_ITEM_VARIANTS}
          whileHover={{ y: -4 }}
          className="col-span-1 lg:col-span-2 lg:row-span-1 grid grid-cols-3 gap-3"
        >
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('app:change-tab', { detail: 'deposits' }))}
            className="apple-card p-2 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-[0_16px_40px_rgba(0,0,0,0.05)] transition-all group"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-100/80 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:scale-110 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all duration-300">
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Вклад</span>
          </button>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('app:change-tab', { detail: 'ndfl' }))}
            className="apple-card p-2 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-[0_16px_40px_rgba(0,0,0,0.05)] transition-all group"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-100/80 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:scale-110 group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-all duration-300">
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Доход</span>
          </button>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('app:change-tab', { detail: 'settings' }))}
            className="apple-card p-2 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-[0_16px_40px_rgba(0,0,0,0.05)] transition-all group"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-100/80 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:scale-110 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-all duration-300">
              <SettingsIcon size={18} strokeWidth={2.5} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Опции</span>
          </button>
        </motion.div>

        {/* Income Structure Chart */}
        <motion.div 
          variants={DASHBOARD_ITEM_VARIANTS}
          whileHover={{ y: -4 }}
          className="col-span-1 lg:col-span-2 lg:row-span-2 apple-card p-6 flex flex-col justify-between min-h-[140px] lg:min-h-0"
        >
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Структура доходов</h3>
          
          <div className="lg:hidden space-y-4 mb-2">
            <div className="h-4 w-full bg-slate-50 dark:bg-slate-800/50 rounded-full flex shadow-inner overflow-hidden">
              {(() => {
                const total = incomeChartData.reduce((sum, item) => sum + item.value, 0);
                if (total === 0) return null;
                return incomeChartData.map((item, idx) => {
                  const percent = (item.value / total) * 100;
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 }}
                      className="h-full relative"
                      style={{ backgroundColor: item.color }}
                    />
                  );
                });
              })()}
            </div>
          </div>

          <div className="hidden lg:block flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incomeChartData}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {incomeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-auto">
            {incomeChartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{item.name}</span>
                </div>
                <span className="text-[10px] font-black text-slate-900 dark:text-white">{formatVal(item.value)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tax Limit Progress */}
        <motion.div 
          variants={DASHBOARD_ITEM_VARIANTS}
          whileHover={{ y: -4 }}
          className="col-span-1 lg:col-span-2 lg:row-span-1 apple-card p-4 sm:p-6 flex items-center gap-3 sm:gap-6 min-w-0"
        >
          <div className="relative w-14 h-14 sm:w-20 sm:h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-slate-100 dark:text-slate-800"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={213.6}
                strokeDashoffset={213.6 - (213.6 * limitProgress) / 100}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-1000",
                  limitProgress > 90 ? "text-rose-500" : limitProgress > 70 ? "text-orange-500" : "text-emerald-500"
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] sm:text-lg font-black">{Math.round(limitProgress)}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Лимит вкладов</h3>
            <p className="text-xs sm:text-base font-black text-slate-900 dark:text-white truncate">
              {formatVal(data.depositsIncome)}
            </p>
            <p className="text-[8px] sm:text-[10px] text-slate-500 mt-0.5 sm:mt-1 truncate opacity-80">
              из {formatCurrency(data.limit)}
            </p>
          </div>
        </motion.div>

        {/* Total in Deposits */}
        <motion.div 
          variants={DASHBOARD_ITEM_VARIANTS}
          whileHover={{ y: -4 }}
          className="col-span-1 lg:col-span-2 lg:row-span-1 apple-card p-4 sm:p-6 flex items-center justify-between gap-2 min-w-0"
        >
          <div className="min-w-0 flex-1 overflow-hidden">
            <h3 className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1 truncate">Во вкладах</h3>
            <p className="text-sm sm:text-xl font-black text-slate-900 dark:text-white truncate">{formatVal(data.totalDepositsAmount)}</p>
          </div>
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
            <Landmark size={20} className="sm:w-6 sm:h-6" />
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div 
          variants={DASHBOARD_ITEM_VARIANTS}
          whileHover={{ y: -4 }}
          className="col-span-1 lg:col-span-6 lg:row-span-2 apple-card p-6 flex flex-col min-h-[300px] lg:min-h-0"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ближайшие события</h3>
            <Calendar size={18} className="text-slate-400" />
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2 cursor-auto">
            {data.upcomingEvents.length > 0 ? (
              data.upcomingEvents.map((event, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0",
                    event.type === 'salary' ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                  )}>
                    <span className="text-[8px] font-black uppercase leading-none">{event.date.toLocaleString('ru', { month: 'short' })}</span>
                    <span className="text-base font-black leading-none">{event.date.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{event.label}</p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {event.type === 'salary' ? 'Зарплата' : 'Вклад'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900 dark:text-white">{formatVal(event.amount || 0)}</p>
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
