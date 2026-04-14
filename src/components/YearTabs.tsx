import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Copy, ChevronDown, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface YearTabsProps {
  availableYears: number[];
  activeYear: number;
  setActiveYear: (year: number) => void;
  addNewYear: () => void;
  setIsDeleteYearModalOpen: (open: boolean) => void;
  setIsClearModalOpen: (open: boolean) => void;
  prevYear: number | null;
  copyFromPreviousYear: () => void;
}

export const YearTabs = ({
  availableYears,
  activeYear,
  setActiveYear,
  addNewYear,
  setIsDeleteYearModalOpen,
  setIsClearModalOpen,
  prevYear,
  copyFromPreviousYear,
}: YearTabsProps) => {
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 p-4 sm:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 relative z-40">
      
      {/* Left Side (Desktop) / Top Row (Mobile) */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 w-full xl:w-auto">
        {/* Icon & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Calendar size={18} className="sm:w-5 sm:h-5" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">Расчетный год</h2>
        </div>

        {/* Desktop Tabs & Add/Delete */}
        <div className="hidden xl:flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setActiveYear(year)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap relative cursor-pointer",
                  activeYear === year 
                    ? "text-indigo-600 dark:text-indigo-400" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                )}
              >
                {activeYear === year && (
                  <motion.div 
                    layoutId="activeYear"
                    className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-sm -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {year}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl shrink-0">
            <button 
              onClick={addNewYear}
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shadow-sm"
              title="Добавить новый год"
            >
              <Plus size={18} />
            </button>
            <button 
              onClick={() => setIsDeleteYearModalOpen(true)}
              disabled={availableYears.length <= 1}
              className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer shadow-sm"
              title="Удалить текущий год"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Right Side (Desktop) / Bottom Row (Mobile) */}
      <div className="flex items-center justify-between w-full xl:w-auto gap-2">
        
        {/* Mobile Dropdown & Add/Delete (Hidden on Desktop) */}
        <div className="flex xl:hidden items-center gap-2 flex-1">
          {/* Dropdown */}
          <div className="relative flex-1">
            <button
              onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              className="w-full flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm font-bold rounded-xl pl-4 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <span>{activeYear} год</span>
              <ChevronDown size={16} className={cn("text-slate-500 transition-transform duration-200", isYearDropdownOpen && "rotate-180")} />
            </button>
            
            <AnimatePresence>
              {isYearDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsYearDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    {availableYears.map(year => (
                      <button
                        key={year}
                        onClick={() => {
                          setActiveYear(year);
                          setIsYearDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 text-sm font-bold transition-colors cursor-pointer",
                          activeYear === year 
                            ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        )}
                      >
                        {year} год
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Add/Delete Mobile */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl shrink-0">
            <button 
              onClick={addNewYear}
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shadow-sm"
              title="Добавить новый год"
            >
              <Plus size={18} />
            </button>
            <button 
              onClick={() => setIsDeleteYearModalOpen(true)}
              disabled={availableYears.length <= 1}
              className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer shadow-sm"
              title="Удалить текущий год"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Actions: Clear & Copy (Both Mobile & Desktop) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button 
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3 sm:py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800/50 cursor-pointer whitespace-nowrap"
            title="Очистить данные за год"
          >
            <Trash2 size={16} /> <span className="hidden sm:inline">Очистить</span>
          </button>
          {prevYear !== null && (
            <button 
              onClick={copyFromPreviousYear}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3 sm:py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800 cursor-pointer whitespace-nowrap"
              title={`Скопировать из ${prevYear}`}
            >
              <Copy size={16} /> <span className="hidden sm:inline">Из {prevYear}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
