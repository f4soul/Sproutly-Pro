import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Info, PanelRightOpen, PanelRightClose } from 'lucide-react';
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
import { TaxAdvisorSection } from './TaxAdvisorSection';
import { ScenarioSimulator } from './ScenarioSimulator';
import { exportToPDF } from '../services/ExportService';
import { useAppState } from '../hooks/useAppState';
import { cn } from '../lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { IncomeCalculationModeToggle } from './IncomeCalculationModeToggle';
import { IncomeDesktopTable } from './IncomeDesktopTable';
import { useIncomeCalculationMode } from '../hooks/useIncomeCalculationMode';
import { useIncomeTotals } from '../hooks/useIncomeTotals';
import { BonusConfigControls } from './BonusConfigControls';

export function IncomeTracker() {
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
      newMonths[monthIndex] = { ...newMonths[monthIndex], [field]: value };
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

  const handleAnnualBonusChange = (field: 'annualBonusCoef' | 'annualBonusAmount' | 'extraBonusAmount' | 'bonusBase' | 'baseSalary' | 'iisContribution' | 'deductions', value: any) => {
    setState(prev => {
      const newYears = { ...prev.years };
      const currentYearData = newYears[prev.activeYear];
      
      if (field === 'extraBonusAmount') {
        newYears[prev.activeYear] = { ...currentYearData, extraBonusAmount: value };
        return { ...prev, years: newYears };
      }

      if (field === 'baseSalary') {
        newYears[prev.activeYear] = { ...currentYearData, baseSalary: value };
        return { ...prev, years: newYears };
      }

      if (field === 'iisContribution') {
        newYears[prev.activeYear] = { ...currentYearData, iisContribution: value };
        return { ...prev, years: newYears };
      }

      if (field === 'deductions') {
        newYears[prev.activeYear] = { ...currentYearData, deductions: value };
        return { ...prev, years: newYears };
      }

      const yNorm = currentYearData.months.reduce((sum, m) => sum + m.normDays, 0);
      const yFact = currentYearData.months.reduce((sum, m) => sum + m.factDays, 0);
      const krdg = yNorm > 0 ? yFact / yNorm : 0;
      
      let newAnnualCoef = currentYearData.annualBonusCoef || 0;
      let newAnnualAmount = currentYearData.annualBonusAmount || 0;
      let newBonusBase = currentYearData.bonusBase || 169500;

      if (field === 'bonusBase') {
        newBonusBase = value;
        newAnnualAmount = Math.round((newBonusBase * newAnnualCoef * krdg) * 100) / 100;
      } else if (field === 'annualBonusCoef') {
        newAnnualCoef = value;
        newAnnualAmount = Math.round((newBonusBase * value * krdg) * 100) / 100;
      } else if (field === 'annualBonusAmount') {
        newAnnualAmount = value;
        newAnnualCoef = (newBonusBase * krdg) > 0 ? value / (newBonusBase * krdg) : 0;
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
    const sim = state.simulation;
    const isSimActive = sim?.isActive;
    const salaryMult = isSimActive ? (1 + (sim.salaryIncrease || 0) / 100) : 1;
    const bonusMult = isSimActive ? (sim.bonusMultiplier || 1) : 1;

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
  }, [activeYearData, state.simulation]);

  const prevYearData = state.years[state.activeYear - 1];
  const { yearlyTotals, grossDiff, netDiff } = useIncomeTotals({
    activeYear: state.activeYear,
    activeYearData,
    prevYearData,
    deposits,
    taxSettings,
    taxBrackets: state.taxBrackets,
    simulation: state.simulation,
    calculationMode
  });

  if (!activeYearData) return null;

  return (
    <div id="income-tracker-content" className="text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300 selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Top Summary Section */}
        <YearSummary 
          yearlyTotals={yearlyTotals}
          netDiff={netDiff}
          grossDiff={grossDiff}
          prevYear={prevYear}
          handleCopy={handleCopy}
        />

        <div className="flex gap-6 items-start relative">
          
          {/* Left Column: Tabs + Table (Expands to full width when sidebar is closed) */}
          <div className={cn("space-y-6 min-w-0 transition-all duration-300", isSidebarOpen ? "w-full xl:w-[72%]" : "w-full")}>
            {/* Tabs & Toolbar */}
            <div className="flex justify-between items-center">
              <IncomeCalculationModeToggle value={calculationMode} onChange={setCalculationMode} />
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
                    window.dispatchEvent(new CustomEvent('app:toast', { 
                      detail: { message: 'Таблица доходов экспортирована в PDF', type: 'success' } 
                    }));
                  }
                }}
              />
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 transition-colors"
                title={isSidebarOpen ? "Скрыть инструменты" : "Показать инструменты"}
              >
                {isSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
              </button>
            </div>

            {/* Mobile Layout (Cards) */}
            <div className="block md:hidden space-y-4">
              {/* Header Settings Card */}
              <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-4 space-y-4">
                <BonusConfigControls
                  compact
                  activeYearData={activeYearData}
                  onBonusBaseChange={(value) => handleAnnualBonusChange('bonusBase', value)}
                  onQuarterCoefChange={(qIndex, value) => handleQuarterChange(qIndex, 'bonusCoef', value)}
                  onAnnualCoefChange={(value) => handleAnnualBonusChange('annualBonusCoef', value)}
                />
              </div>

              {/* Quarters Accordion */}
              {QUARTERS.map((q, qIndex) => (
                <QuarterAccordion 
                  key={qIndex}
                  q={q}
                  qIndex={qIndex}
                  isExpanded={expandedQuarters[qIndex]}
                  onToggle={() => setExpandedQuarters(prev => ({ ...prev, [qIndex]: !prev[qIndex] }))}
                  activeYearData={activeYearData}
                  calculatedMonths={calculatedMonths}
                  handleQuarterChange={handleQuarterChange}
                  handleMonthChange={handleMonthChange}
                />
              ))}

              {/* Annual/Extra Bonus Cards */}
              <AnnualBonusSection 
                activeYearData={activeYearData}
                handleAnnualBonusChange={handleAnnualBonusChange}
                calculatedMonths={calculatedMonths}
                yearlyTotals={yearlyTotals}
                isMobile={true}
              />
            </div>

            {/* Desktop Layout (Table) */}
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
            />
          </div>

          {/* Right Column: Sidebar (Collapsible) */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0, x: 20, width: 0 }}
                animate={{ opacity: 1, x: 0, width: '28%' }}
                exit={{ opacity: 0, x: 20, width: 0 }}
                className="hidden xl:block space-y-6 shrink-0"
              >
                {/* Scenario Simulator */}
                <ScenarioSimulator 
                  simulation={state.simulation || { isActive: false, salaryIncrease: 0, bonusMultiplier: 1, extraIncome: 0 }}
                  onUpdate={(sim) => setState(prev => ({ ...prev, simulation: sim }))}
                />

                {/* Tax Advisor Section */}
                <TaxAdvisorSection 
                  activeYearData={activeYearData}
                  onUpdate={handleAnnualBonusChange}
                />
                
                {/* Progressive Scale Info Button */}
                <button 
                  onClick={() => setIsTaxInfoModalOpen(true)}
                  className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2 font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all cursor-pointer shadow-sm"
                >
                  <Info size={18} /> Справка по НДФЛ {state.activeYear}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
