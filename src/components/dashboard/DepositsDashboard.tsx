import React, { useMemo, Fragment, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Listbox, Transition, Menu } from '@headlessui/react';
import { calculateIncomeByYears, calculateTax } from '../../lib/depositCalculations';
import { getBankDetails } from '../../lib/banks';
import { Deposit, TaxYearSettings, AppSettings } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { TrendingUp, ShieldAlert, Receipt, Landmark, Download, FileText, Image as ImageIcon, ChevronDown, Check, ArrowDownWideNarrow, ArrowUpNarrowWide, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, exportToImage, exportToXLSX } from '../../services/ExportService';
import { motion, AnimatePresence } from 'motion/react';
import { db, syncWithFirebase } from '../../config/db';
import { StatCard } from './StatCard';
import { BankDetailsModal } from './BankDetailsModal';

interface DashboardProps {
  deposits: Deposit[];
  taxSettings: TaxYearSettings[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  appSettings: AppSettings;
  isPrivate?: boolean;
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

export function DepositsDashboard({ deposits, taxSettings, selectedYear, onYearChange, appSettings, isPrivate = false }: DashboardProps) {
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [bankLogoErrors, setBankLogoErrors] = useState<Record<string, boolean>>({});

  const formatVal = (val: number) => isPrivate ? '••••••' : formatCurrency(val);

  const currentYearSettings = useMemo(() => 
    taxSettings.find(s => Number(s.year) === Number(selectedYear)) || { year: Number(selectedYear), limit: 210000, ndflRate: 13 },
    [taxSettings, selectedYear]
  );

  const sortOrder = appSettings.bankSortOrder || 'desc';

  const stats = useMemo(() => {
    let totalIncome = 0;
    const incomeByBank: Record<string, number> = {};

    deposits.forEach(d => {
      if (d.isArchived) return;
      
      const startDate = d.startDate ? new Date(d.startDate) : null;
      const endDate = d.endDate ? new Date(d.endDate) : null;
      
      let isRelevant = false;
      if (startDate && endDate) {
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        isRelevant = selectedYear >= startYear && selectedYear <= endYear;
      } else {
        isRelevant = true; // If no dates, consider it relevant
      }

      const yearIncomes = calculateIncomeByYears(d);
      const yearIncome = yearIncomes.find(yi => Number(yi.year) === Number(selectedYear))?.income || 0;
      
      if (isRelevant || yearIncome > 0) {
        totalIncome += yearIncome;
        incomeByBank[d.bank] = (incomeByBank[d.bank] || 0) + yearIncome;
      }
    });

    const taxableBase = Math.max(0, totalIncome - currentYearSettings.limit);
    const tax = calculateTax(totalIncome, currentYearSettings.limit, currentYearSettings.ndflRate);

    const chartData = [
      { name: 'Льготный доход', value: Math.min(totalIncome, currentYearSettings.limit), color: '#10b981' },
      { name: 'Облагаемый доход', value: taxableBase, color: '#f43f5e' },
    ];

    const bankData = Object.entries(incomeByBank).map(([name, value]) => ({ name, value }));

    return { totalIncome, taxableBase, tax, chartData, bankData };
  }, [deposits, selectedYear, currentYearSettings]);

  const sortedBankData = useMemo(() => {
    return [...stats.bankData].sort((a, b) => {
      // Sort by earliest deposit date in that bank
      const filterFn = (d: Deposit, bankName: string) => {
        if (d.isArchived) return false;
        if (d.bank !== bankName) return false;
        if (!d.startDate || !d.endDate) return true;
        const startDate = new Date(d.startDate);
        const endDate = new Date(d.endDate);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
        return Number(selectedYear) >= startDate.getFullYear() && Number(selectedYear) <= endDate.getFullYear();
      };

      const bankADeposits = deposits.filter(d => filterFn(d, a.name));
      const bankBDeposits = deposits.filter(d => filterFn(d, b.name));
      
      const minDateA = bankADeposits.length > 0 ? Math.min(...bankADeposits.map(d => new Date(d.startDate).getTime())) : Infinity;
      const minDateB = bankBDeposits.length > 0 ? Math.min(...bankBDeposits.map(d => new Date(d.startDate).getTime())) : Infinity;
      
      return sortOrder === 'desc' ? minDateB - minDateA : minDateA - minDateB;
    });
  }, [stats.bankData, sortOrder, deposits, selectedYear]);

  const selectedBankDeposits = useMemo(() => {
    if (!selectedBank) return [];
    return deposits.filter(d => {
      if (d.isArchived || d.bank !== selectedBank) return false;
      const startDate = d.startDate ? new Date(d.startDate) : null;
      const endDate = d.endDate ? new Date(d.endDate) : null;
      let isRelevant = false;
      if (startDate && endDate) {
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
        isRelevant = selectedYear >= startDate.getFullYear() && selectedYear <= endDate.getFullYear();
      } else {
        isRelevant = true;
      }
      const yearIncomes = calculateIncomeByYears(d);
      const hasIncome = yearIncomes.some(yi => Number(yi.year) === Number(selectedYear) && yi.income > 0);
      return isRelevant || hasIncome;
    });
  }, [deposits, selectedBank, selectedYear]);

  const toggleSortOrder = async () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    await db.appSettings.update('main', { bankSortOrder: newOrder });
    syncWithFirebase();
  };

  const years = useMemo(() => {
    const yearsSet = new Set([new Date().getFullYear(), 2024, 2025]);
    deposits.forEach(d => {
      if (d.startDate) {
        const startDate = new Date(d.startDate);
        if (!isNaN(startDate.getTime())) {
          yearsSet.add(startDate.getFullYear());
        }
      }
      if (d.endDate) {
        const endDate = new Date(d.endDate);
        if (!isNaN(endDate.getTime())) {
          yearsSet.add(endDate.getFullYear());
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [deposits]);

  const limitUsagePercent = Math.min(100, (stats.totalIncome / currentYearSettings.limit) * 100);

  return (
    <motion.div 
      variants={DASHBOARD_CONTAINER_VARIANTS}
      className="space-y-6 md:space-y-8 max-w-6xl mx-auto" 
      id="dashboard-content"
    >
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <motion.div variants={DASHBOARD_ITEM_VARIANTS}>
          <StatCard 
            index={0}
            title="Общий доход" 
            value={formatVal(stats.totalIncome)} 
            icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
            description="Все проценты"
          />
        </motion.div>
        <motion.div variants={DASHBOARD_ITEM_VARIANTS}>
          <StatCard 
            index={1}
            title="Лимит" 
            value={formatVal(currentYearSettings.limit)} 
            icon={<ShieldAlert className="w-4 h-4 text-amber-600" />}
            description="Необлагаемая сумма"
          />
        </motion.div>
        <motion.div variants={DASHBOARD_ITEM_VARIANTS}>
          <StatCard 
            index={2}
            title="Налоговая база" 
            value={formatVal(stats.taxableBase)} 
            icon={<Landmark className="w-4 h-4 text-teal-600" />}
            description="Сверх лимита"
          />
        </motion.div>
        <motion.div variants={DASHBOARD_ITEM_VARIANTS}>
          <StatCard 
            index={3}
            title="Налог к уплате" 
            value={formatVal(stats.tax)} 
            icon={<Receipt className="w-4 h-4 text-rose-600" />}
            description={`${currentYearSettings.ndflRate}% от базы`}
            highlight={stats.tax > 0}
          />
        </motion.div>
      </div>

      <motion.div 
        variants={DASHBOARD_ITEM_VARIANTS}
        className="grid grid-cols-1 xl:grid-cols-8 gap-4 md:gap-6"
      >
        <div className="xl:col-span-5 apple-card p-6 md:p-8 flex flex-col h-auto xl:h-[480px] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-8 shrink-0">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Использование лимита</h3>
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shrink-0",
              limitUsagePercent >= 100 ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
            )}>
              {limitUsagePercent.toFixed(1)}%
            </span>
          </div>
          
          <div className="space-y-6 flex-1 flex flex-col min-h-0">
            <div className="relative h-2 bg-slate-50 dark:bg-slate-800/50 rounded-full overflow-hidden shrink-0">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${limitUsagePercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-out",
                  limitUsagePercent >= 100 ? "bg-rose-500" : "bg-blue-600"
                )}
              />
            </div>
            
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 shrink-0">
              <span>0 ₽</span>
              <span>{formatVal(currentYearSettings.limit)}</span>
            </div>

            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                  Вклады, учитываемые в году
                </h4>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[240px] lg:max-h-none min-h-0 content-start">
                <AnimatePresence mode="popLayout">
                  {deposits.filter(d => {
                    if (d.isArchived) return false;
                    const yi = calculateIncomeByYears(d).find(y => Number(y.year) === Number(selectedYear));
                    return !!yi && yi.income > 0;
                  }).length > 0 ? deposits.filter(d => {
                    if (d.isArchived) return false;
                    const yi = calculateIncomeByYears(d).find(y => Number(y.year) === Number(selectedYear));
                    return !!yi && yi.income > 0;
                  }).map((deposit, idx) => {
                    const bankDetails = getBankDetails(deposit.bank);
                    const yearIncome = calculateIncomeByYears(deposit).find(y => Number(y.year) === Number(selectedYear))?.income || 0;
                    return (
                      <div 
                        key={deposit.id || idx}
                        className="flex flex-col px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div 
                              className="w-5 h-5 rounded-md bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 p-0.5 shadow-sm"
                              style={{ backgroundColor: (bankLogoErrors[deposit.bank] || !bankDetails.logoUrl) ? `${bankDetails.color}15` : undefined }}
                            >
                              {bankDetails.logoUrl && !bankLogoErrors[deposit.bank] ? (
                                <img 
                                  src={bankDetails.logoUrl} 
                                  alt="" 
                                  className="w-full h-full object-contain" 
                                  referrerPolicy="no-referrer"
                                  onError={() => setBankLogoErrors(prev => ({ ...prev, [deposit.bank]: true }))}
                                />
                              ) : (
                                <span className="font-black text-[8px]" style={{ color: bankDetails.color }}>
                                  {bankDetails.logoText}
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-[11px] text-slate-900 dark:text-white truncate">{deposit.bank}</span>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-500 dark:text-emerald-400 shrink-0">+{formatVal(yearIncome)}</span>
                        </div>
                        <div className="flex justify-between items-center pl-7 text-[9px] text-slate-500 dark:text-slate-400">
                          <span>{deposit.amount ? formatVal(deposit.amount) : '0 ₽'} • {deposit.rate}%</span>
                          {deposit.endDate && <span>до {new Date(deposit.endDate).toLocaleDateString('ru-RU')}</span>}
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-slate-500 dark:text-slate-400 italic text-xs w-full text-center py-4 col-span-full">Нет данных</p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 apple-card p-6 md:p-8 flex flex-col h-auto xl:h-[480px] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-6 md:mb-8 shrink-0">Структура дохода</h3>
          
          {/* Desktop Pie Chart */}
          <div className="hidden xl:block h-56 w-full relative mb-8 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={105}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {stats.chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none w-full px-4">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-1">Всего</div>
              <div className="text-[clamp(1rem,1.45vw,1.25rem)] font-bold text-slate-900 dark:text-white leading-tight break-words">{formatCurrency(stats.totalIncome)}</div>
            </div>
          </div>

          <div className="xl:hidden space-y-4 mb-6">
            <div className="relative h-2 bg-slate-50 dark:bg-slate-800/50 rounded-full overflow-hidden">
              <div className="flex h-full rounded-full overflow-hidden">
                {stats.chartData.map((item, idx) => (
                  <motion.div
                    key={item.name}
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / stats.totalIncome) * 100}%` }}
                    transition={{ duration: 1, delay: idx * 0.2 }}
                    style={{ backgroundColor: item.color }}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <span>0 ₽</span>
              <span>{formatVal(stats.totalIncome)}</span>
            </div>
          </div>

          <div className="space-y-3 mt-auto">
            {stats.chartData.map(item => (
              <div key={item.name} className="flex items-center justify-between p-2 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 self-center" style={{ backgroundColor: item.color }} />
                  <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight sm:tracking-wide truncate leading-none">{item.name}</span>
                </div>
                <span className="font-bold text-[10px] sm:text-[11px] lg:text-xs text-slate-900 dark:text-white shrink-0 ml-1 sm:ml-2 leading-none">{formatVal(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <BankDetailsModal 
        selectedBank={selectedBank}
        selectedYear={selectedYear}
        onClose={() => setSelectedBank(null)}
        bankData={stats.bankData}
        selectedBankDeposits={selectedBankDeposits}
      />
    </motion.div>
  );
}

