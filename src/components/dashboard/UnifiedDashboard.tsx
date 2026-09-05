import React, { useState, useMemo, useTransition } from 'react';
import { LayoutDashboard, HandCoins, Landmark, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BentoDashboard } from './BentoDashboard';
import { DepositsDashboard } from './DepositsDashboard';
import { ChartsSection } from './ChartsSection';
import { YearSummary } from '../income/YearSummary';
import { Deposit, CashAsset, TaxYearSettings, AppSettings, AppState } from '../../types';
import { calculateProgressiveTaxDetailed } from '../../lib/taxCalculator';
import { calculateYearTotals } from '../../lib/helpers';
import { cn } from '../../lib/utils';
import { useIncome } from '../../context/IncomeContext';

interface UnifiedDashboardProps {
  deposits: Deposit[];
  cashAssets?: CashAsset[];
  investmentAssets?: import('../../types').InvestmentAsset[];
  cryptoAssets?: import('../../types').CryptoAsset[];
  taxSettings: TaxYearSettings[];
  appSettings: AppSettings;
  isPrivate: boolean;
  setIsPrivate: (val: boolean) => void;
}

type SubTab = 'dashboard' | 'income' | 'deposits';

const DASHBOARD_CONTAINER_VARIANTS = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      duration: 0.3
    }
  }
};

const DASHBOARD_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 0 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
} as const;

export function UnifiedDashboard({ deposits, cashAssets = [], investmentAssets = [], cryptoAssets = [], taxSettings, appSettings, isPrivate, setIsPrivate }: UnifiedDashboardProps) {
  const { state, setState } = useIncome();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('dashboard');
  const [isPending, startTransition] = useTransition();
  
  const currentYear = new Date().getFullYear();
  const selectedYear = state.activeYear;
  
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const activeYearData = state.years[selectedYear] || state.years[currentYear];

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
    { id: 'dashboard', label: 'Сводка', icon: LayoutDashboard },
    { id: 'income', label: 'Доходы', icon: HandCoins },
    { id: 'deposits', label: 'Вклады', icon: Landmark },
  ];

  return (
    <div id="unified-dashboard-content" className="space-y-6 lg:space-y-8 w-full min-w-0 flex flex-col relative max-w-6xl mx-auto">
      {/* Header Section with Toggles */}
      <div className="flex flex-col items-center gap-4 mb-2 w-full z-20">
        {/* Navigation Panel */}
        <div className="flex items-center justify-center w-full md:w-auto relative gap-1 z-30">
          <div data-tour="dashboard-tabs" className="flex items-center bg-slate-50 dark:bg-slate-950/50 rounded-xl gap-1 w-full md:w-auto p-0.5 border border-slate-100 dark:border-white/[0.03]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as SubTab)}
                className={cn(
                  "flex-1 md:flex-none md:px-5 lg:px-7 relative flex items-center justify-center gap-2 py-2 text-[10px] xl:text-xs font-bold rounded-xl transition-all h-9 z-10",
                  activeSubTab === tab.id
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-slate-500 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
                )}
              >
                <span className="relative z-20 flex items-center gap-2">
                  <tab.icon size={13} className={cn("transition-colors", activeSubTab === tab.id ? "opacity-100" : "opacity-60")} />
                  <span className="uppercase tracking-widest truncate">{tab.label}</span>
                </span>
                {activeSubTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-white dark:bg-slate-900 rounded-[10px] shadow-sm border border-slate-200/50 dark:border-white/[0.05] z-10"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50 p-0.5 gap-0.5 relative z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowYearDropdown(!showYearDropdown);
              }}
              className={cn(
                "px-2 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl transition-all w-[30px] h-[30px] focus:outline-none",
                showYearDropdown && "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
              )}
              title={`Выбрать год (текущий: ${selectedYear})`}
            >
              <Calendar size={15} />
            </button>

              <AnimatePresence>
                {showYearDropdown && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setShowYearDropdown(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden outline-none p-1.5 flex flex-col gap-1"
                    >
                      {Object.keys(state.years).sort().reverse().map(y => (
                        <button
                          key={y}
                          onClick={() => {
                            const newYear = Number(y);
                            setShowYearDropdown(false);
                            startTransition(() => {
                              setState(prev => ({ ...prev, activeYear: newYear }));
                            });
                          }}
                          className={cn(
                            "w-full px-4 py-2.5 text-left text-xs font-bold rounded-xl transition-colors",
                            selectedYear === Number(y)
                              ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          )}
                        >
                          {y} год
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
      </div>

      <div className="pt-2 relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {activeSubTab === 'dashboard' && (
              <BentoDashboard 
                deposits={deposits} 
                cashAssets={cashAssets}
                investmentAssets={investmentAssets}
                cryptoAssets={cryptoAssets}
                taxSettings={taxSettings} 
                appSettings={appSettings} 
                isPrivate={isPrivate}
                setIsPrivate={setIsPrivate}
              />
            )}

            {activeSubTab === 'income' && yearlyTotals && (
              <div className="flex flex-col gap-6">
                <YearSummary 
                  yearlyTotals={yearlyTotals as any} 
                  netDiff={null} 
                  grossDiff={null} 
                  prevYear={null} 
                  handleCopy={() => {}} 
                  isPrivate={isPrivate}
                />
                <ChartsSection yearlyTotals={yearlyTotals as any} isPrivate={isPrivate} />
              </div>
            )}

            {activeSubTab === 'deposits' && (
              <DepositsDashboard 
                deposits={deposits} 
                taxSettings={taxSettings} 
                selectedYear={selectedYear} 
                onYearChange={(year) => {
                  startTransition(() => {
                    setState(prev => ({ ...prev, activeYear: year }));
                  });
                }} 
                appSettings={appSettings} 
                isPrivate={isPrivate}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
