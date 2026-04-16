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
}

export function BentoDashboard({ deposits, taxSettings, appSettings }: BentoDashboardProps) {
  const { state } = useAppState();
  const [selectedYear, setSelectedYear] = useState<number>(state.activeYear);
  const [isPrivate, setIsPrivate] = useState(false);

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
    const unified = calculateUnifiedFinance({
      selectedYear,
      yearData,
      deposits,
      taxSettings,
      taxBrackets: state.taxBrackets,
      simulation: state.simulation
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex justify-between items-end px-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Дашборд</h1>
          <div className="flex items-center gap-2">
            <p className="text-slate-500 dark:text-slate-400 font-medium">Ваш финансовый обзор за {selectedYear} год</p>
            {state.simulation?.isActive && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold animate-pulse">
                SIMULATION
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsPrivate(!isPrivate)}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:text-blue-600 transition-colors"
          >
            {isPrivate ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          <button 
            onClick={async () => {
              const success = await exportToPDF('bento-grid', {
                totalGross: data.totalGross,
                totalNet: data.totalNet,
                totalTax: data.totalTax,
                effectiveRate: (data.totalTax / data.totalGross) * 100
              });
              if (success) {
                window.dispatchEvent(new CustomEvent('app:toast', { 
                  detail: { message: 'Дашборд экспортирован в PDF', type: 'success' } 
                }));
              }
            }}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:text-blue-600 transition-colors"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

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
        className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 md:auto-rows-[180px]"
      >
        
        {/* Main Capital Card (2/3 width) */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="md:col-span-4 lg:col-span-4 row-span-2 apple-card p-8 flex flex-col justify-between bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-600 dark:to-indigo-900 text-white border-none"
        >
          <div>
            <div className="flex items-center gap-2 opacity-80 mb-1">
              <Wallet size={18} />
              <span className="text-sm font-bold uppercase tracking-wider">Чистый капитал (Net)</span>
            </div>
            <h2 className="text-5xl font-black tracking-tighter mb-2">
              {formatVal(data.totalNet)}
            </h2>
            <div className="flex items-center gap-2 text-blue-100 font-medium">
              <ArrowUpRight size={16} />
              <span>+12.5% к прошлому году</span>
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

        {/* Tax Limit Progress (1/3 width) */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="md:col-span-2 lg:col-span-2 row-span-1 apple-card p-6 flex items-center gap-6"
        >
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90">
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
              <span className="text-lg font-black">{Math.round(limitProgress)}%</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Лимит вкладов</h3>
            <p className="text-base font-black text-slate-900 dark:text-white">
              {formatVal(data.depositsIncome)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              из {formatCurrency(data.limit)}
            </p>
          </div>
        </motion.div>

        {/* Total in Deposits (1/3 width, under Limit) */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="md:col-span-2 lg:col-span-2 row-span-1 apple-card p-6 flex items-center justify-between"
        >
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Всего во вкладах</h3>
            <p className="text-xl font-black text-slate-900 dark:text-white">{formatVal(data.totalDepositsAmount)}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <Landmark size={20} />
          </div>
        </motion.div>

        {/* Income Structure Chart (1/3 width) */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="md:col-span-2 lg:col-span-2 row-span-2 apple-card p-6 flex flex-col"
        >
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Структура доходов</h3>
          <div className="flex-1 min-h-0">
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
          <div className="space-y-2 mt-4">
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

        {/* Upcoming Events (2/3 width) */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="md:col-span-2 lg:col-span-4 row-span-2 apple-card p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ближайшие события</h3>
            <Calendar size={18} className="text-slate-400" />
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
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
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <Calendar size={32} strokeWidth={1} />
                <p className="text-sm font-medium">Нет ближайших событий</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions (1/3 width) */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="md:col-span-2 lg:col-span-2 row-span-1 grid grid-cols-3 gap-3"
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

        {/* Smart Insights Card (2/3 width) */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -4 }}
          className="md:col-span-2 lg:col-span-4 row-span-1 apple-card p-6 bg-slate-900 text-white border-none flex items-center gap-6 overflow-hidden relative"
        >
          <div className="relative z-10 flex-1 flex items-center gap-6">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
              <Shield size={24} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {data.insights.slice(0, 2).map((insight, idx) => (
                <div key={idx} className="space-y-0.5">
                  <h4 className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    insight.type === 'warning' ? "text-rose-400" : "text-blue-400"
                  )}>
                    {insight.title}
                  </h4>
                  <p className="text-[10px] text-slate-300 leading-tight truncate">{insight.text}</p>
                </div>
              ))}
              {data.insights.length === 0 && (
                <div className="col-span-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Всё под контролем</h4>
                  <p className="text-[10px] text-slate-300 leading-tight">Ваша налоговая стратегия оптимальна.</p>
                </div>
              )}
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl" />
        </motion.div>

      </motion.div>
    </div>
  );
}
