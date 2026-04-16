import React, { useState, useMemo } from 'react';
import { LayoutDashboard, TrendingUp, Landmark, PieChart as PieChartIcon, BarChart3, ChevronDown, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BentoDashboard } from './BentoDashboard';
import { DepositsDashboard } from '../DepositsDashboard';
import { ChartsSection } from '../ChartsSection';
import { YearSummary } from '../YearSummary';
import { Deposit, TaxYearSettings, AppSettings, AppState } from '../../types';
import { calculateProgressiveTaxDetailed } from '../../lib/taxCalculator';
import { calculateYearTotals } from '../../lib/helpers';
import { exportToPDF } from '../../services/ExportService';
import { cn } from '../../lib/utils';
import { useAppState } from '../../hooks/useAppState';

interface UnifiedDashboardProps {
  deposits: Deposit[];
  taxSettings: TaxYearSettings[];
  appSettings: AppSettings;
}

type SubTab = 'dashboard' | 'income' | 'deposits';

export function UnifiedDashboard({ deposits, taxSettings, appSettings }: UnifiedDashboardProps) {
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
    <div id="unified-dashboard-content" className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                activeSubTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
        <button 
          onClick={async () => {
            const success = await exportToPDF('unified-dashboard-content', {
              totalGross: yearlyTotals?.totalGross,
              totalNet: yearlyTotals?.finalNet,
              totalTax: yearlyTotals?.progressiveTax,
              effectiveRate: yearlyTotals?.effectiveRate
            });
            if (success) {
              window.dispatchEvent(new CustomEvent('app:toast', { 
                detail: { message: 'Отчет успешно экспортирован в PDF', type: 'success' } 
              }));
            }
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all whitespace-nowrap"
        >
          <Download size={16} />
          <span className="hidden sm:inline">Экспорт PDF</span>
        </button>
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
                />
              </div>
              <div className="xl:col-span-2">
                <ChartsSection yearlyTotals={yearlyTotals as any} />
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
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
