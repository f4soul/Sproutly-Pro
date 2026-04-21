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
    // 1. Deposits + Events
    let totalDepositsAmount = 0;
    const upcomingEvents: { date: Date; type: 'deposit_end' | 'salary'; label: string; amount?: number }[] = [];

    deposits.forEach(d => {
      if (!d.isArchived) {
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

    // 2. Unified finance calculation
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
      const sim = state.simulation;
      const isSimActive = sim?.isActive;
      const salaryMult = isSimActive ? (1 + (sim.salaryIncrease || 0) / 100) : 1;
      const bonusMult = isSimActive ? (sim.bonusMultiplier || 1) : 1;

      yearData.months.forEach((m, index) => {
        const baseSalary = m.salary * salaryMult;
        const base = m.factDays < m.normDays ? baseSalary * (m.factDays / m.normDays) : baseSalary;
        let bonus = 0;
        if (index % 3 === 2) {
          const qIndex = Math.floor(index / 3);
          bonus += (yearData.quarters?.[qIndex]?.bonusAmount || 0) * bonusMult;
        }
        // Add salary payment days to events
        const paymentDate = new Date(selectedYear, index, 10); // Assume 10th of each month
        upcomingEvents.push({
          date: paymentDate,
          type: 'salary',
          label: 'Зарплата',
          amount: base + bonus
        });
      });
    }

    // Insights
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

    // Sort upcoming events
    const now = new Date();
    const sortedEvents = upcomingEvents
      .filter(e => e.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);

    return {
      ...unified,
      limit: unified.depositLimit,
      totalDepositsAmount,
      upcomingEvents: sortedEvents,
      insights
    };
  }, [deposits, selectedYear, taxSettings, state]);

  const incomeChartData = [
    { name: 'Зарплата', value: data.salaryGross, color: '#6366f1' },
    { name: 'Вклады', value: data.depositsIncome, color: '#10b981' },
  ];

  const formatVal = (val: number) => isPrivate ? '••••••' : formatCurrency(val);

  const limitProgress = Math.min(100, (data.depositsIncome / data.limit) * 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full min-w-0">
      {/* Bento Grid */}
      <motion.div 
        id="bento-grid" 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        className="grid grid-cols-1 lg:grid-cols-6 gap-4 lg:auto-rows-[180px]"
      >
        
        {/* Main Capital Card (2/3 width) */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="col-span-1 lg:col-span-4 lg:row-span-2 apple-card p-5 sm:p-8 flex flex-col justify-between bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-600 dark:to-indigo-900 text-white border-none relative overflow-hidden"
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl translate-y-32 -translate-x-32" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 opacity-80">
                <Wallet size={18} />
                <span className="text-sm font-bold uppercase tracking-wider">Чистый капитал (Net)</span>
              </div>
              
              {setIsPrivate && (
                <button 
                  onClick={() => setIsPrivate(!isPrivate)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                  title={isPrivate ? "Показать данные" : "Скрыть данные"}
                >
                  {isPrivate ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
            <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tighter mb-2">
              {formatVal(data.totalNet)}
            </h2>
            <div className="flex items-center gap-2 text-blue-100 font-medium">
              {state.simulation?.isActive ? (
                <>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-white text-[10px] font-bold animate-pulse">
                    SIMULATION
                  </span>
                </>
              ) : (
                <>
                  <ArrowUpRight size={16} />
                  <span>+12.5% к прошлому году</span>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Грязный доход</p>
              <p className="text-xl font-bold">{formatVal(data.totalGross)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Всего налогов</p>
              <p className="text-xl font-bold text-rose-200">{formatVal(data.totalTax)}</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions (Moved up!) */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="col-span-1 lg:col-span-2 lg:row-span-1 grid grid-cols-3 gap-3"
        >
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('app:change-tab', { detail: 'deposits' }))}
            className="apple-card p-2 flex flex-col items-center justify-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Plus size={16} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-500 dark:text-slate-400">Вклад</span>
          </button>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('app:change-tab', { detail: 'ndfl' }))}
            className="apple-card p-2 flex flex-col items-center justify-center gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <TrendingUp size={16} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-500 dark:text-slate-400">Доход</span>
          </button>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('app:change-tab', { detail: 'settings' }))}
            className="apple-card p-2 flex flex-col items-center justify-center gap-1 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform">
              <SettingsIcon size={16} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-500 dark:text-slate-400">Настройки</span>
          </button>
        </motion.div>

        {/* Income Structure Chart */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="col-span-1 lg:col-span-2 lg:row-span-2 apple-card p-6 flex flex-col justify-between min-h-[140px] lg:min-h-0"
        >
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Структура доходов</h3>
          
          {/* Mobile/Tablet Linear Stacked Bar */}
          <div className="lg:hidden space-y-4 mb-2">
            <div className="h-4 w-full bg-[#F5F5F7] dark:bg-white/5 rounded-full flex shadow-inner overflow-hidden">
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
                      className="h-full relative group"
                      style={{ backgroundColor: item.color }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl whitespace-nowrap z-10 pointer-events-none transform group-hover:-translate-y-1">
                        {item.name}: {Math.round(percent)}%
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Desktop Pie Chart */}
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
                <Tooltip 
                  formatter={(value: number) => formatVal(value)}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                />
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
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="col-span-1 lg:col-span-2 lg:row-span-1 apple-card p-6 flex items-center gap-6"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
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
              <span className="text-sm sm:text-lg font-black">{Math.round(limitProgress)}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 truncate">Лимит вкладов</h3>
            <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
              {formatVal(data.depositsIncome)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 truncate">
              из {formatCurrency(data.limit)}
            </p>
          </div>
        </motion.div>

        {/* Total in Deposits */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="col-span-1 lg:col-span-2 lg:row-span-1 apple-card p-6 flex items-center justify-between"
        >
          <div className="min-w-0 pr-2">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 truncate">Во вкладах</h3>
            <p className="text-sm sm:text-xl font-black text-slate-900 dark:text-white truncate">{formatVal(data.totalDepositsAmount)}</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
            <Landmark size={20} />
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
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
                <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all">
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
