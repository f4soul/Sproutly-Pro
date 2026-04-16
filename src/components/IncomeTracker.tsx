import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Info, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MonthData } from '../types';
import { QUARTERS, DEFAULT_TAX_BRACKETS } from '../lib/constants';
import { generateDefaultYear, getDefaultExpandedQuarters, calculateYearTotals } from '../lib/helpers';
import { calculateProgressiveTaxDetailed } from '../lib/taxCalculator';
import { TaxReferenceModal } from './TaxReferenceModal';
import { ClearDataModal } from './ClearDataModal';
import { DeleteYearModal } from './DeleteYearModal';
import { ToastContainer } from './ToastContainer';
import { YearSummary } from './YearSummary';
import { YearTabs } from './YearTabs';
import { QuarterRow } from './QuarterRow';
import { AnnualBonusSection } from './AnnualBonusSection';
import { QuarterAccordion } from './QuarterAccordion';
import { TableInput } from './TableInput';
import { CoefInput } from './CoefInput';
import { TaxAdvisorSection } from './TaxAdvisorSection';
import { ScenarioSimulator } from './ScenarioSimulator';
import { exportToPDF } from '../services/ExportService';
import { useAppState } from '../hooks/useAppState';
import { cn } from '../lib/utils';

export function IncomeTracker() {
  const { state, setState, addToast, toasts, removeToast } = useAppState();
  
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

  const yearlyTotals = useMemo(() => {
    const sim = state.simulation;
    const isSimActive = sim?.isActive;
    const bonusMult = isSimActive ? (sim.bonusMultiplier || 1) : 1;
    const extraSimIncome = isSimActive ? (sim.extraIncome || 0) : 0;

    const totalGrossMonths = calculatedMonths.reduce((sum, m) => sum + m.gross, 0);
    const totalGross = totalGrossMonths + 
      ((activeYearData.annualBonusAmount || 0) * bonusMult) + 
      ((activeYearData.extraBonusAmount || 0) * bonusMult) + 
      (activeYearData.additionalIncome || 0) + 
      extraSimIncome;
    
    const totalDeductions = (activeYearData.iisContribution || 0) + 
      (activeYearData.deductions?.social || 0) + 
      (activeYearData.deductions?.property || 0) + 
      (activeYearData.deductions?.standard || 0);

    const { tax: progressiveTax, brackets } = calculateProgressiveTaxDetailed(totalGross, state.activeYear, state.taxBrackets, totalDeductions);
    const flatTax = Math.max(0, totalGross - totalDeductions) * 0.13;
    
    const finalNet = totalGross - progressiveTax;
    const flatNet = totalGross - flatTax;
    
    const effectiveRate = totalGross > 0 ? (progressiveTax / totalGross) * 100 : 0;
    const taxDifference = progressiveTax - flatTax;

    return {
      totalGross,
      progressiveTax,
      flatTax,
      finalNet,
      flatNet,
      effectiveRate,
      taxDifference,
      brackets
    };
  }, [calculatedMonths, activeYearData, state.activeYear, state.taxBrackets, state.simulation]);

  const prevYearData = state.years[state.activeYear - 1];
  const prevYearTotals = useMemo(() => {
    return prevYearData ? calculateYearTotals(prevYearData, state.taxBrackets) : null;
  }, [prevYearData, state.taxBrackets]);

  const grossDiff = prevYearTotals ? yearlyTotals.totalGross - prevYearTotals.totalGross : null;
  const netDiff = prevYearTotals ? yearlyTotals.finalNet - prevYearTotals.finalNet : null;

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
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">База:</span>
                  <div className="relative w-32">
                    <TableInput
                      value={activeYearData.bonusBase ?? 0}
                      onChange={(v) => handleAnnualBonusChange('bonusBase', v)}
                      hideDecimals={true}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 pr-6 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-right text-sm transition-all shadow-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₽</span>
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800/50 pt-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-3">Премии (КФ):</span>
                  <div className="grid grid-cols-5 gap-2">
                    {[0, 1, 2, 3].map(qIndex => (
                      <div key={qIndex} className="flex flex-col items-center gap-1">
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">{qIndex + 1} КВ</span>
                        <div className="w-full flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                          <CoefInput
                            value={activeYearData.quarters?.[qIndex]?.bonusCoef ?? 0}
                            onChange={(v) => handleQuarterChange(qIndex, 'bonusCoef', v)}
                            className="w-full bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-xs p-0"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] text-indigo-500 uppercase font-black tracking-tighter">Год</span>
                      <div className="w-full flex items-center bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-lg p-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                        <CoefInput
                          value={activeYearData.annualBonusCoef ?? 0}
                          onChange={(v) => handleAnnualBonusChange('annualBonusCoef', v)}
                          className="w-full bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-xs p-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
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
            <AnimatePresence mode="wait">
              <motion.div 
                key={state.activeYear}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="hidden md:block bg-white dark:bg-slate-900/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 p-2"
              >
                <div className="overflow-x-auto custom-scrollbar relative rounded-2xl">
                  <table className="w-full text-sm text-left border-separate border-spacing-0 min-w-full">
                    <thead className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-20">
                      <tr>
                        <th colSpan={6} className="px-2 py-1.5 md:px-3 md:py-2 shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b]">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">База:</span>
                              <div className="relative w-18 md:w-24">
                                <TableInput
                                  value={activeYearData.bonusBase ?? 0}
                                  onChange={(v) => handleAnnualBonusChange('bonusBase', v)}
                                  hideDecimals={true}
                                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 pr-6 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-center text-xs transition-all shadow-sm"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">₽</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 md:gap-4 overflow-x-auto custom-scrollbar pb-1">
                              <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden sm:inline">Премии (КФ):</span>
                              <div className="flex gap-1 md:gap-2">
                                {[0, 1, 2, 3].map(qIndex => (
                                  <div key={qIndex} className="flex flex-col items-center gap-0.5">
                                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-tighter">{qIndex + 1} КВ</span>
                                    <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-1 py-0.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                                      <CoefInput
                                        value={activeYearData.quarters?.[qIndex]?.bonusCoef ?? 0}
                                        onChange={(v) => handleQuarterChange(qIndex, 'bonusCoef', v)}
                                        className="w-8 md:w-10 bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-[10px] p-0"
                                      />
                                    </div>
                                  </div>
                                ))}
                                <div className="flex flex-col items-center gap-0.5 ml-1">
                                  <span className="text-[8px] text-indigo-500 uppercase font-black tracking-tighter">Год</span>
                                  <div className="flex items-center bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-md px-1 py-0.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                                    <CoefInput
                                      value={activeYearData.annualBonusCoef ?? 0}
                                      onChange={(v) => handleAnnualBonusChange('annualBonusCoef', v)}
                                      className="w-8 md:w-10 bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-[10px] p-0"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </th>
                      </tr>
                      <tr>
                        <th className="px-1 md:px-2 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-left shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap w-auto min-w-[80px] lg:min-w-[100px]">Месяц</th>
                        <th className="px-1 md:px-2 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap w-auto min-w-[90px] lg:min-w-[120px]" title="Фактически отработано / Норма">Дни (Факт/Норма)</th>
                        <th className="px-1 md:px-1.5 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap w-auto min-w-[80px] lg:min-w-[110px]">Оклад (₽)</th>
                        <th className="px-1 md:px-1.5 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap w-auto min-w-[80px] lg:min-w-[110px]">Премия (₽)</th>
                        <th className="px-1 md:px-2 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-indigo-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap w-auto min-w-[90px] lg:min-w-[120px]">Gross (₽)</th>
                        <th className="px-1 md:px-2 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-emerald-500 font-semibold text-right shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap w-auto min-w-[90px] lg:min-w-[120px]">Net 13% (₽)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {QUARTERS.map((q, qIndex) => (
                        <QuarterRow 
                          key={qIndex}
                          q={q}
                          qIndex={qIndex}
                          activeYearData={activeYearData}
                          calculatedMonths={calculatedMonths}
                          handleQuarterChange={handleQuarterChange}
                          handleMonthChange={handleMonthChange}
                        />
                      ))}

                      {/* Annual Bonus & Totals */}
                      <AnnualBonusSection 
                        activeYearData={activeYearData}
                        handleAnnualBonusChange={handleAnnualBonusChange}
                        calculatedMonths={calculatedMonths}
                        yearlyTotals={yearlyTotals}
                      />
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </AnimatePresence>
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
