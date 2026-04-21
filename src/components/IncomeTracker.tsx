import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Info, TrendingUp, Shield, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MonthData } from '../types';
import { QUARTERS, DEFAULT_TAX_BRACKETS } from '../lib/constants';
import { generateDefaultYear, getDefaultExpandedQuarters } from '../lib/helpers';
import { TaxReferenceModal } from './TaxReferenceModal';
import { ClearDataModal } from './ClearDataModal';
import { DeleteYearModal } from './DeleteYearModal';
import { ToastContainer } from './ToastContainer';
import { YearSummary } from './YearSummary';
import { YearTabs } from './YearTabs';
import { AnnualBonusSection } from './AnnualBonusSection';
import { QuarterAccordion } from './QuarterAccordion';
import { ScenarioSimulator } from './ScenarioSimulator';
import { exportToPDF, exportIncomeToXLSX } from '../services/ExportService';
import { useAppState } from '../hooks/useAppState';
import { cn, formatCurrency } from '../lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { IncomeDesktopTable } from './IncomeDesktopTable';
import { IncomeMobileView } from './IncomeMobileView';
import { useIncomeCalculationMode } from '../hooks/useIncomeCalculationMode';
import { useIncomeTotals } from '../hooks/useIncomeTotals';
import { BonusConfigControls } from './BonusConfigControls';

interface IncomeTrackerProps {
  isPrivate: boolean;
  setIsPrivate: (val: boolean) => void;
}

export function IncomeTracker({ isPrivate, setIsPrivate }: IncomeTrackerProps) {
  const { state, setState, addToast, toasts, removeToast } = useAppState();
  const deposits = useLiveQuery(() => db.deposits.toArray()) || [];
  const taxSettings = useLiveQuery(() => db.taxYearSettings.toArray()) || [];
  const { mode: calculationMode, setMode: setCalculationMode } = useIncomeCalculationMode('salary');
  
  const handleCopy = (value: number, type: 'net' | 'gross' | 'tax') => {
    navigator.clipboard.writeText(value.toString());
    addToast(`Сумма скопирована в буфер обмена`);
  };

  const [expandedQuarters, setExpandedQuarters] = useState<Record<number, boolean>>(() => getDefaultExpandedQuarters(state.activeYear));
  const [isTaxInfoModalOpen, setIsTaxInfoModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isDeleteYearModalOpen, setIsDeleteYearModalOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [simulation, setSimulation] = useState({
    isActive: false,
    salaryIncrease: 0,
    bonusMultiplier: 1,
    extraIncome: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setExpandedQuarters(getDefaultExpandedQuarters(state.activeYear));
  }, [state.activeYear]);

  const activeYearData = state.years[state.activeYear];

  // --- Handlers ---

  const handleMonthChange = (monthIndex: number, field: keyof MonthData, value: number) => {
    setState(prev => {
      const newYears = { ...prev.years };
      const newMonths = [...newYears[prev.activeYear].months];
      const oldValue = newMonths[monthIndex][field];
      newMonths[monthIndex] = { ...newMonths[monthIndex], [field]: value };
      
      // Auto-fill logic for salary
      if (field === 'salary') {
        for (let i = monthIndex + 1; i < 12; i++) {
          if (newMonths[i].salary === oldValue || newMonths[i].salary === 0) {
             newMonths[i] = { ...newMonths[i], salary: value };
          }
        }
      }
      
      newYears[prev.activeYear] = { ...newYears[prev.activeYear], months: newMonths };
      return { ...prev, years: newYears };
    });
  };

  const addNewYear = () => {
    const newYear = Math.max(...Object.keys(state.years).map(Number)) + 1;
    setState(prev => ({
      ...prev,
      years: { ...prev.years, [newYear]: generateDefaultYear(newYear) },
      activeYear: newYear,
    }));
    addToast(`Добавлен ${newYear} год`);
  };

  const handleQuarterChange = (qIndex: number, field: 'bonusCoef' | 'bonusAmount', value: number) => {
    setState(prev => {
      const newYears = { ...prev.years };
      const currentYearData = newYears[prev.activeYear];
      const newQuarters = [...(currentYearData.quarters || Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 })))];
      
      const qMonths = QUARTERS[qIndex].months.map(mi => currentYearData.months[mi]);
      const qNorm = qMonths.reduce((sum, m) => sum + m.normDays, 0);
      const qFact = qMonths.reduce((sum, m) => sum + m.factDays, 0);
      const krd = qNorm > 0 ? qFact / qNorm : 0;
      const base = currentYearData.bonusBase || 169500;

      if (field === 'bonusCoef') {
        newQuarters[qIndex] = {
          bonusCoef: value,
          bonusAmount: Math.round((base * value * krd) * 100) / 100
        };
      } else {
        newQuarters[qIndex] = {
          bonusCoef: (base * krd) > 0 ? value / (base * krd) : 0,
          bonusAmount: Math.round(value * 100) / 100
        };
      }

      newYears[prev.activeYear] = { ...currentYearData, quarters: newQuarters };
      return { ...prev, years: newYears };
    });
  };

  const handleAnnualBonusChange = (field: 'annualBonusCoef' | 'annualBonusAmount' | 'extraBonusAmount' | 'bonusBase' | 'iisContribution' | 'deductions', value: number | { social?: number, property?: number, standard?: number }) => {
    setState(prev => {
      const newYears = { ...prev.years };
      const currentYearData = newYears[prev.activeYear];
      
      if (field === 'extraBonusAmount') {
        newYears[prev.activeYear] = { ...currentYearData, extraBonusAmount: value as number };
        return { ...prev, years: newYears };
      }

      if (field === 'iisContribution') {
        newYears[prev.activeYear] = { ...currentYearData, iisContribution: value as number };
        return { ...prev, years: newYears };
      }

      if (field === 'deductions') {
        newYears[prev.activeYear] = { ...currentYearData, deductions: value as { social?: number, property?: number, standard?: number } };
        return { ...prev, years: newYears };
      }

      const yNorm = currentYearData.months.reduce((sum, m) => sum + m.normDays, 0);
      const yFact = currentYearData.months.reduce((sum, m) => sum + m.factDays, 0);
      const krdg = yNorm > 0 ? yFact / yNorm : 0;
      
      let newAnnualCoef = currentYearData.annualBonusCoef || 0;
      let newAnnualAmount = currentYearData.annualBonusAmount || 0;
      let newBonusBase = currentYearData.bonusBase || 0;

      if (field === 'bonusBase') {
        newBonusBase = value as number;
        
        // Update all monthly salaries to match bonusBase
        const newMonths = currentYearData.months.map(m => ({ ...m, salary: newBonusBase }));
        
        // Recalculate quarters
        const newQuarters = (currentYearData.quarters || Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }))).map((q, qIndex) => {
          const qMonths = QUARTERS[qIndex].months.map(mi => newMonths[mi]);
          const qNorm = qMonths.reduce((sum, m) => sum + m.normDays, 0);
          const qFact = qMonths.reduce((sum, m) => sum + m.factDays, 0);
          const krd = qNorm > 0 ? qFact / qNorm : 0;
          return {
            ...q,
            bonusAmount: q.bonusCoef ? Math.round((newBonusBase * q.bonusCoef * krd) * 100) / 100 : q.bonusAmount
          };
        });
        
        newAnnualAmount = Math.round((newBonusBase * newAnnualCoef * krdg) * 100) / 100;
        
        newYears[prev.activeYear] = { 
          ...currentYearData, 
          annualBonusCoef: newAnnualCoef, 
          annualBonusAmount: newAnnualAmount,
          bonusBase: newBonusBase,
          months: newMonths,
          quarters: newQuarters
        };
        return { ...prev, years: newYears };
      } else if (field === 'annualBonusCoef') {
        newAnnualCoef = value as number;
        newAnnualAmount = Math.round((newBonusBase * (value as number) * krdg) * 100) / 100;
      } else if (field === 'annualBonusAmount') {
        newAnnualAmount = value as number;
        newAnnualCoef = (newBonusBase * krdg) > 0 ? (value as number) / (newBonusBase * krdg) : 0;
      }

      newYears[prev.activeYear] = { 
        ...currentYearData, 
        annualBonusCoef: newAnnualCoef, 
        annualBonusAmount: newAnnualAmount,
        bonusBase: newBonusBase
      };
      return { ...prev, years: newYears };
    });
  };

  const clearActiveYearData = () => {
    setState(prev => ({
      ...prev,
      years: { ...prev.years, [prev.activeYear]: generateDefaultYear(prev.activeYear) }
    }));
    addToast(`Данные за ${state.activeYear} год очищены`);
    setIsClearModalOpen(false);
  };

  const availableYears = Object.keys(state.years).map(Number).sort((a, b) => a - b);
  const currentIndex = availableYears.indexOf(state.activeYear);
  const prevYear = currentIndex > 0 ? availableYears[currentIndex - 1] : null;

  const copyFromPreviousYear = () => {
    if (prevYear === null || !state.years[prevYear]) {
      console.warn(`Нет данных за предыдущий год для копирования.`);
      return;
    }
    setState(prev => {
      const prevData = prev.years[prevYear];
      const currentData = prev.years[prev.activeYear];
      const newMonths = currentData.months.map((m, i) => ({
        ...m,
        salary: prevData.months[i].salary,
      }));
      const newQuarters = currentData.quarters?.map((q, i) => ({
        ...q,
        bonusCoef: prevData.quarters?.[i]?.bonusCoef || 0,
        bonusAmount: prevData.quarters?.[i]?.bonusAmount || 0,
      })) || Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }));

      return {
        ...prev,
        years: {
          ...prev.years,
          [prev.activeYear]: { 
            ...currentData, 
            months: newMonths, 
            quarters: newQuarters,
            additionalIncome: prevData.additionalIncome,
            bonusBase: prevData.bonusBase || 169500,
            annualBonusCoef: prevData.annualBonusCoef || 0,
            annualBonusAmount: prevData.annualBonusAmount || 0,
            extraBonusAmount: prevData.extraBonusAmount || 0
          }
        }
      };
    });
  };

  const deleteActiveYear = () => {
    if (availableYears.length <= 1) {
      addToast("Нельзя удалить единственный год", "info");
      return;
    }

    setState(prev => {
      const newYears = { ...prev.years };
      delete newYears[state.activeYear];
      
      const newAvailableYears = Object.keys(newYears).map(Number).sort();
      const newActiveYear = newAvailableYears.includes(state.activeYear - 1) 
        ? state.activeYear - 1 
        : newAvailableYears[newAvailableYears.length - 1];

      return { ...prev, years: newYears, activeYear: newActiveYear };
    });
    
    addToast(`${state.activeYear} год удален`);
    setIsDeleteYearModalOpen(false);
  };

  // --- Calculations ---

  const calculatedMonths = useMemo(() => {
    const isSimActive = simulation.isActive;
    const salaryMult = isSimActive ? (1 + (simulation.salaryIncrease || 0) / 100) : 1;
    const bonusMult = isSimActive ? (simulation.bonusMultiplier || 1) : 1;

    return activeYearData.months.map((m, index) => {
      const baseSalary = m.salary * salaryMult;
      const base = m.factDays < m.normDays ? baseSalary * (m.factDays / m.normDays) : baseSalary;
      
      let bonus = 0;
      if (index % 3 === 2) {
        const qIndex = Math.floor(index / 3);
        bonus += (activeYearData.quarters?.[qIndex]?.bonusAmount || 0) * bonusMult;
      }

      const gross = base + bonus;
      const tax13 = gross * 0.13;
      const net13 = gross - tax13;
      return { ...m, base, bonus, gross, tax13, net13 };
    });
  }, [activeYearData, simulation]);

  const prevYearData = state.years[state.activeYear - 1];
  const { yearlyTotals, grossDiff, netDiff } = useIncomeTotals({
    activeYear: state.activeYear,
    activeYearData,
    prevYearData,
    deposits,
    taxSettings,
    taxBrackets: state.taxBrackets,
    simulation,
    calculationMode
  });

  const formatVal = (val: number) => isPrivate ? '••••••' : formatCurrency(val);

  if (!activeYearData) return null;

  return (
    <div id="income-tracker-content" className="text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300 selection:bg-indigo-500/30">
      <div className="max-w-full lg:max-w-[1024px] mx-auto space-y-6">

        {/* Action Bar (Simulation Badge) */}
        {simulation.isActive && (
          <div className="flex justify-end mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl border border-emerald-500/20 w-fit mt-2">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hidden lg:inline">Simulation</span>
            </div>
          </div>
        )}

        {/* Top Summary Section */}
        <YearSummary 
          yearlyTotals={yearlyTotals}
          netDiff={netDiff}
          grossDiff={grossDiff}
          prevYear={prevYear}
          handleCopy={handleCopy}
          isPrivate={isPrivate}
        />

        <div className="space-y-8">
          {/* Tabs & Toolbar */}
          <YearTabs 
            availableYears={availableYears}
            activeYear={state.activeYear}
            setActiveYear={(year) => setState(prev => ({ ...prev, activeYear: year }))}
            addNewYear={addNewYear}
            setIsDeleteYearModalOpen={setIsDeleteYearModalOpen}
            setIsClearModalOpen={setIsClearModalOpen}
            prevYear={prevYear}
            copyFromPreviousYear={copyFromPreviousYear}
            onExportPDF={async () => {
              const success = await exportToPDF('income-tracker-content', {
                totalGross: yearlyTotals.totalGross,
                totalNet: yearlyTotals.finalNet,
                totalTax: yearlyTotals.progressiveTax,
                effectiveRate: yearlyTotals.effectiveRate
              });
              if (success) {
                addToast('Отчет экспортирован в PDF', 'success');
              } else {
                addToast('Ошибка при экспорте в PDF', 'error');
              }
            }}
            onExportXLSX={() => {
              exportIncomeToXLSX(calculatedMonths, state.activeYear, yearlyTotals);
              addToast('Данные экспортированы в Excel', 'success');
            }}
            isSimulationOpen={isSimulationOpen}
            setIsSimulationOpen={setIsSimulationOpen}
          />

          {/* Scenario Simulator (Collapsible) */}
          <AnimatePresence>
            {isSimulationOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <ScenarioSimulator 
                  simulation={simulation}
                  onUpdate={setSimulation}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-8 md:gap-10">
            {/* Mobile Layout (Cards) */}
            <div className="block lg:hidden">
              <IncomeMobileView
                activeYearData={activeYearData}
                calculatedMonths={calculatedMonths}
                yearlyTotals={yearlyTotals}
                expandedQuarters={expandedQuarters}
                onToggleQuarter={(qIndex) => setExpandedQuarters(prev => ({ ...prev, [qIndex]: !prev[qIndex] }))}
                handleAnnualBonusChange={handleAnnualBonusChange}
                handleQuarterChange={handleQuarterChange}
                handleMonthChange={handleMonthChange}
                isPrivate={isPrivate}
              />
            </div>

            {/* Desktop Layout (Table) */}
            <div className="hidden lg:block">
              <IncomeDesktopTable
                yearKey={state.activeYear}
                activeYearData={activeYearData}
                calculatedMonths={calculatedMonths}
                yearlyTotals={yearlyTotals}
                onBonusBaseChange={(value) => handleAnnualBonusChange('bonusBase', value)}
                onQuarterCoefChange={(qIndex, value) => handleQuarterChange(qIndex, 'bonusCoef', value)}
                onAnnualCoefChange={(value) => handleAnnualBonusChange('annualBonusCoef', value)}
                handleQuarterChange={handleQuarterChange}
                handleMonthChange={handleMonthChange}
                handleAnnualBonusChange={handleAnnualBonusChange}
                onShowTaxInfo={() => setIsTaxInfoModalOpen(true)}
                isPrivate={isPrivate}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Clear Data Modal */}
      <ClearDataModal 
        isOpen={isClearModalOpen} 
        onClose={() => setIsClearModalOpen(false)} 
        onConfirm={clearActiveYearData} 
        year={state.activeYear} 
      />

      {/* Delete Year Modal */}
      <DeleteYearModal 
        isOpen={isDeleteYearModalOpen} 
        onClose={() => setIsDeleteYearModalOpen(false)} 
        onConfirm={deleteActiveYear} 
        year={state.activeYear} 
      />

      {/* Tax Info Modal */}
      <AnimatePresence>
        {isTaxInfoModalOpen && (
          <TaxReferenceModal 
            isOpen={isTaxInfoModalOpen}
            onClose={() => setIsTaxInfoModalOpen(false)}
            year={state.activeYear}
            brackets={state.taxBrackets[state.activeYear] || DEFAULT_TAX_BRACKETS[2025] || []}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
