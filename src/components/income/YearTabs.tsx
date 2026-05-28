import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Copy, FileText, FileSpreadsheet, TrendingUp, X, ChevronDown, Zap, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

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
    <div id="year-tabs-island" className="relative z-30">
      <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-1 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-slate-200 dark:border-slate-800 w-full">
        {/* Left Elements: Tabs (Desktop) / Dropdown (Mobile) + Add/Del */}
        <div className="flex items-center gap-1">
          {/* Desktop Tabs: visible only on XL and up */}
          <div className="hidden xl:flex items-center bg-slate-50 dark:bg-slate-900/50 p-0.5 rounded-xl border border-slate-200/60 dark:border-white/[0.05] shadow-sm gap-0.5 h-9">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setActiveYear(year)}
                className={cn(
                  "px-4 text-[10px] xl:text-xs font-bold rounded-lg transition-all relative h-full flex items-center justify-center min-w-[65px] z-10",
                  year === activeYear 
                    ? "text-primary-600 dark:text-primary-400" 
                    : "text-slate-500 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-white/5"
                )}
              >
                <span className="relative z-20">{year}</span>
                {year === activeYear && (
                  <motion.div 
                    layoutId="activeYearPill"
                    className="absolute inset-0 bg-white dark:bg-primary-500/10 rounded-xl z-10 shadow-sm ring-1 ring-black/5 dark:ring-primary-400/30"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Mobile/Tablet Dropdown: visible below XL resolution */}
          <div className="relative xl:hidden" ref={yearDropdownRef}>
            <button
               onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
               className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/[0.05] transition-all shadow-sm h-9"
            >
              <span className="font-bold text-slate-800 dark:text-white text-xs">{activeYear}</span>
              <ChevronDown size={14} className={cn("text-slate-500 transition-transform", isYearDropdownOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {isYearDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute top-full left-0 mt-2 w-32 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/60 dark:border-white/[0.08] z-50 flex flex-col p-1.5 gap-0.5 max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => {
                        setActiveYear(year);
                        setIsYearDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-xs rounded-xl font-bold transition-all duration-200 border border-transparent flex items-center justify-between gap-2",
                        year === activeYear 
                          ? "bg-slate-100/80 dark:bg-slate-800/70 text-slate-900 dark:text-white border-slate-200/50 dark:border-white/[0.05] shadow-sm font-black" 
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:border-slate-200/40 dark:hover:border-white/[0.04] hover:shadow-sm"
                      )}
                    >
                      <span>{year} год</span>
                      {year === activeYear && (
                        <Check size={12} className="text-emerald-500 animate-fade-in shrink-0 stroke-[2.5px]" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-white/[0.05] shadow-sm p-0.5 gap-0.5 h-9">
            <button 
              onClick={addNewYear}
              className="flex items-center justify-center w-[30px] h-full text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-slate-800 focus:outline-none"
              title="Добавить новый год"
            >
              <Plus size={16} />
            </button>
            <button 
              onClick={() => setIsDeleteYearModalOpen(true)}
              disabled={availableYears.length <= 1}
              className="flex items-center justify-center w-[30px] h-full text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none"
              title="Удалить текущий год"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Right Elements: Quick Actions + 3 Dots Menu */}
        <div className="flex items-center gap-1" ref={mobileMenuRef}>
          <div className="hidden sm:flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-white/[0.05] shadow-sm p-0.5 gap-0.5 h-9">
            {prevYear !== null && (
              <button 
                onClick={copyFromPreviousYear}
                className="flex items-center justify-center w-[30px] h-full text-primary-600 dark:text-primary-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
                title={`Скопировать из ${prevYear}`}
              >
                <Copy size={15} />
              </button>
            )}
            <button 
              onClick={() => setIsClearModalOpen(true)}
              className="flex items-center justify-center w-[30px] h-full text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
              title="Очистить данные за год"
            >
              <Trash2 size={15} />
            </button>
          </div>
          
          <div className="w-px h-5 bg-slate-200/50 dark:bg-slate-950 mx-0.5 hidden sm:block" />

          <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-white/[0.05] shadow-sm p-0.5 h-9">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                "flex items-center justify-center w-[30px] h-full rounded-lg transition-all relative z-20 focus:outline-none",
                isMobileMenuOpen 
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100"
              )}
              title="Дополнительно"
            >
              <div className="w-4 h-4 flex flex-col justify-center items-center relative text-current select-none pointer-events-none">
                <span className={cn("absolute h-[1.5px] w-3.5 rounded-full bg-current transition-transform duration-300", isMobileMenuOpen ? "rotate-45" : "-translate-y-1")} />
                <span className={cn("absolute h-[1.5px] w-3.5 rounded-full bg-current transition-transform duration-300", isMobileMenuOpen ? "-rotate-45" : "translate-y-1")} />
              </div>
              {isSimulationOpen && !isMobileMenuOpen && (
                 <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary-500 rounded-full border border-white dark:border-slate-800"></span>
              )}
            </button>
          </div>

          {/* Absolute Menu Box */}
          <AnimatePresence>
            {isMobileMenuOpen && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 5 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 5 }}
                 className="absolute top-full right-0 mt-2 w-56 h-max bg-white/95 dark:bg-slate-950/90 backdrop-blur-2xl rounded-[1.25rem] shadow-[0_16px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] border border-slate-200/50 dark:border-white/[0.08] z-50 flex flex-col p-1.5 focus:outline-none"
               >
                  {/* WHAT-IF - shown on all screens since the explicit button is removed */}
                  <button 
                    onClick={() => { setIsSimulationOpen(!isSimulationOpen); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-slate-100 transition-colors w-full text-left"
                  >
                    <div className={cn(
                      "p-1.5 rounded-md transition-all duration-300", 
                      isSimulationOpen 
                        ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    )}>
                      <Zap size={14} fill={isSimulationOpen ? "currentColor" : "none"} className={isSimulationOpen ? "animate-pulse" : ""} />
                    </div>
                    <span className={cn(
                      "transition-colors",
                      isSimulationOpen ? "text-primary-600 dark:text-primary-400 font-extrabold" : "text-slate-700 dark:text-slate-300"
                    )}>
                      {isSimulationOpen ? 'Остановить симуляцию' : 'What-If'}
                    </span>
                  </button>
                  
                  <div className="h-px bg-slate-100 dark:bg-white/[0.08] mx-2 my-1"></div>

                  {/* Mobile only visible elements like Copy and Clean*/}
                  {prevYear !== null && (
                    <button 
                      onClick={() => { copyFromPreviousYear(); setIsMobileMenuOpen(false); }}
                      className="flex sm:hidden items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-slate-100 transition-colors w-full text-left"
                    >
                      <div className="p-1.5 rounded-md bg-primary-50 dark:bg-primary-950/10 text-primary-500 dark:text-primary-400"><Copy size={14} /></div>
                      Скопировать пред. год
                    </button>
                  )}
                  
                  <button 
                    onClick={() => { setIsClearModalOpen(true); setIsMobileMenuOpen(false); }}
                    className="flex sm:hidden items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-slate-100 transition-colors w-full text-left"
                  >
                    <div className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/10 text-rose-500 dark:text-rose-400"><Trash2 size={14} /></div>
                    Очистить таблицу
                  </button>
                  
                  <div className="flex sm:hidden h-px bg-slate-100 dark:bg-white/[0.08] mx-2 my-1"></div>

                  <button 
                    onClick={() => { onExportPDF?.(); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-slate-100 transition-colors w-full text-left"
                  >
                    <div className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/10 text-rose-500 dark:text-rose-400"><FileText size={14} /></div>
                    Экспорт в PDF
                  </button>
                  
                  <button 
                    onClick={() => { onExportXLSX?.(); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-slate-100 transition-colors w-full text-left"
                  >
                     <div className="p-1.5 rounded-md bg-primary-50 dark:bg-primary-950/10 text-primary-500 dark:text-primary-400"><FileSpreadsheet size={14} /></div>
                    Экспорт в Excel
                  </button>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
