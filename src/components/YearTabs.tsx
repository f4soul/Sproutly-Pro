import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Copy, ChevronDown, Settings, Download } from 'lucide-react';
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
  onExportPDF?: () => void;
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
  onExportPDF,
}: YearTabsProps) => {
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  return (
    <div className="apple-card p-4 sm:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 relative z-40">
      
      {/* Left Side (Desktop) / Top Row (Mobile) */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 w-full xl:w-auto">
        {/* Icon & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Calendar size={18} className="sm:w-5 sm:h-5" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-light-text-primary dark:text-dark-text-primary whitespace-nowrap">Расчетный год</h2>
        </div>

        {/* Desktop Tabs & Add/Delete */}
        <div className="hidden xl:flex items-center gap-2">
          <div className="flex bg-[#F5F5F7] dark:bg-white/5 p-1 rounded-xl">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setActiveYear(year)}
                className={cn(
                  "apple-button px-4 py-2 text-sm font-bold transition-all whitespace-nowrap relative",
                  activeYear === year 
                    ? "text-indigo-600 dark:text-indigo-400" 
                    : "text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary hover:bg-white/50 dark:hover:bg-white/10"
                )}
              >
                {activeYear === year && (
                  <motion.div 
                    layoutId="activeYear"
                    className="absolute inset-0 bg-white dark:bg-white/10 rounded-lg shadow-sm -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {year}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-[#F5F5F7] dark:bg-white/5 p-1 rounded-xl shrink-0">
            <button 
              onClick={addNewYear}
              className="apple-button p-1.5 text-light-text-secondary hover:text-indigo-600 dark:text-dark-text-secondary dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-white/10 shadow-sm"
              title="Добавить новый год"
            >
              <Plus size={18} />
            </button>
            <button 
              onClick={() => setIsDeleteYearModalOpen(true)}
              disabled={availableYears.length <= 1}
              className="apple-button p-1.5 text-light-text-secondary hover:text-rose-600 dark:text-dark-text-secondary dark:hover:text-rose-400 hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent shadow-sm"
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
              className="apple-button w-full flex items-center justify-between bg-white dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary text-sm font-bold pl-4 pr-3 py-2 shadow-sm hover:bg-[#F5F5F7] dark:hover:bg-white/5"
            >
              <span>{activeYear} год</span>
              <ChevronDown size={16} className={cn("text-light-text-secondary transition-transform duration-200", isYearDropdownOpen && "rotate-180")} />
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
                    className="absolute top-full left-0 right-0 mt-2 bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border border-light-border dark:border-dark-border rounded-xl shadow-xl z-50 overflow-hidden"
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
                            : "text-light-text-primary dark:text-dark-text-primary hover:bg-[#F5F5F7] dark:hover:bg-white/5"
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
          <div className="flex items-center gap-1 bg-[#F5F5F7] dark:bg-white/5 p-1 rounded-xl shrink-0">
            <button 
              onClick={addNewYear}
              className="apple-button p-1.5 text-light-text-secondary hover:text-indigo-600 dark:text-dark-text-secondary dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-white/10 shadow-sm"
              title="Добавить новый год"
            >
              <Plus size={18} />
            </button>
            <button 
              onClick={() => setIsDeleteYearModalOpen(true)}
              disabled={availableYears.length <= 1}
              className="apple-button p-1.5 text-light-text-secondary hover:text-rose-600 dark:text-dark-text-secondary dark:hover:text-rose-400 hover:bg-white dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent shadow-sm"
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
            className="apple-button flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3 sm:py-2 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/50 whitespace-nowrap"
            title="Очистить данные за год"
          >
            <Trash2 size={16} /> <span className="hidden sm:inline">Очистить</span>
          </button>
          {prevYear !== null && (
            <button 
              onClick={copyFromPreviousYear}
              className="apple-button flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3 sm:py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/50 whitespace-nowrap"
              title={`Скопировать из ${prevYear}`}
            >
              <Copy size={16} /> <span className="hidden sm:inline">Из {prevYear}</span>
            </button>
          )}
          {onExportPDF && (
            <button 
              onClick={onExportPDF}
              className="apple-button flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-3 sm:py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50 whitespace-nowrap"
              title="Экспорт в PDF"
            >
              <Download size={16} /> <span className="hidden sm:inline">PDF</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
