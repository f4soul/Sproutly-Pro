import React, { useState, useEffect, useMemo, useRef, Component } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Moon, Sun, Download, Upload, Copy, Plus, Info, Calculator, TrendingUp, ChevronDown, ChevronRight, Trash2, X, Settings, LogIn, LogOut, Cloud, CloudOff, RefreshCw, Check, Coins, ReceiptRussianRuble, Calendar, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence, useSpring, useTransform } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db, signInWithGoogle, logout, onAuthStateChanged, doc, getDoc, setDoc, onSnapshot, User } from './firebase';
import { AppState, MonthData, QuarterData, YearData, Toast } from './types';
import { MONTH_NAMES, QUARTERS, DEFAULT_NORMS, DEFAULT_TAX_BRACKETS } from './lib/constants';
import { calculateProgressiveTaxDetailed, formatCurrency, formatNumber } from './lib/taxCalculator';
import { generateDefaultYear, getDefaultExpandedQuarters, calculateYearTotals } from './lib/helpers';
import { cn } from './lib/utils';
import { CoefInput } from './components/CoefInput';
import { AnimatedCurrency } from './components/AnimatedCurrency';
import { TableInput } from './components/TableInput';
import { TaxSettingsModal } from './components/TaxSettingsModal';
import { TaxReferenceModal } from './components/TaxReferenceModal';
import { ClearDataModal } from './components/ClearDataModal';
import { DeleteYearModal } from './components/DeleteYearModal';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { YearSummary } from './components/YearSummary';
import { ChartsSection } from './components/ChartsSection';
import { YearTabs } from './components/YearTabs';
import { QuarterAccordion } from './components/QuarterAccordion';
import { QuarterRow } from './components/QuarterRow';
import { AnnualBonusSection } from './components/AnnualBonusSection';
import { useAppState, handleFirestoreError } from './hooks/useAppState';

// --- Main Component ---

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const { state, setState, user, isAuthReady, syncStatus, toasts, addToast, removeToast } = useAppState();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isYearActionsOpen, setIsYearActionsOpen] = useState(false);
  
  const handleCopy = (value: number, type: 'net' | 'gross' | 'tax') => {
    navigator.clipboard.writeText(value.toString());
    addToast(`Сумма скопирована в буфер обмена`);
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [expandedQuarters, setExpandedQuarters] = useState<Record<number, boolean>>(() => getDefaultExpandedQuarters(state.activeYear));
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isTaxInfoModalOpen, setIsTaxInfoModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isDeleteYearModalOpen, setIsDeleteYearModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setExpandedQuarters(getDefaultExpandedQuarters(state.activeYear));
  }, [state.activeYear]);

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
      
      if (field === 'bonusBase') {
        const base = value;
        // Recalculate quarters
        const newQuarters = (currentYearData.quarters || Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }))).map((q, qIndex) => {
          const qMonths = QUARTERS[qIndex].months.map(mi => currentYearData.months[mi]);
          const qNorm = qMonths.reduce((sum, m) => sum + m.normDays, 0);
          const qFact = qMonths.reduce((sum, m) => sum + m.factDays, 0);
          const krd = qNorm > 0 ? qFact / qNorm : 0;
          return {
            ...q,
            bonusAmount: q.bonusCoef ? Math.round((base * q.bonusCoef * krd) * 100) / 100 : q.bonusAmount
          };
        });
        
        // Recalculate annual
        const newAnnualAmount = currentYearData.annualBonusCoef ? Math.round((base * currentYearData.annualBonusCoef * krdg) * 100) / 100 : currentYearData.annualBonusAmount;
        
        newYears[prev.activeYear] = { 
          ...currentYearData, 
          bonusBase: base,
          quarters: newQuarters,
          annualBonusAmount: newAnnualAmount
        };
        return { ...prev, years: newYears };
      }

      const base = currentYearData.bonusBase || 169500;
      let newCoef = currentYearData.annualBonusCoef || 0;
      let newAmount = currentYearData.annualBonusAmount || 0;

      if (field === 'annualBonusCoef') {
        newCoef = value;
        newAmount = Math.round((base * value * krdg) * 100) / 100;
      } else {
        newAmount = Math.round(value * 100) / 100;
        newCoef = (base * krdg) > 0 ? value / (base * krdg) : 0;
      }

      newYears[prev.activeYear] = { 
        ...currentYearData, 
        annualBonusCoef: newCoef,
        annualBonusAmount: newAmount
      };
      return { ...prev, years: newYears };
    });
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
    if (availableYears.length <= 1) return;
    setState(prev => {
      const newYears = { ...prev.years };
      delete newYears[prev.activeYear];
      const remainingYears = Object.keys(newYears).map(Number).sort((a, b) => a - b);
      const newActiveYear = remainingYears[remainingYears.length - 1];
      return { ...prev, years: newYears, activeYear: newActiveYear };
    });
    setIsDeleteYearModalOpen(false);
    addToast(`Данные за год удалены`);
  };

  const clearActiveYearData = () => {
    setState(prev => {
      const currentData = prev.years[prev.activeYear];
      const newMonths = currentData.months.map(m => ({
        ...m,
        factDays: m.normDays,
        salary: 0,
      }));
      const newQuarters = currentData.quarters?.map(q => ({
        ...q,
        bonusCoef: 0,
        bonusAmount: 0,
      })) || Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }));

      return {
        ...prev,
        years: {
          ...prev.years,
          [prev.activeYear]: { 
            ...currentData, 
            months: newMonths, 
            quarters: newQuarters,
            additionalIncome: 0,
            annualBonusCoef: 0,
            annualBonusAmount: 0,
            extraBonusAmount: 0
          }
        }
      };
    });
    setIsClearModalOpen(false);
    addToast(`Данные за год очищены`);
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "income_calculator_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
          console.error("Неверный формат файла.");
          addToast("Неверный формат файла", "info");
        }
      } catch (err) {
        console.error("Ошибка при чтении файла.");
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
    const totalGross = totalGrossMonths + (activeYearData.annualBonusAmount || 0) + (activeYearData.extraBonusAmount || 0);
    
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
  }, [calculatedMonths, activeYearData.annualBonusAmount, activeYearData.extraBonusAmount, state.activeYear, state.taxBrackets]);

  const prevYearData = state.years[state.activeYear - 1];
  const prevYearTotals = useMemo(() => {
    return prevYearData ? calculateYearTotals(prevYearData, state.taxBrackets) : null;
  }, [prevYearData, state.taxBrackets]);

  const grossDiff = prevYearTotals ? yearlyTotals.totalGross - prevYearTotals.totalGross : null;
  const netDiff = prevYearTotals ? yearlyTotals.finalNet - prevYearTotals.finalNet : null;

  // --- Render Helpers ---

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] p-4 md:p-6 space-y-6 flex flex-col">
        <div className="max-w-[1600px] w-full mx-auto space-y-6 animate-pulse flex-1">
          {/* Header Skeleton */}
          <div className="h-20 bg-slate-200/50 dark:bg-slate-800/30 rounded-2xl w-full"></div>
          
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Table Skeleton */}
            <div className="flex-1 h-[600px] bg-slate-200/50 dark:bg-slate-800/30 rounded-3xl"></div>
            
            {/* Sidebar Skeleton */}
            <div className="w-full xl:w-[28%] grid grid-cols-2 gap-4 h-fit">
              <div className="col-span-2 h-40 bg-slate-200/50 dark:bg-slate-800/30 rounded-3xl"></div>
              <div className="col-span-1 h-32 bg-slate-200/50 dark:bg-slate-800/30 rounded-3xl"></div>
              <div className="col-span-1 h-32 bg-slate-200/50 dark:bg-slate-800/30 rounded-3xl"></div>
              <div className="col-span-2 h-64 bg-slate-200/50 dark:bg-slate-800/30 rounded-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300 selection:bg-indigo-500/30">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-transparent" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <Header 
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          user={user}
          syncStatus={syncStatus}
          isProfileMenuOpen={isProfileMenuOpen}
          setIsProfileMenuOpen={setIsProfileMenuOpen}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          setIsSettingsModalOpen={setIsSettingsModalOpen}
        />

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

            {/* Desktop/Tablet Layout (Compact Table) */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={state.activeYear + '-desktop'}
                initial={{ opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
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

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <TaxSettingsModal 
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            taxBrackets={state.taxBrackets}
            onSave={(newBrackets) => {
              setState(prev => ({ ...prev, taxBrackets: newBrackets }));
              addToast("Настройки налогов сохранены");
            }}
            onExport={exportJSON}
            onImport={importJSON}
          />
        )}
      </AnimatePresence>

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
