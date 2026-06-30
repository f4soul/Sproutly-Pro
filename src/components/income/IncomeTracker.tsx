import React, { useState, useEffect, useMemo, useRef, useTransition } from 'react';
import { Info, HandCoins, Shield, Eye, EyeOff, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MonthData, SimulationState, CalculatedMonth, MonthDataV2, IncomeColumnDef } from '../../types';
import { QUARTERS, DEFAULT_TAX_BRACKETS } from '../../lib/constants';
import { generateDefaultYear, generateEmptyYear, getDefaultExpandedQuarters } from '../../lib/helpers';
import { TaxReferenceModal } from './TaxReferenceModal';
import { ClearDataModal } from '../ui/ClearDataModal';
import { DeleteYearModal } from './DeleteYearModal';
import { CopyYearModal } from './CopyYearModal';
import { YearSummary } from './YearSummary';
import { YearTabs } from './YearTabs';
import { ScenarioSimulator } from './ScenarioSimulator';

import { useAppData } from '../../context/AppDataContext';
import { showToast } from '../../lib/toast';
import { cn, formatCurrency } from '../../lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../config/db';
import { CalendarService } from '../../services/CalendarService';
import { IncomeDesktopTable } from './IncomeDesktopTable';
import { IncomeMobileView } from './IncomeMobileView';
import { useIncomeTotals } from '../../hooks/useIncomeTotals';
import { PrivacyBlur } from '../ui/PrivacyBlur';
import { IncomeTableConfigDialog } from './IncomeTableConfigDialog';

interface IncomeTrackerProps {
  isPrivate: boolean;
  setIsPrivate: (val: boolean) => void;
}

export function IncomeTracker({ isPrivate, setIsPrivate }: IncomeTrackerProps) {
  const { state, setState, isInitialized, deposits } = useAppData();
  const taxSettings = useLiveQuery(() => db.taxYearSettings.toArray()) || [];
  
  const handleCopy = (value: number, type: 'net' | 'gross' | 'tax') => {
    navigator.clipboard.writeText(value.toString());
    showToast(`Сумма скопирована в буфер обмена`);
  };

  const [expandedQuarters, setExpandedQuarters] = useState<Record<number, boolean>>(() => getDefaultExpandedQuarters(state.activeYear));
  const [isTaxInfoModalOpen, setIsTaxInfoModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isDeleteYearModalOpen, setIsDeleteYearModalOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isV2ConfigOpen, setIsV2ConfigOpen] = useState(false);
  
  const [isPending, startTransition] = useTransition();
  const handleSetActiveYear = (year: number) => {
    startTransition(() => {
      setState(prev => ({ ...prev, activeYear: year }));
    });
  };

  const [simulation, setSimulation] = useState<SimulationState>({
    isActive: false,
    salaryIncrease: 0,
    bonusMultiplier: 1,
    extraIncome: 0
  });

  const activeYearData = state.years[state.activeYear];

  // Initialize V2 data structure if not present
  useEffect(() => {
    if (isInitialized && activeYearData && !activeYearData.v2) {
      setState(prev => {
        const newYears = { ...prev.years };
        const currentData = newYears[prev.activeYear];
        if (!currentData.v2) {
          newYears[prev.activeYear] = {
            ...currentData,
            v2: {
              columns: [],
              settings: {
                showQuarterly: false,
                showAnnual: false,
                showMonthly: false,
                showExtraAnnual: false,
              },
              months: currentData.months.map(m => ({
                normDays: m.normDays,
                factDays: m.factDays,
                salary: m.salary,
                values: {}
              }))
            }
          };
        }
        return { ...prev, years: newYears };
      });
    }
  }, [activeYearData, setState]);

  useEffect(() => {
    if (isSimulationOpen && !simulation.isActive) {
      setSimulation(prev => ({
        ...prev,
        projectedSalary: activeYearData.bonusBase,
        bonusFrequency: 'quarterly',
        bonusType: 'coef',
        bonusValue: activeYearData.quarters?.[0]?.bonusCoef || 0.3
      }));
    } else if (!isSimulationOpen && simulation.isActive) {
      setSimulation(prev => ({ ...prev, isActive: false }));
    }
  }, [isSimulationOpen, activeYearData.bonusBase]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setExpandedQuarters(getDefaultExpandedQuarters(state.activeYear));
  }, [state.activeYear]);

  // --- Handlers ---

  const handleMonthChange = React.useCallback((monthIndex: number, field: keyof MonthData, value: number) => {
    setState(prev => {
      const newYears = { ...prev.years };
      const newMonths = [...newYears[prev.activeYear].months];
      newMonths[monthIndex] = { ...newMonths[monthIndex], [field]: value };
      
      newYears[prev.activeYear] = { ...newYears[prev.activeYear], months: newMonths };
      return { ...prev, years: newYears };
    });
  }, []);

  const addNewYear = async () => {
    const newYear = Math.max(...Object.keys(state.years).map(Number)) + 1;
    
    // Attempt to fetch correct working days
    let customNorms: number[] | undefined;
    try {
      customNorms = await CalendarService.getWorkingDays(newYear);
    } catch (e) {
      console.error(e);
    }

    setState(prev => {
      const defaultYear = generateDefaultYear(newYear, false, customNorms);
      const emptyV2 = {
        columns: [],
        settings: {
          showQuarterly: false,
          showAnnual: false,
          showMonthly: false,
          showExtraAnnual: false,
        },
        months: defaultYear.months.map(m => ({
          normDays: m.normDays,
          factDays: m.factDays,
          salary: m.salary,
          values: {}
        }))
      };

      return {
        ...prev,
        years: { 
          ...prev.years, 
          [newYear]: { ...defaultYear, v2: emptyV2 }
        },
        activeYear: newYear,
        taxBrackets: {
          ...prev.taxBrackets,
          [newYear]: prev.taxBrackets[newYear - 1] || prev.taxBrackets[2025] || DEFAULT_TAX_BRACKETS[2025]
        }
      };
    });
    showToast(`Добавлен ${newYear} год`);
  };

  const handleQuarterChange = React.useCallback((qIndex: number, field: 'bonusCoef' | 'bonusAmount', value: number) => {
    setState(prev => {
      const newYears = { ...prev.years };
      const currentYearData = newYears[prev.activeYear];
      const newQuarters = [...(currentYearData.quarters || Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 })))];
      
      const qMonths = QUARTERS[qIndex].months.map(mi => currentYearData.months[mi]);
      const qNorm = qMonths.reduce((sum, m) => sum + m.normDays, 0);
      const qFact = qMonths.reduce((sum, m) => sum + m.factDays, 0);
      const krd = qNorm > 0 ? qFact / qNorm : 0;
      const base = currentYearData.bonusBase || 0;

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
  }, []);

  const handleAnnualBonusChange = React.useCallback((field: 'annualBonusCoef' | 'annualBonusAmount' | 'extraBonusAmount' | 'bonusBase' | 'iisContribution' | 'deductions' | 'applyBaseToAll', value: number | { social?: number, property?: number, standard?: number }) => {
    if (field === 'applyBaseToAll') {
      setState(prev => {
        const base = prev.years[prev.activeYear]?.bonusBase || 0;
        const newYears = { ...prev.years };
        const currentYearData = newYears[prev.activeYear];
        const newMonths = currentYearData.months.map(m => ({ ...m, salary: base }));
        newYears[prev.activeYear] = { ...currentYearData, months: newMonths };
        
        // Use timeout to avoid calling showToast during render if setState is synchronous
        setTimeout(() => showToast(`Оклад во всех месяцах установлен равным базе (${formatCurrency(base)})`, 'success'), 0);
        return { ...prev, years: newYears };
      });
      return;
    }

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
        
        // Recalculate quarters based on new bonusBase ONLY (don't update monthly salaries)
        const newQuarters = (currentYearData.quarters || Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }))).map((q, qIndex) => {
          const qMonths = QUARTERS[qIndex].months.map(mi => currentYearData.months[mi]);
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
  }, [showToast]);

  const handleValueChange = React.useCallback((index: number, colId: string, value: number) => {
    setState(prev => {
      const newYears = { ...prev.years };
      const currentYear = newYears[prev.activeYear];
      if (!currentYear.v2) return prev;
      const newMonths = [...currentYear.v2.months];
      newMonths[index] = { 
        ...newMonths[index], 
        values: { ...newMonths[index].values, [colId]: value } 
      };
      newYears[prev.activeYear] = { ...currentYear, v2: { ...currentYear.v2, months: newMonths } };
      return { ...prev, years: newYears };
    });
  }, []);

  const handleApplyBaseToAll = React.useCallback(() => {
    handleAnnualBonusChange('applyBaseToAll', 0);
  }, [handleAnnualBonusChange]);

  const clearActiveYearData = () => {
    setState(prev => ({
      ...prev,
      years: { ...prev.years, [prev.activeYear]: generateEmptyYear(prev.activeYear) }
    }));
    showToast(`Данные за ${state.activeYear} год очищены`);
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
            bonusBase: prevData.bonusBase || 0,
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
      showToast("Нельзя удалить единственный год", "info");
      return;
    }

    setState(prev => {
      const newYears = { ...prev.years };
      delete newYears[state.activeYear];
      
      const newTaxBrackets = { ...prev.taxBrackets };
      delete newTaxBrackets[state.activeYear];
      
      const newAvailableYears = Object.keys(newYears).map(Number).sort();
      const newActiveYear = newAvailableYears.includes(state.activeYear - 1) 
        ? state.activeYear - 1 
        : newAvailableYears[newAvailableYears.length - 1];

      return { ...prev, years: newYears, activeYear: newActiveYear, taxBrackets: newTaxBrackets };
    });
    
    showToast(`${state.activeYear} год удален`);
    setIsDeleteYearModalOpen(false);
  };

  // --- Calculations ---

  const actualCalculatedMonths = useMemo(() => {
    let runningGross = 0;
    return activeYearData.months.map((m, index) => {
      // Logic for Option A: Actuals + Projections
      const isActual = m.salary > 0;
      
      let base: number;
      let displaySalary = m.salary;

      if (isActual) {
        base = m.factDays < m.normDays ? m.salary * (m.factDays / m.normDays) : m.salary;
      } else {
        base = 0;
      }
      
      let bonus = 0;
      if (index % 3 === 2) {
        const qIndex = Math.floor(index / 3);
        const qData = activeYearData.quarters?.[qIndex];
        const val = qData?.bonusAmount || 0;
        const qType = activeYearData.v2?.settings?.quarterCalcType || 'rub';
        const calcBase = activeYearData.bonusBase || 0;
        if (qType === 'percent') {
          bonus = calcBase * (val / 100);
        } else if (qType === 'coef') {
          bonus = calcBase * val;
        } else {
          bonus = val;
        }
      }

      let v2Bonus = 0;
      if (activeYearData.v2 && activeYearData.v2.months[index]) {
        const v2M = activeYearData.v2.months[index];
        const mainVal = v2M.values?.['system_main_bonus'] || 0;
        const mainType = activeYearData.v2.settings?.mainCalcType || 'rub';
        if (mainType === 'percent') {
          v2Bonus += base * (mainVal / 100);
        } else if (mainType === 'coef') {
          v2Bonus += base * mainVal;
        } else {
          v2Bonus += mainVal;
        }
        
        activeYearData.v2.columns.forEach(col => {
          let val = v2M.values?.[col.id] || 0;
          if (col.type === 'percent_base') {
             val = base * (val / 100);
          }
          v2Bonus += val;
        });
      }

      const gross = base + bonus + v2Bonus;
      runningGross += gross;

      // Better tax estimation for 2025+ (still a row-by-row approx)
      const estimatedTax = state.activeYear >= 2025 
        ? (runningGross > 2400000 ? gross * 0.15 : gross * 0.13) 
        : gross * 0.13;

      return { 
        ...m, 
        salary: displaySalary,
        base, 
        bonus, 
        gross, 
        tax13: estimatedTax, 
        net13: gross - estimatedTax,
        isProjected: false
      };
    });
  }, [activeYearData, state.activeYear]);

  const calculatedMonths = useMemo(() => {
    const isSimActive = simulation.isActive;
    const salaryMult = isSimActive ? (1 + (simulation.salaryIncrease || 0) / 100) : 1;
    
    // STANDALONE SIMULATION LOGIC
    if (isSimActive) {
      const projectionBaseSalary = simulation.projectedSalary ?? activeYearData.bonusBase;
      const displaySalary = projectionBaseSalary * salaryMult;
      
      let runningGross = 0;
      return Array.from({ length: 12 }).map((_, index) => {
        let bonus = 0;
        const monthNum = index + 1;
        
        // Bonus Calculation based on new simulation parameters
        if (simulation.bonusFrequency === 'monthly') {
          bonus = simulation.bonusType === 'fixed' ? (simulation.bonusValue ?? 0) : (projectionBaseSalary * (simulation.bonusValue ?? 0));
        } else if (simulation.bonusFrequency === 'quarterly' && monthNum % 3 === 0) {
          bonus = simulation.bonusType === 'fixed' ? (simulation.bonusValue ?? 0) : (projectionBaseSalary * (simulation.bonusValue ?? 0));
        } else if (simulation.bonusFrequency === 'annual' && monthNum === 12) {
          bonus = simulation.bonusType === 'fixed' ? (simulation.bonusValue ?? 0) : (projectionBaseSalary * (simulation.bonusValue ?? 0));
        }
        
        // Apply Bonus Multiplier to everything (user requested flexibility)
        bonus *= (simulation.bonusMultiplier || 1);

        let v2Bonus = 0;
        if (activeYearData.v2 && activeYearData.v2.months[index]) {
          const v2M = activeYearData.v2.months[index];
          const mainVal = v2M.values?.['system_main_bonus'] || 0;
          const mainType = activeYearData.v2.settings?.mainCalcType || 'rub';
          if (mainType === 'percent') {
            v2Bonus += displaySalary * (mainVal / 100);
          } else if (mainType === 'coef') {
            v2Bonus += displaySalary * mainVal;
          } else {
            v2Bonus += mainVal;
          }
          
          activeYearData.v2.columns.forEach(col => {
            let val = v2M.values?.[col.id] || 0;
            if (col.type === 'percent_base') {
               val = displaySalary * (val / 100);
            }
            v2Bonus += val;
          });
        }

        const gross = displaySalary + bonus + (v2Bonus * (simulation.bonusMultiplier || 1));
        runningGross += gross;
        
        // Simplified monthly tax calculation for simulation (doesn't account for complex deductions)
        // This is still an approximation for the UI row
        const estimatedTax = state.activeYear >= 2025 
          ? (runningGross > 2400000 ? gross * 0.15 : gross * 0.13) 
          : gross * 0.13;
        
        return {
          normDays: 20, // default placeholder
          factDays: 20, // default placeholder
          salary: displaySalary,
          base: displaySalary,
          bonus: bonus,
          gross: gross,
          tax13: estimatedTax,
          net13: gross - estimatedTax,
          isProjected: true
        } as CalculatedMonth;
      });
    }

    return actualCalculatedMonths;
  }, [activeYearData, simulation, actualCalculatedMonths, state.activeYear]);

  const prevYearData = state.years[state.activeYear - 1];
  const { yearlyTotals, grossDiff, netDiff } = useIncomeTotals({
    activeYear: state.activeYear,
    activeYearData,
    prevYearData,
    deposits,
    taxSettings,
    taxBrackets: state.taxBrackets,
    simulation
  });

  const formatVal = (val: number) => <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(val)}</PrivacyBlur>;

  if (!isInitialized || !activeYearData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm font-medium">Загрузка данных...</span>
        </div>
      </div>
    );
  }

  return (
    <div id="income-tracker-content" className="relative text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300 selection:bg-primary-500/30 min-h-screen">
      <div className="max-w-full lg:max-w-6xl mx-auto space-y-6">

        {/* Top Summary Section Wrapper */}
        <div className="hidden md:flex flex-col gap-3">
          <YearSummary 
            yearlyTotals={yearlyTotals}
            netDiff={netDiff}
            grossDiff={grossDiff}
            prevYear={prevYear}
            handleCopy={handleCopy}
            isPrivate={isPrivate}
            onShowTaxInfo={() => setIsTaxInfoModalOpen(true)}
            isSimulated={simulation.isActive}
          />
        </div>

        <div className="flex flex-col gap-3 lg:bg-white lg:dark:bg-slate-950 lg:rounded-3xl lg:shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] lg:border lg:border-slate-200/60 lg:dark:border-slate-800/60 lg:p-2 lg:pt-3 lg:px-2">
          <div className="flex flex-col">
            {/* Scenario Simulator (Collapsible) */}
            <div 
              className={cn(
                "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out",
                isSimulationOpen ? "grid-rows-[1fr] opacity-100 pointer-events-auto mb-4" : "grid-rows-[0fr] opacity-0 pointer-events-none mb-0"
              )}
            >
              <div className={cn("min-h-0", isSimulationOpen ? "overflow-visible" : "overflow-hidden")}>
                  <ScenarioSimulator 
                    simulation={simulation}
                    onUpdate={setSimulation}
                    bonusBase={activeYearData.bonusBase}
                    averageMonthlyNet={yearlyTotals.finalNet / 12}
                  />
              </div>
            </div>

            {/* Tabs & Toolbar */}
            <div>
              <YearTabs 
                availableYears={availableYears}
                activeYear={state.activeYear}
                setActiveYear={handleSetActiveYear}
                addNewYear={addNewYear}
                setIsDeleteYearModalOpen={setIsDeleteYearModalOpen}
                setIsClearModalOpen={setIsClearModalOpen}
                prevYear={prevYear}
                copyFromPreviousYear={() => setIsCopyModalOpen(true)}
                onExportPDF={async () => {
                  const { exportToPDF } = await import('../../services/ExportService');
                  const success = await exportToPDF(null, {
                    totalGross: yearlyTotals.totalGross,
                    totalNet: yearlyTotals.finalNet,
                    totalTax: yearlyTotals.progressiveTax,
                    effectiveRate: yearlyTotals.effectiveRate
                  }, undefined, {
                    months: calculatedMonths,
                    totals: yearlyTotals
                  });
                }}
                onExportXLSX={async () => {
                  const { exportIncomeToXLSX } = await import('../../services/ExportService');
                  exportIncomeToXLSX(calculatedMonths, state.activeYear, yearlyTotals);
                }}
                isSimulationOpen={isSimulationOpen}
                setIsSimulationOpen={setIsSimulationOpen}
                onOpenStructureConfig={() => setIsV2ConfigOpen(true)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-8 md:gap-10">
            {/* Mobile Layout (Cards) */}
            <div className="block lg:hidden">
              {activeYearData.v2 && (
                <IncomeMobileView
                  activeYearData={activeYearData}
                  calculatedMonths={calculatedMonths}
                  yearlyTotals={yearlyTotals}
                  expandedQuarters={expandedQuarters}
                  onToggleQuarter={(qIndex) => setExpandedQuarters(prev => ({ ...prev, [qIndex]: !prev[qIndex] }))}
                  handleAnnualBonusChange={handleAnnualBonusChange}
                  handleQuarterChange={handleQuarterChange}
                  handleMonthChange={handleMonthChange}
                  onValueChange={handleValueChange}
                  onApplyBaseToAll={handleApplyBaseToAll}
                  isPrivate={isPrivate}
                  isSimulationOpen={isSimulationOpen}
                />
              )}
            </div>

            {/* Desktop Layout (Table) */}
            <div className="hidden lg:block">
              {activeYearData.v2 && (
                <IncomeDesktopTable
                  yearKey={state.activeYear}
                  activeYearData={activeYearData}
                  calculatedMonths={calculatedMonths}
                  yearlyTotals={yearlyTotals}
                  handleQuarterChange={handleQuarterChange}
                  handleMonthChange={handleMonthChange}
                  handleAnnualBonusChange={handleAnnualBonusChange}
                  onShowTaxInfo={() => setIsTaxInfoModalOpen(true)}
                  isPrivate={isPrivate}
                  onValueChange={handleValueChange}
                />
              )}
            </div>
          </div>
        </div>

      </div>

      {activeYearData.v2 && (
        <IncomeTableConfigDialog 
          isOpen={isV2ConfigOpen}
          onClose={() => setIsV2ConfigOpen(false)}
          columns={activeYearData.v2.columns}
          settings={activeYearData.v2.settings}
          baseSalary={activeYearData.bonusBase || 0}
          onSave={(columns, settings, baseSalary, applyBaseToAll) => {
            setState(prev => {
              const newYears = { ...prev.years };
              const currentYear = newYears[prev.activeYear];
              if (!currentYear.v2) return prev;
              
              let newMonths = [...currentYear.months];
              let newV2Months = [...currentYear.v2.months];
              
              if (applyBaseToAll && baseSalary > 0) {
                newMonths = currentYear.months.map(m => ({ ...m, salary: baseSalary }));
                newV2Months = currentYear.v2.months.map(m => ({ ...m, salary: baseSalary }));
              }
              
              // Recalculate quarters if bonusBase changed
              let newQuarters = currentYear.quarters;
              let newAnnualAmount = settings.showAnnual ? (currentYear.annualBonusAmount || 0) : 0;
              let newExtraBonusAmount = settings.showExtraAnnual ? (currentYear.extraBonusAmount || 0) : 0;
              
              if (baseSalary !== currentYear.bonusBase) {
                 newQuarters = (currentYear.quarters || Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }))).map((q, qIndex) => {
                  const qMonths = QUARTERS[qIndex].months.map(mi => newMonths[mi]);
                  const qNorm = qMonths.reduce((sum, m) => sum + m.normDays, 0);
                  const qFact = qMonths.reduce((sum, m) => sum + m.factDays, 0);
                  const krd = qNorm > 0 ? qFact / qNorm : 0;
                  return {
                    ...q,
                    bonusAmount: q.bonusCoef ? Math.round((baseSalary * q.bonusCoef * krd) * 100) / 100 : q.bonusAmount
                  };
                });
                
                if (settings.showAnnual) {
                  const yNorm = newMonths.reduce((sum, m) => sum + m.normDays, 0);
                  const yFact = newMonths.reduce((sum, m) => sum + m.factDays, 0);
                  const krdg = yNorm > 0 ? yFact / yNorm : 0;
                  newAnnualAmount = Math.round((baseSalary * (currentYear.annualBonusCoef || 0) * krdg) * 100) / 100;
                }
              }
              
              newYears[prev.activeYear] = {
                ...currentYear,
                bonusBase: baseSalary,
                months: newMonths,
                quarters: newQuarters,
                annualBonusAmount: newAnnualAmount,
                extraBonusAmount: newExtraBonusAmount,
                v2: { 
                  ...currentYear.v2, 
                  columns,
                  settings,
                  months: newV2Months
                }
              };
              return { ...prev, years: newYears };
            });
            showToast('Настройки таблицы успешно сохранены');
          }}
        />
      )}

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

      {/* Copy Year Modal */}
      {prevYear !== null && (
        <CopyYearModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          onConfirm={copyFromPreviousYear}
          prevYear={prevYear}
        />
      )}

      {/* Tax Info Modal */}
      <TaxReferenceModal 
        isOpen={isTaxInfoModalOpen}
        onClose={() => setIsTaxInfoModalOpen(false)}
        year={state.activeYear}
        brackets={state.taxBrackets[state.activeYear] || DEFAULT_TAX_BRACKETS[2025] || []}
      />
    </div>
  );
}
