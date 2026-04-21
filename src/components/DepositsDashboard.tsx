import React, { useMemo, Fragment, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Listbox, Transition, Menu } from '@headlessui/react';
import { calculateIncomeByYears, calculateTax } from '../lib/depositCalculations';
import { getBankDetails } from '../lib/banks';
import { Deposit, TaxYearSettings, AppSettings } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { TrendingUp, ShieldAlert, Receipt, Landmark, Download, FileText, Image as ImageIcon, ChevronDown, Check, ArrowDownWideNarrow, ArrowUpNarrowWide, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, exportToImage, exportToXLSX } from '../services/ExportService';
import { motion, AnimatePresence } from 'motion/react';
import { db, syncWithFirebase } from '../db';
import { StatCard } from './dashboard/StatCard';
import { BankDetailsModal } from './dashboard/BankDetailsModal';

interface DashboardProps {
  deposits: Deposit[];
  taxSettings: TaxYearSettings[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  appSettings: AppSettings;
  isPrivate?: boolean;
}

export function DepositsDashboard({ deposits, taxSettings, selectedYear, onYearChange, appSettings, isPrivate = false }: DashboardProps) {
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [bankLogoErrors, setBankLogoErrors] = useState<Record<string, boolean>>({});

  const formatVal = (val: number) => isPrivate ? '••••••' : formatCurrency(val);

  const currentYearSettings = useMemo(() => 
    taxSettings.find(s => s.year === selectedYear) || { year: selectedYear, limit: 210000, ndflRate: 13 },
    [taxSettings, selectedYear]
  );

  const sortOrder = appSettings.bankSortOrder || 'desc';

  const stats = useMemo(() => {
    let totalIncome = 0;
    const incomeByBank: Record<string, number> = {};

    deposits.forEach(d => {
      const yearIncomes = calculateIncomeByYears(d);
      const yearIncome = yearIncomes.find(yi => yi.year === selectedYear)?.income || 0;
      totalIncome += yearIncome;
      
      if (yearIncome > 0) {
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
      const bankADeposits = deposits.filter(d => {
        if (!d.startDate) return false;
        const startDate = new Date(d.startDate);
        if (isNaN(startDate.getTime())) return false;
        return d.bank === a.name && (startDate.getFullYear() === selectedYear || (d.splitIncome && calculateIncomeByYears(d).some(yi => yi.year === selectedYear)));
      });
      const bankBDeposits = deposits.filter(d => {
        if (!d.startDate) return false;
        const startDate = new Date(d.startDate);
        if (isNaN(startDate.getTime())) return false;
        return d.bank === b.name && (startDate.getFullYear() === selectedYear || (d.splitIncome && calculateIncomeByYears(d).some(yi => yi.year === selectedYear)));
      });
      
      const minDateA = bankADeposits.length > 0 ? Math.min(...bankADeposits.map(d => new Date(d.startDate).getTime())) : Infinity;
      const minDateB = bankBDeposits.length > 0 ? Math.min(...bankBDeposits.map(d => new Date(d.startDate).getTime())) : Infinity;
      
      return sortOrder === 'desc' ? minDateB - minDateA : minDateA - minDateB;
    });
  }, [stats.bankData, sortOrder, deposits, selectedYear]);

  const selectedBankDeposits = useMemo(() => {
    if (!selectedBank) return [];
    return deposits.filter(d => d.bank === selectedBank && calculateIncomeByYears(d).some(yi => yi.year === selectedYear && yi.income > 0));
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-6 md:space-y-8 max-w-5xl mx-auto" 
      id="dashboard-content"
    >
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 md:gap-4">
        <StatCard 
          index={0}
          title="Общий доход" 
          value={formatVal(stats.totalIncome)} 
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          description="Все проценты"
        />
        <StatCard 
          index={1}
          title="Лимит" 
          value={formatVal(currentYearSettings.limit)} 
          icon={<ShieldAlert className="w-4 h-4 text-amber-600" />}
          description="Необлагаемая сумма"
        />
        <StatCard 
          index={2}
          title="Налоговая база" 
          value={formatVal(stats.taxableBase)} 
          icon={<Landmark className="w-4 h-4 text-teal-600" />}
          description="Сверх лимита"
        />
        <StatCard 
          index={3}
          title="Налог к уплате" 
          value={formatVal(stats.tax)} 
          icon={<Receipt className="w-4 h-4 text-rose-600" />}
          description={`${currentYearSettings.ndflRate}% от базы`}
          highlight={stats.tax > 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-8 gap-4 md:gap-6">
        <div className="xl:col-span-5 apple-card p-6 md:p-8 flex flex-col h-auto xl:h-[480px] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-8 shrink-0">
            <h3 className="font-bold text-lg text-light-text-primary dark:text-dark-text-primary">Использование лимита</h3>
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shrink-0",
              limitUsagePercent >= 100 ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
            )}>
              {limitUsagePercent.toFixed(1)}%
            </span>
          </div>
          
          <div className="space-y-6 flex-1 flex flex-col min-h-0">
            <div className="relative h-2 bg-[#F5F5F7] dark:bg-white/5 rounded-full overflow-hidden shrink-0">
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
            
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary shrink-0">
              <span>0 ₽</span>
              <span>{formatVal(currentYearSettings.limit)}</span>
            </div>

            <div className="pt-8 border-t border-light-border dark:border-dark-border flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h4 className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                  Распределение по банкам
                </h4>
                <button 
                  onClick={toggleSortOrder}
                  className="p-2 rounded-xl hover:bg-[#F5F5F7] dark:hover:bg-white/5 text-light-text-secondary dark:text-dark-text-secondary transition-colors cursor-pointer"
                >
                  {sortOrder === 'desc' ? <ArrowDownWideNarrow className="w-4 h-4 stroke-[1.5px]" /> : <ArrowUpNarrowWide className="w-4 h-4 stroke-[1.5px]" />}
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[240px] lg:max-h-none min-h-0 content-start">
                <AnimatePresence mode="popLayout">
                  {sortedBankData.length > 0 ? sortedBankData.map((bank, idx) => {
                    const bankDetails = getBankDetails(bank.name);
                    return (
                      <motion.button 
                        key={bank.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => setSelectedBank(bank.name)}
                        className="flex items-center justify-between gap-3 px-3 py-1 rounded-xl bg-[#F5F5F7] dark:bg-white/5 border border-light-border dark:border-dark-border hover:border-blue-500/30 hover:bg-white dark:hover:bg-dark-card transition-all group cursor-pointer h-fit"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div 
                            className="w-5 h-5 rounded-md bg-white dark:bg-dark-card flex items-center justify-center overflow-hidden shrink-0 border border-light-border dark:border-dark-border p-0.5 shadow-sm"
                            style={{ backgroundColor: (bankLogoErrors[bank.name] || !bankDetails.logoUrl) ? `${bankDetails.color}15` : undefined }}
                          >
                            {bankDetails.logoUrl && !bankLogoErrors[bank.name] ? (
                              <img 
                                src={bankDetails.logoUrl} 
                                alt="" 
                                className="w-full h-full object-contain" 
                                referrerPolicy="no-referrer"
                                onError={() => setBankLogoErrors(prev => ({ ...prev, [bank.name]: true }))}
                              />
                            ) : (
                              <span className="font-black text-[8px]" style={{ color: bankDetails.color }}>
                                {bankDetails.logoText}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-[11px] text-light-text-primary dark:text-dark-text-primary truncate">{bank.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary shrink-0">{formatVal(bank.value)}</span>
                      </motion.button>
                    );
                  }) : (
                    <p className="text-light-text-secondary dark:text-dark-text-secondary italic text-xs w-full text-center py-4 col-span-full">Нет данных</p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 apple-card p-6 md:p-8 flex flex-col h-auto xl:h-[480px] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <h3 className="font-bold text-lg text-light-text-primary dark:text-dark-text-primary mb-6 md:mb-8 shrink-0">Структура дохода</h3>
          
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
              <div className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-[0.2em] mb-1">Всего</div>
              <div className="text-[clamp(1rem,1.45vw,1.25rem)] font-bold text-light-text-primary dark:text-dark-text-primary leading-tight break-words">{formatCurrency(stats.totalIncome)}</div>
            </div>
          </div>

          <div className="xl:hidden space-y-4 mb-6">
            <div className="relative h-2 bg-[#F5F5F7] dark:bg-white/5 rounded-full overflow-hidden">
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
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-light-text-secondary dark:text-dark-text-secondary">
              <span>0 ₽</span>
              <span>{formatVal(stats.totalIncome)}</span>
            </div>
          </div>

          <div className="space-y-3 mt-auto">
            {stats.chartData.map(item => (
              <div key={item.name} className="flex items-center justify-between p-2 sm:p-3 rounded-2xl bg-[#F5F5F7]/50 dark:bg-white/5 border border-transparent hover:border-blue-500/20 transition-all">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 self-center" style={{ backgroundColor: item.color }} />
                  <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-tight sm:tracking-wide truncate leading-none">{item.name}</span>
                </div>
                <span className="font-bold text-[10px] sm:text-[11px] lg:text-xs text-light-text-primary dark:text-dark-text-primary shrink-0 ml-1 sm:ml-2 leading-none">{formatVal(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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

