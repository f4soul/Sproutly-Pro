import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Copy, FileText, FileSpreadsheet, TrendingUp, X, ChevronDown, MoreVertical } from 'lucide-react';
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
  onExportXLSX?: () => void;
  isSimulationOpen: boolean;
  setIsSimulationOpen: (open: boolean) => void;
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
  onExportXLSX,
  isSimulationOpen,
  setIsSimulationOpen
}: YearTabsProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(event.target as Node)) {
        setIsDesktopMenuOpen(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-1 md:p-2 lg:p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
      
      {/* ================= UNIFIED HEADER VIEW ================= */}
      <div className="flex justify-between items-center w-full relative">
        {/* Left Elements: Tabs (Desktop) / Dropdown (Mobile) + Add/Del */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Desktop Tabs: visible only on XL and up */}
          <div className="hidden xl:flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border-slate-100 dark:border-slate-800">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setActiveYear(year)}
                className={cn(
                  "px-3 py-2.5 text-xs lg:text-sm font-bold rounded-lg transition-all",
                  year === activeYear 
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-slate-200 dark:ring-slate-600" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {year}
              </button>
            ))}
          </div>

          {/* Mobile/Tablet Dropdown: visible below XL resolution */}
          <div className="relative xl:hidden" ref={yearDropdownRef}>
            <button
               onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
               className="flex items-center gap-1.5 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-xl border-slate-200 dark:border-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-10"
            >
              <span className="font-bold text-slate-800 dark:text-white text-sm md:text-base">{activeYear}</span>
              <ChevronDown size={14} className={cn("text-slate-500 transition-transform", isYearDropdownOpen && "rotate-180")} />
            </button>
            {isYearDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden flex flex-col py-1 max-h-60 overflow-y-auto">
                {availableYears.map(year => (
                  <button
                    key={year}
                    onClick={() => { setActiveYear(year); setIsYearDropdownOpen(false); }}
                    className={cn(
                      "px-4 py-2 text-left font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-700",
                      year === activeYear ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10" : "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border-slate-100 dark:border-slate-800">
            <button 
              onClick={addNewYear}
              className="flex items-center justify-center p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              title="Добавить новый год"
            >
              <Plus size={20} />
            </button>
            <button 
              onClick={() => setIsDeleteYearModalOpen(true)}
              disabled={availableYears.length <= 1}
              className="flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none p-2.5 focus:ring-2 focus:ring-rose-500/50"
              title="Удалить текущий год"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Right Elements: Quick Actions + 3 Dots Menu */}
        <div className="flex items-center gap-1 sm:gap-1.5" ref={mobileMenuRef}>
          {prevYear !== null && (
            <button 
              onClick={copyFromPreviousYear}
              className="flex items-center justify-center p-2.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-colors hidden sm:block focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              title={`Скопировать из ${prevYear}`}
            >
              <Copy size={20} />
            </button>
          )}
          <button 
            onClick={() => setIsClearModalOpen(true)}
            className="flex items-center justify-center p-2.5 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-colors hidden sm:block focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            title="Очистить данные за год"
          >
            <Trash2 size={20} />
          </button>
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              "flex items-center justify-center p-2.5 rounded-xl transition-colors relative z-20 focus:outline-none focus:ring-2 focus:ring-slate-500/50 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
              isMobileMenuOpen 
                ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            )}
            title="Дополнительно"
          >
            <MoreVertical size={20} />
            {isSimulationOpen && !isMobileMenuOpen && (
               <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full border border-white dark:border-slate-800"></span>
            )}
          </button>

          {/* Absolute Menu Box */}
          {isMobileMenuOpen && (
             <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden flex flex-col py-1">
                {/* WHAT-IF - shown on all screens since the explicit button is removed */}
                <button 
                  onClick={() => { setIsSimulationOpen(!isSimulationOpen); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-full text-left"
                >
                  <div className={cn(
                    "p-1.5 rounded-md", 
                    isSimulationOpen ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400"
                  )}>
                    {isSimulationOpen ? <X size={14} /> : <TrendingUp size={14} />}
                  </div>
                  <span className={cn(isSimulationOpen ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-700 dark:text-slate-300")}>
                    {isSimulationOpen ? 'Выключить What-If' : 'Включить What-If'}
                  </span>
                </button>
                
                <div className="h-px bg-slate-100 dark:bg-slate-700/50 mx-2 my-1"></div>

                {/* Mobile only visible elements like Copy and Clean*/}
                {prevYear !== null && (
                  <button 
                    onClick={() => { copyFromPreviousYear(); setIsMobileMenuOpen(false); }}
                    className="flex sm:hidden items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-full text-left"
                  >
                    <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-500"><Copy size={14} /></div>
                    Скопировать пред. год
                  </button>
                )}
                
                <button 
                  onClick={() => { setIsClearModalOpen(true); setIsMobileMenuOpen(false); }}
                  className="flex sm:hidden items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-full text-left"
                >
                  <div className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-900/20 text-rose-500"><Trash2 size={14} /></div>
                  Очистить таблицу
                </button>
                
                <div className="flex sm:hidden h-px bg-slate-100 dark:bg-slate-700/50 mx-2 my-1"></div>

                <button 
                  onClick={() => { onExportPDF?.(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-full text-left"
                >
                  <div className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-900/20 text-rose-500"><FileText size={14} /></div>
                  Экспорт в PDF
                </button>
                
                <button 
                  onClick={() => { onExportXLSX?.(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-full text-left"
                >
                   <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500"><FileSpreadsheet size={14} /></div>
                  Экспорт в Excel
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
