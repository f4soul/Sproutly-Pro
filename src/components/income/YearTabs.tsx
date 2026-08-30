import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, BrushCleaning, Copy, FileText, FileSpreadsheet, ChevronDown, Zap, Check, Bolt } from 'lucide-react';
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
  onOpenStructureConfig?: () => void;
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
  setIsSimulationOpen,
  onOpenStructureConfig
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
      <div className="flex items-center justify-between bg-white dark:bg-slate-950 lg:bg-transparent lg:dark:bg-transparent p-1 lg:p-0 rounded-2xl lg:rounded-none shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] lg:shadow-none border border-slate-200 dark:border-slate-800 lg:border-none w-full">
        {/* Left Elements: Tabs (Desktop) / Dropdown (Mobile) + Add/Del */}
        <div data-tour="income-navigator" className="flex items-center gap-1 rounded-[14px] p-1 -m-1">
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
              className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/[0.05] transition-all shadow-sm h-9 cursor-pointer active:scale-95 outline-none text-left"
            >
              <span className="font-bold text-slate-800 dark:text-white text-xs">{activeYear}</span>
              <ChevronDown size={14} className={cn("text-slate-500 transition-transform duration-200", isYearDropdownOpen && "rotate-180")} />
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
                        "w-full px-3 py-2 text-left text-xs rounded-xl font-bold transition-all duration-200 border border-transparent flex items-center justify-between gap-check cursor-pointer",
                        year === activeYear
                          ? "bg-slate-100/80 dark:bg-slate-800/70 text-slate-900 dark:text-white border-slate-200/50 dark:border-white/[0.05] shadow-sm font-black"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:border-slate-200/40 dark:hover:border-white/[0.04] hover:shadow-sm"
                      )}
                    >
                      <span>{year}</span>
                      {year === activeYear && (
                        <Check size={12} className="text-deposit-500 animate-fade-in shrink-0 stroke-[2.5px]" />
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

        {/* Right Elements: 3 Dots Menu */}
        <div className="flex items-center gap-1" ref={mobileMenuRef}>
          <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-white/[0.05] shadow-sm p-0.5 gap-0.5 h-9">
            <button
              onClick={() => onOpenStructureConfig?.()}
              data-tour="income-config"
              className="flex flex-row items-center justify-center px-3 h-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none gap-2 font-medium text-xs whitespace-nowrap"
              title="Настройки"
            >
              <Bolt size={14} className="opacity-70" />
              <span>Настройки</span>
            </button>
            <button
              data-tour="income-tools"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                "flex items-center justify-center w-[30px] h-full rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative z-20 focus:outline-none active:scale-95",
                isMobileMenuOpen
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-md"
                  : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-slate-100"
              )}
              title={isMobileMenuOpen ? "Закрыть" : "Дополнительно"}
            >
              <div className="w-3.5 h-3.5 flex flex-col justify-center items-center relative text-current select-none pointer-events-none">
                <span className={cn(
                  "absolute h-[1.5px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  isMobileMenuOpen ? "w-3.5 rotate-45 translate-y-0" : "w-3 -translate-y-1"
                )} />

                <span className={cn(
                  "absolute h-[1.5px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  isMobileMenuOpen ? "w-3.5 -rotate-45 translate-y-0" : "w-3 translate-y-1"
                )} />
              </div>

              {isSimulationOpen && !isMobileMenuOpen && (
                <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary-500 border border-white dark:border-slate-800"></span>
                </span>
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
                className="absolute top-full right-0 mt-2 w-max min-w-[220px] h-max bg-white/95 dark:bg-slate-950/90 backdrop-blur-2xl rounded-[1.25rem] shadow-[0_16px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.7)] border border-slate-200/50 dark:border-white/[0.08] z-50 flex flex-col p-1.5 focus:outline-none"
              >
                {/* WHAT-IF - shown on all screens since the explicit button is removed */}
                <button
                  onClick={() => { setIsSimulationOpen(!isSimulationOpen); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-slate-100 transition-colors w-full text-left whitespace-nowrap"
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

                {/* Actions visible everywhere now */}
                {prevYear !== null && (
                  <button
                    onClick={() => { copyFromPreviousYear(); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-slate-100 transition-colors w-full text-left whitespace-nowrap"
                  >
                    <div className="p-1.5 rounded-md bg-primary-50 dark:bg-primary-950/10 text-primary-500 dark:text-primary-400"><Copy size={14} /></div>
                    <span>Скопировать из {prevYear}</span>
                  </button>
                )}

                <button
                  onClick={() => { setIsClearModalOpen(true); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-slate-100 transition-colors w-full text-left whitespace-nowrap"
                >
                  <div className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/10 text-rose-500 dark:text-rose-400"><BrushCleaning size={14} /></div>
                  Очистить таблицу
                </button>

                <div className="flex h-px bg-slate-100 dark:bg-white/[0.08] mx-2 my-1"></div>

                <button
                  onClick={() => { onExportPDF?.(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-slate-100 transition-colors w-full text-left whitespace-nowrap"
                >
                  <div className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/10 text-rose-500 dark:text-rose-400"><FileText size={14} /></div>
                  Экспорт в PDF
                </button>

                <button
                  onClick={() => { onExportXLSX?.(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-slate-100 transition-colors w-full text-left whitespace-nowrap"
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
