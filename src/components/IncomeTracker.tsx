import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, MonthData } from '../types';
import { QUARTERS, DEFAULT_TAX_BRACKETS } from '../lib/constants';
import { generateDefaultYear, getDefaultExpandedQuarters, calculateYearTotals } from '../lib/helpers';
import { calculateProgressiveTaxDetailed } from '../lib/taxCalculator';
import { TaxReferenceModal } from './TaxReferenceModal';
import { ClearDataModal } from './ClearDataModal';
import { DeleteYearModal } from './DeleteYearModal';
import { ToastContainer } from './ToastContainer';
import { YearSummary } from './YearSummary';
import { ChartsSection } from './ChartsSection';
import { YearTabs } from './YearTabs';
import { QuarterRow } from './QuarterRow';
import { AnnualBonusSection } from './AnnualBonusSection';
import { useAppState } from '../hooks/useAppState';

export function IncomeTracker() {
  const { state, setState, user, isAuthReady, syncStatus, toasts, addToast, removeToast } = useAppState();
  const [isYearActionsOpen, setIsYearActionsOpen] = useState(false);
  
  const handleCopy = (value: number, type: 'net' | 'gross' | 'tax') => {
    navigator.clipboard.writeText(value.toString());
    addToast(`Сумма скопирована в буфер обмена`);
  };

  const [expandedQuarters, setExpandedQuarters] = useState<Record<number, boolean>>(() => getDefaultExpandedQuarters(state.activeYear));
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isTaxInfoModalOpen, setIsTaxInfoModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isDeleteYearModalOpen, setIsDeleteYearModalOpen] = useState(false);
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

  const handleAdditionalIncomeChange = (value: number) => {
    setState(prev => {
      const newYears = { ...prev.years };
      newYears[prev.activeYear] = { ...newYears[prev.activeYear], additionalIncome: value };
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

  const handleAnnualBonusChange = (field: 'annualBonusCoef' | 'annualBonusAmount' | 'extraBonusAmount' | 'bonusBase', value: number) => {
    setState(prev => {
      const newYears = { ...prev.years };
      const currentYearData = newYears[prev.activeYear];
      
      if (field === 'extraBonusAmount') {
        newYears[prev.activeYear] = { ...currentYearData, extraBonusAmount: value };
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

  const exportJSON = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income_calculator_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Данные успешно экспортированы");
  };

  const importJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedState = JSON.parse(e.target?.result as string);
        if (importedState && importedState.years && importedState.activeYear) {
          setState(importedState);
          addToast("Данные успешно импортированы");
        } else {
          addToast("Неверный формат файла", "info");
        }
      } catch (error) {
        addToast("Ошибка при чтении файла", "info");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Calculations ---

  const calculatedMonths = useMemo(() => {
    return activeYearData.months.map((m, index) => {
      const base = m.factDays < m.normDays ? m.salary * (m.factDays / m.normDays) : m.salary;
      
      let bonus = 0;
      if (index % 3 === 2) {
        const qIndex = Math.floor(index / 3);
        bonus += activeYearData.quarters?.[qIndex]?.bonusAmount || 0;
      }

      const gross = base + bonus;
      const tax13 = gross * 0.13;
      const net13 = gross - tax13;
      return { ...m, base, bonus, gross, tax13, net13 };
    });
  }, [activeYearData]);

  const yearlyTotals = useMemo(() => {
    const totalGrossMonths = calculatedMonths.reduce((sum, m) => sum + m.gross, 0);
    const totalGross = totalGrossMonths + (activeYearData.annualBonusAmount || 0) + (activeYearData.extraBonusAmount || 0) + (activeYearData.additionalIncome || 0);
    
    const { tax: progressiveTax, brackets } = calculateProgressiveTaxDetailed(totalGross, state.activeYear, state.taxBrackets);
    const flatTax = totalGross * 0.13;
    
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
  }, [calculatedMonths, activeYearData.annualBonusAmount, activeYearData.extraBonusAmount, activeYearData.additionalIncome, state.activeYear, state.taxBrackets]);

  const prevYearData = state.years[state.activeYear - 1];
  const prevYearTotals = useMemo(() => {
    return prevYearData ? calculateYearTotals(prevYearData, state.taxBrackets) : null;
  }, [prevYearData, state.taxBrackets]);

  const grossDiff = prevYearTotals ? yearlyTotals.totalGross - prevYearTotals.totalGross : null;
  const netDiff = prevYearTotals ? yearlyTotals.finalNet - prevYearTotals.finalNet : null;

  if (!activeYearData) return null;

  return (
    <div className="text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300 selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto space-y-6">

        <div className="flex flex-col xl:flex-row gap-4 items-start">
          
          {/* Left Column: Tabs + Table */}
          <div className="w-full xl:w-[72%] space-y-6 min-w-0">
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
            />

            {/* Main Table */}
            <AnimatePresence mode="wait">
            <motion.div 
              key={state.activeYear}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-slate-800/60 overflow-hidden"
            >
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm">
                      <th className="px-2 md:px-4 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] sticky left-0 bg-slate-50/95 dark:bg-slate-800/95 z-10 w-12 md:w-16">Месяц</th>
                      <th className="px-1 md:px-1.5 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] w-12 md:w-16">Норма</th>
                      <th className="px-1 md:px-1.5 py-1.5 md:py-2 text-[9px] md:text-[10px] lg:text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] w-12 md:w-16">Факт</th>
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

          {/* Right Column: Dashboard */}
          <div className="w-full xl:w-[28%] space-y-6 xl:sticky xl:top-6">
            <YearSummary 
              yearlyTotals={yearlyTotals}
              netDiff={netDiff}
              grossDiff={grossDiff}
              prevYear={prevYear}
              handleCopy={handleCopy}
            />
            <ChartsSection yearlyTotals={yearlyTotals} />
            
            {/* Progressive Scale Info Button */}
            <button 
              onClick={() => setIsTaxInfoModalOpen(true)}
              className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2 font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all cursor-pointer shadow-sm"
            >
              <Info size={18} /> Справка по НДФЛ {state.activeYear}
            </button>
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
