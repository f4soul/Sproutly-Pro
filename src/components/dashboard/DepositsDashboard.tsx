import React, { useMemo, Fragment, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Listbox, Transition, Menu } from '@headlessui/react';
import { calculateIncomeByYears, calculateTax } from '../../lib/depositCalculations';
import { getBankDetails } from '../../lib/banks';
import { Deposit, TaxYearSettings, AppSettings } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { TrendingUp, ShieldAlert, ReceiptRussianRuble, Landmark, Download, FileText, Image as ImageIcon, ChevronDown, Check, ArrowDownWideNarrow, ArrowUpNarrowWide, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, exportToImage, exportToXLSX } from '../../services/ExportService';
import { motion, AnimatePresence } from 'motion/react';
import { db, syncWithFirebase } from '../../config/db';
import { StatCard } from './StatCard';
import { BankDetailsModal } from './BankDetailsModal';
import { BankLogo } from '../deposits/BankLogo';
import { PrivacyBlur } from '../ui/PrivacyBlur';

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

  const formatVal = (val: number) => <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(val)}</PrivacyBlur>;

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
      { name: 'Льготный доход', value: Math.min(totalIncome, currentYearSettings.limit), color: '#14b8a6' },
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
    <div 
      className="space-y-6 md:space-y-8 max-w-6xl mx-auto" 
      id="dashboard-content"
    >
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <div>
          <StatCard 
            index={0}
            title="Общий доход" 
            value={<PrivacyBlur isPrivate={isPrivate}>{stats.totalIncome}</PrivacyBlur>} 
            icon={<TrendingUp className="w-4 h-4 text-deposit-600" />}
            description="Все проценты"
          />
        </div>
        <div>
          <StatCard 
            index={1}
            title="Лимит" 
            value={<PrivacyBlur isPrivate={isPrivate}>{currentYearSettings.limit}</PrivacyBlur>} 
            icon={<ShieldAlert className="w-4 h-4 text-amber-600" />}
            description="Необлагаемая сумма"
          />
        </div>
        <div>
          <StatCard 
            index={2}
            title="Налоговая база" 
            value={<PrivacyBlur isPrivate={isPrivate}>{stats.taxableBase}</PrivacyBlur>} 
            icon={<Landmark className="w-4 h-4 text-deposit-600" />}
            description="Сверх лимита"
          />
        </div>
        <div>
          <StatCard 
            index={3}
            title="Налог к уплате" 
            value={<PrivacyBlur isPrivate={isPrivate}>{stats.tax}</PrivacyBlur>} 
            icon={<ReceiptRussianRuble className="w-4 h-4 text-rose-600" />}
            description={`${currentYearSettings.ndflRate}% от базы`}
            highlight={stats.tax > 0}
          />
        </div>
      </div>

      <div 
        className="grid grid-cols-1 xl:grid-cols-8 gap-4 md:gap-6"
      >
        <div className="xl:col-span-5 apple-card p-4 sm:p-6 md:p-8 flex flex-col md:h-[480px] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-8 shrink-0">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">Использование лимита</h3>
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shrink-0",
              limitUsagePercent >= 100 ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" : "bg-deposit-50 text-deposit-600 dark:bg-deposit-500/10 dark:text-deposit-400"
            )}>
              {limitUsagePercent.toFixed(1)}%
            </span>
          </div>
          
          <div className="space-y-6 flex-1 flex flex-col min-h-0">
            <div className="relative h-2 bg-slate-50 dark:bg-slate-800/50 rounded-full shrink-0">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${limitUsagePercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-out",
                  limitUsagePercent >= 100 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "bg-deposit-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]"
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
                  <div className="w-1 h-3 bg-deposit-500 rounded-full" />
                  Вклады, учитываемые в году
                </h4>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[240px] md:max-h-none min-h-0 content-start">
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
                        key={`dashboard-dep-${deposit.id || idx}-${idx}`}
                        className="flex items-center px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 gap-3"
                      >
                        <div 
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 p-1 shadow-sm"
                          style={{ backgroundColor: (bankLogoErrors[deposit.bank] || !bankDetails.logoUrl) ? `${bankDetails.color}15` : undefined }}
                        >
                          {bankDetails.logoUrl && !bankLogoErrors[deposit.bank] ? (
                            <BankLogo
                              logoUrl={bankDetails.logoUrl}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="font-black text-[10px]" style={{ color: bankDetails.color }}>
                              {bankDetails.logoText}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-0.5">
                            <span className="font-bold text-xs text-slate-950 dark:text-white truncate">{deposit.bank}</span>
                            <span className="text-[11px] font-bold text-deposit-500 dark:text-deposit-400 shrink-0">+{formatVal(yearIncome)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
                            <span>{deposit.amount ? formatVal(deposit.amount) : formatVal(0)} • {deposit.rate}%</span>
                            {deposit.endDate && <span>до {new Date(deposit.endDate).toLocaleDateString('ru-RU')}</span>}
                          </div>
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

        <div className="xl:col-span-3 apple-card p-6 gap-6 md:p-8 flex flex-col h-auto xl:h-[480px] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">Структура дохода</h3>
          </div>
          
          {/* Desktop Neon Rings Chart */}
          <div className="hidden xl:flex mt-auto items-center justify-center h-56 w-full relative shrink-0">
            {(() => {
              const total = stats.chartData.reduce((sum, item) => sum + item.value, 0);
              if (total === 0) return (
                <div className="flex w-full h-full items-center justify-center opacity-50 text-slate-400 text-xs font-bold uppercase tracking-widest text-center">
                  Нет данных
                </div>
              );
              
              // We'll show up to 6 rings to prevent overcrowding.
              const maxRings = 6;
              const displayData = stats.chartData.slice(0, maxRings);
              
              return (
                <svg className="w-full h-full max-w-[220px] max-h-[220px] -rotate-90 overflow-visible" viewBox="0 0 200 200">
                  {displayData.map((item, idx) => {
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
              );
            })()}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col justify-center items-center">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-1 z-10">Всего</div>
              <div className="text-[clamp(0.9rem,1vw,1.1rem)] font-bold text-slate-950 dark:text-white leading-tight break-words z-10">{formatCurrency(stats.totalIncome)}</div>
            </div>
          </div>

          <div className="xl:hidden space-y-4">
            <div className="relative h-2 bg-slate-50 dark:bg-slate-800/50 rounded-full">
              <div className="flex w-full h-full rounded-full">
                {stats.chartData.map((item, idx) => (
                  <motion.div
                    key={item.name}
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / stats.totalIncome) * 100}%` }}
                    transition={{ duration: 1, delay: idx * 0.2 }}
                    style={{ 
                      backgroundColor: item.color,
                      boxShadow: `0 0 8px ${item.color}90`
                    }}
                    className="h-full first:rounded-l-full last:rounded-r-full relative z-10"
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <span>0 ₽</span>
              <span>{formatVal(stats.totalIncome)}</span>
            </div>
          </div>

          <div className="space-y-3 xl:mt-auto overflow-y-auto custom-scrollbar min-h-0 shrink-0">
            {stats.chartData.map(item => (
              <div key={item.name} className="flex items-center justify-between p-2 sm:p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 self-center" style={{ backgroundColor: item.color }} />
                  <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight sm:tracking-wide truncate leading-none">{item.name}</span>
                </div>
                <span className="font-bold text-[10px] sm:text-[11px] lg:text-xs text-slate-950 dark:text-white shrink-0 ml-1 sm:ml-2 leading-none">{formatVal(item.value)}</span>
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
    </div>
  );
}

