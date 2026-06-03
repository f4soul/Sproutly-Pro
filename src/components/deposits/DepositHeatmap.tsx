import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';
import { AnimatePresence } from 'motion/react';
import { Deposit } from '../../types';
import { calculateDepositDensity } from '../../lib/depositCalculations';
import { cn } from '../../lib/utils';
import { HeatmapFilters } from './heatmap/HeatmapFilters';
import { HeatmapMonthCard } from './heatmap/HeatmapMonthCard';
import { HeatmapExpandedMonth } from './heatmap/HeatmapExpandedMonth';
import { HeatmapLegend } from './heatmap/HeatmapLegend';

interface DepositHeatmapProps {
  deposits: Deposit[];
  year: number;
  isPrivate?: boolean;
}

export function DepositHeatmap({ deposits, year: initialYear, isPrivate = false }: DepositHeatmapProps) {
  const [displayYear, setDisplayYear] = useState(initialYear);
  const [expandedMonth, setExpandedMonth] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | 'all'>('all');

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync expandedMonth year with displayYear dynamically
  useEffect(() => {
    if (expandedMonth && expandedMonth.getFullYear() !== displayYear) {
      setExpandedMonth(null);
      setSelectedDay(null);
    }
  }, [displayYear, expandedMonth]);

  const activeDeposits = useMemo(() => deposits.filter(d => !d.isArchived), [deposits]);

  const uniqueBanks = useMemo(() => {
    const banks = Array.from(new Set(activeDeposits.map(d => d.bank))).filter(Boolean).sort();
    return banks;
  }, [activeDeposits]);

  const filteredDeposits = useMemo(() => {
    if (selectedBank === 'all') return activeDeposits;
    return activeDeposits.filter(d => d.bank === selectedBank);
  }, [activeDeposits, selectedBank]);

  const heatmapData = useMemo(() => calculateDepositDensity(filteredDeposits, displayYear), [filteredDeposits, displayYear]);

  const months = useMemo(() => {
    return eachMonthOfInterval({
      start: startOfYear(new Date(displayYear, 0, 1)),
      end: endOfYear(new Date(displayYear, 0, 1))
    });
  }, [displayYear]);

  return (
    <div className="flex-1 flex flex-col w-full relative min-h-0">
      <div className="flex-1 w-full max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl mx-auto flex flex-col justify-between min-h-0 gap-4 sm:gap-5 lg:gap-3">
        
        <HeatmapFilters 
          displayYear={displayYear}
          setDisplayYear={setDisplayYear}
          setExpandedMonth={setExpandedMonth}
          selectedBank={selectedBank}
          setSelectedBank={setSelectedBank}
          uniqueBanks={uniqueBanks}
        />

        <div 
          className={cn(
            "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-4 xl:gap-6 transition-all duration-300 ease-out w-full items-start mt-auto",
            expandedMonth && "opacity-30 blur-md scale-[0.96] pointer-events-none grayscale-[50%]"
          )}
        >
          {months.map((month) => (
            <HeatmapMonthCard 
              key={month.toString()} 
              month={month} 
              heatmapData={heatmapData} 
              setExpandedMonth={setExpandedMonth} 
            />
          ))}
        </div>
        
        <HeatmapLegend className="mt-auto" />

      </div>

      {/* 4. The Focal Popup Calendar (Magic Move) */}
      {isMounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {expandedMonth && (
            <HeatmapExpandedMonth
              expandedMonth={expandedMonth}
              setExpandedMonth={setExpandedMonth}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              heatmapData={heatmapData}
              isPrivate={isPrivate}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
