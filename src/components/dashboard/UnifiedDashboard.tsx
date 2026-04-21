import React, { useState, useMemo } from 'react';
import { LayoutDashboard, TrendingUp, Landmark, PieChart as PieChartIcon, BarChart3, ChevronDown, Eye, EyeOff, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BentoDashboard } from './BentoDashboard';
import { DepositsDashboard } from '../DepositsDashboard';
import { ChartsSection } from '../ChartsSection';
import { YearSummary } from '../YearSummary';
import { Deposit, TaxYearSettings, AppSettings, AppState } from '../../types';
import { calculateProgressiveTaxDetailed } from '../../lib/taxCalculator';
import { calculateYearTotals } from '../../lib/helpers';
import { cn } from '../../lib/utils';
import { useAppState } from '../../hooks/useAppState';

interface UnifiedDashboardProps {
  deposits: Deposit[];
  taxSettings: TaxYearSettings[];
  appSettings: AppSettings;
  isPrivate: boolean;
  setIsPrivate: (val: boolean) => void;
}

type SubTab = 'dashboard' | 'income' | 'deposits';

export function UnifiedDashboard({ deposits, taxSettings, appSettings, isPrivate, setIsPrivate }: UnifiedDashboardProps) {
  const { state } = useAppState();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('dashboard');
  const [selectedYear, setSelectedYear] = useState<number>(state.activeYear);

  const activeYearData = state.years[selectedYear] || state.years[state.activeYear];

  const calculatedMonths = useMemo(() => {
    if (!activeYearData) return [];
    return activeYearData.months.map((m, index) => {
      const base = m.factDays < m.normDays ? m.salary * (m.factDays / m.normDays) : m.salary;
      let bonus = 0;
      if (index % 3 === 2) {
        const qIndex = Math.floor(index / 3);
        bonus += activeYearData.quarters?.[qIndex]?.bonusAmount || 0;
      }
      const gross = base + bonus;
      return { ...m, gross };
    });
  }, [activeYearData]);

  const yearlyTotals = useMemo(() => {
    if (!activeYearData) return null;
    const totalGrossMonths = calculatedMonths.reduce((sum, m) => sum + m.gross, 0);
    const totalGross = totalGrossMonths + (activeYearData.annualBonusAmount || 0) + (activeYearData.extraBonusAmount || 0) + (activeYearData.additionalIncome || 0);
    const { tax: progressiveTax, brackets } = calculateProgressiveTaxDetailed(totalGross, selectedYear, state.taxBrackets);
    const finalNet = totalGross - progressiveTax;
    const effectiveRate = totalGross > 0 ? (progressiveTax / totalGross) * 100 : 0;
    return { totalGross, progressiveTax, finalNet, effectiveRate, brackets };
  }, [calculatedMonths, activeYearData, selectedYear, state.taxBrackets]);

  const tabs = [
    { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { id: 'income', label: 'Анализ Доходов', icon: TrendingUp },
    { id: 'deposits', label: 'Анализ Вкладов', icon: Landmark },
  ];

  return (
    <div id="unified-dashboard-content" className="space-y-6 lg:space-y-8 w-full min-w-0 flex flex-col">
      {/* Header Section with Toggles (Removed by request) */}
      {state.simulation?.isActive && (
        <div className="flex justify-end mb-2 w-full">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl border border-emerald-500/20 w-fit">
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hidden lg:inline">Simulation</span>
          </div>
        </div>
      )}

      {/* Sub-navigation Tabs (Segmented Control) */}
      <div className="flex items-center bg-[#F5F5F7] dark:bg-slate-800/50 p-1 rounded-xl w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as SubTab)}
            className={cn(
              "flex-1 relative flex items-center justify-center gap-1.5 py-2.5 text-[10px] xl:text-xs font-bold rounded-lg transition-all",
              activeSubTab === tab.id
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <tab.icon size={14} className={cn("shrink-0 transition-colors", activeSubTab === tab.id ? "opacity-100" : "opacity-60")} />
            <span className="uppercase tracking-widest truncate max-w-[80px] sm:max-w-none">{tab.label}</span>
            {activeSubTab === tab.id && (
              <motion.div 
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg -z-10 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {activeSubTab === 'dashboard' && (
            <BentoDashboard 
              deposits={deposits} 
              taxSettings={taxSettings} 
              appSettings={appSettings} 
              isPrivate={isPrivate}
              setIsPrivate={setIsPrivate}
            />
          )}

          {activeSubTab === 'income' && yearlyTotals && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-1 space-y-6">
                <YearSummary 
                  yearlyTotals={yearlyTotals as any} 
                  netDiff={null} 
                  grossDiff={null} 
                  prevYear={null} 
                  handleCopy={() => {}} 
                  isPrivate={isPrivate}
                />
              </div>
              <div className="xl:col-span-2">
                <ChartsSection yearlyTotals={yearlyTotals as any} isPrivate={isPrivate} />
              </div>
            </div>
          )}

          {activeSubTab === 'deposits' && (
            <DepositsDashboard 
              deposits={deposits} 
              taxSettings={taxSettings} 
              selectedYear={selectedYear} 
              onYearChange={setSelectedYear} 
              appSettings={appSettings} 
              isPrivate={isPrivate}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
