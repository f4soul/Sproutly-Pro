import React, { useState, useEffect } from 'react';
import { YearData, YearlyTotals, CalculatedMonth } from '../types';
import { QUARTERS } from '../lib/constants';
import { BonusConfigControls } from './BonusConfigControls';
import { QuarterAccordion } from './QuarterAccordion';
import { AnnualBonusSection } from './AnnualBonusSection';
import { motion, AnimatePresence } from 'motion/react';

interface IncomeMobileViewProps {
  activeYearData: YearData;
  calculatedMonths: CalculatedMonth[];
  yearlyTotals: YearlyTotals;
  expandedQuarters: Record<number, boolean>;
  onToggleQuarter: (qIndex: number) => void;
  handleAnnualBonusChange: (field: 'annualBonusCoef' | 'annualBonusAmount' | 'extraBonusAmount' | 'bonusBase' | 'iisContribution' | 'deductions', value: number | { social?: number, property?: number, standard?: number }) => void;
  handleQuarterChange: (qIndex: number, field: 'bonusCoef' | 'bonusAmount', value: number) => void;
  handleMonthChange: (monthIndex: number, field: 'normDays' | 'factDays' | 'salary', value: number) => void;
  isPrivate?: boolean;
}

export function IncomeMobileView({
  activeYearData,
  calculatedMonths,
  yearlyTotals,
  expandedQuarters,
  onToggleQuarter,
  handleAnnualBonusChange,
  handleQuarterChange,
  handleMonthChange,
  isPrivate = false
}: IncomeMobileViewProps) {
  const [showStickyFooter, setShowStickyFooter] = useState(false);
  const formatVal = (val: number) => isPrivate ? '••••••' : `${new Intl.NumberFormat('ru-RU').format(Math.round(val))} ₽`;

  useEffect(() => {
    const handleScroll = () => {
      // Show footer if scrolled down (e.g. past the top summary card which is approx 300px)
      if (window.scrollY > 300) {
        setShowStickyFooter(true);
      } else {
        setShowStickyFooter(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="block lg:hidden space-y-4 pb-24 relative">
      {/* Header Settings Card - Ultra Compact */}
      <div className="md:max-w-2xl md:mx-auto w-full mb-2">
        <BonusConfigControls
          compact
          activeYearData={activeYearData}
          onBonusBaseChange={(value) => handleAnnualBonusChange('bonusBase', value)}
          onQuarterCoefChange={(qIndex, value) => handleQuarterChange(qIndex, 'bonusCoef', value)}
          onAnnualCoefChange={(value) => handleAnnualBonusChange('annualBonusCoef', value)}
        />
      </div>

      {/* Quarters Accordion - 1 col grid everywhere on mobile/tablet */}
      <div className="grid grid-cols-1 gap-4 md:max-w-2xl md:mx-auto w-full">
        {QUARTERS.map((q, qIndex) => (
          <QuarterAccordion 
            key={qIndex}
            q={q}
            qIndex={qIndex}
            isExpanded={expandedQuarters[qIndex]}
            onToggle={() => onToggleQuarter(qIndex)}
            activeYearData={activeYearData}
            calculatedMonths={calculatedMonths}
            handleQuarterChange={handleQuarterChange}
            handleMonthChange={handleMonthChange}
          />
        ))}
      </div>

      {/* Annual/Extra Bonus Cards */}
      <div className="mt-6 md:max-w-2xl md:mx-auto w-full">
        <AnnualBonusSection 
          activeYearData={activeYearData}
          handleAnnualBonusChange={handleAnnualBonusChange}
          calculatedMonths={calculatedMonths}
          yearlyTotals={yearlyTotals}
          isMobile={true}
          isPrivate={isPrivate}
        />
      </div>

      {/* Sticky Bottom Summary for Mobile/Tablet */}
      <AnimatePresence>
        {showStickyFooter && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,16px))] md:bottom-8 left-4 right-4 sm:left-6 sm:right-6 xl:hidden z-40 pointer-events-none drop-shadow-2xl max-w-xl mx-auto md:left-[calc(256px+1.5rem)] md:right-6"
          >
            <div className="bg-white/70 dark:bg-black/70 backdrop-blur-2xl rounded-2xl p-4 shadow-lg border border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center pointer-events-auto">
              <div className="flex flex-col">
                <span className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-bold uppercase tracking-widest leading-tight mb-0.5">Финальный Net за год</span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-light-text-primary dark:text-dark-text-primary tracking-tight">
                  {formatVal(yearlyTotals.finalNet)}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-bold uppercase tracking-widest leading-tight mb-0.5">Total Gross</span>
                <span className="text-sm font-mono font-medium text-light-text-secondary dark:text-dark-text-secondary">
                  {formatVal(yearlyTotals.totalGross)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
