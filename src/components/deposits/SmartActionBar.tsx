import React, { Fragment, useState, useRef, useEffect } from 'react';
import { Search, X, SlidersHorizontal, Plus, FileText, Image as ImageIcon, FileSpreadsheet, Download, ArrowDownUp } from 'lucide-react';
import { Transition, Popover } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Deposit } from '../../types';
import { getBankDetails } from '../../lib/banks';
import { BankLogo } from './BankLogo';
import { exportToPDF, exportToImage, exportToXLSX } from '../../services/ExportService';

interface SmartActionBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: 'all' | 'active' | 'closed';
  setFilterStatus: (status: 'all' | 'active' | 'closed') => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  requestSort: (key: any) => void;
  resetSort: () => void;
  filteredDeposits: Deposit[];
  onAddClick: () => void;
  isScrolled: boolean;
  selectedBanks: string[];
  onSelectedBanksChange: (banks: string[]) => void;
  uniqueBanks: string[];
}

export const SmartActionBar: React.FC<SmartActionBarProps> = ({
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  sortConfig,
  requestSort,
  resetSort,
  filteredDeposits,
  onAddClick,
  isScrolled,
  selectedBanks,
  onSelectedBanksChange,
  uniqueBanks
}) => {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isFullyExpanded, setIsFullyExpanded] = useState(false);
  const bankScrollRef = useRef<HTMLDivElement>(null);
  const desktopBankScrollRef = useRef<HTMLDivElement>(null);
  
  // React mouse drag state with strict touch & drag-to-scroll isolation
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const dragDistance = useRef(0);
  const wasDragging = useRef(false);
  const startPageX = useRef(0);

  const createDragHandlers = (ref: React.RefObject<HTMLDivElement | null>) => {
    return {
      onMouseDown: (e: React.MouseEvent) => {
        isDragging.current = true;
        wasDragging.current = false;
        dragDistance.current = 0;
        if (ref.current) {
          ref.current.classList.add('cursor-grabbing');
          startX.current = e.pageX - ref.current.offsetLeft;
          scrollLeft.current = ref.current.scrollLeft;
          startPageX.current = e.pageX;
        }
      },
      onMouseMove: (e: React.MouseEvent) => {
        if (!isDragging.current || !ref.current) return;
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX.current) * 2;
        ref.current.scrollLeft = scrollLeft.current - walk;
        
        const dist = Math.abs(e.pageX - startPageX.current);
        dragDistance.current = dist;
        if (dist > 8) {
          wasDragging.current = true;
        }
      },
      onMouseUp: () => {
        isDragging.current = false;
        if (ref.current) {
          ref.current.classList.remove('cursor-grabbing');
        }
        setTimeout(() => {
          wasDragging.current = false;
        }, 50);
      },
      onMouseLeave: () => {
        isDragging.current = false;
        if (ref.current) {
          ref.current.classList.remove('cursor-grabbing');
        }
        setTimeout(() => {
          wasDragging.current = false;
        }, 50);
      }
    };
  };

  const mobileDragHandlers = createDragHandlers(bankScrollRef);
  const desktopDragHandlers = createDragHandlers(desktopBankScrollRef);

  useEffect(() => {
    const el = bankScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isFiltersExpanded]);

  useEffect(() => {
    const el = desktopBankScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isFiltersExpanded]);


  return (
    <div className="relative z-40 mb-4 w-full">
      <div className={cn(
        "relative border border-slate-200/50 dark:border-white/[0.05] rounded-3xl shadow-lg p-2 transition-all duration-300",
        isScrolled ? "shadow-xl" : ""
      )}>
        {/* Ambient frosted background glass layer (Separated to prevent backdrop-filter clipping bug in Safari/Chrome) */}
        <div className={cn(
          "absolute inset-0 rounded-3xl -z-10 backdrop-blur-md bg-white/40 dark:bg-slate-950/40 transition-colors duration-300 pointer-events-none",
          isScrolled ? "bg-white/60 dark:bg-slate-950/60" : ""
        )} />
        {/* Top Row: Search and Controls */}
        <div className="flex items-center gap-2 relative z-10">
          {/* Search Bar Inner */}
          <div className="relative flex-1 group bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-white/[0.05] focus-within:border-deposit-500/30 dark:focus-within:border-deposit-500/30 transition-all">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 transition-colors group-focus-within:text-deposit-500">
              <Search className="w-full h-full stroke-[2px]" />
            </div>
            
            <input 
              type="text" 
              placeholder="Поиск по вкладам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none pl-11 pr-12 py-3 text-sm font-medium focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-500 outline-none"
            />
            
            {/* Right side clear button */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer bg-slate-100/50 dark:bg-white/5 rounded-full"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5px]" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 pr-1 shrink-0">
            {/* Toggle Filters Button */}
            <button 
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className={cn(
                "p-3 rounded-2xl transition-all flex items-center justify-center shrink-0 border relative backdrop-blur-md cursor-pointer",
                isFiltersExpanded || filterStatus !== 'all' || sortConfig || selectedBanks.length > 0
                  ? "bg-deposit-500/10 text-deposit-600 dark:text-deposit-400 border-deposit-500/20"
                  : "bg-white/60 dark:bg-slate-900/60 border-slate-200/50 dark:border-white/[0.05] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800"
              )}
            >
              <SlidersHorizontal className="w-4 h-4 stroke-[2px] transition-colors" />
              {(!isFiltersExpanded && (filterStatus !== 'all' || sortConfig || selectedBanks.length > 0)) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-deposit-500 rounded-full border-2 border-white dark:border-slate-900 shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
              )}
            </button>
            
            {/* Desktop Add Button */}
            <div className="hidden lg:block ml-1.5">
              <button 
                onClick={onAddClick}
                className="apple-button whitespace-nowrap bg-deposit-500 hover:bg-deposit-600 text-white flex items-center justify-center gap-2 text-sm font-bold px-5 py-[11px] rounded-2xl shadow-[0_4px_16px_rgba(20,184,166,0.3)] hover:shadow-[0_4px_20px_rgba(20,184,166,0.4)] active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5px]" />
                Добавить вклад
              </button>
            </div>
          </div>
        </div>

        {/* Filters Accordion - 2 Rows as segmented switches and compact chips */}
        <AnimatePresence initial={false}>
          {isFiltersExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onAnimationStart={() => {
                if (!isFiltersExpanded) {
                  setIsFullyExpanded(false);
                }
              }}
              onAnimationComplete={() => {
                if (isFiltersExpanded) {
                  setIsFullyExpanded(true);
                }
              }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className={cn("relative z-30", isFullyExpanded && isFiltersExpanded ? "overflow-visible" : "overflow-hidden")}
            >
              <div className="pt-3 pb-1 px-1 border-t border-slate-200/50 dark:border-white/[0.05] mt-2 flex flex-col gap-3">
                
                {/* Desktop layout: ALL IN ONE ROW */}
                <div className="hidden xl:flex items-center gap-2.5 w-full">
                  {/* Status Toggle (Segmented Control style) */}
                  <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 p-0.5 rounded-xl border border-slate-200/60 dark:border-white/[0.05] shadow-sm gap-0 h-8 shrink-0">
                    <button 
                      onClick={() => setFilterStatus('all')}
                      className={cn(
                        "px-4 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all relative h-full flex items-center justify-center min-w-[65px] z-10",
                        filterStatus === 'all' 
                          ? "text-deposit-600 dark:text-deposit-400" 
                          : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-white/5"
                      )}
                    >
                      <span className="relative z-20 mt-[1px]">Все</span>
                      {filterStatus === 'all' && (
                        <motion.div 
                          layoutId="statusPillDesktop"
                          className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg -z-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-white/[0.05]"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        />
                      )}
                    </button>
                    <button 
                      onClick={() => setFilterStatus('active')}
                      className={cn(
                        "px-4 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all relative h-full flex items-center justify-center min-w-[65px] z-10",
                        filterStatus === 'active' 
                          ? "text-deposit-600 dark:text-deposit-400" 
                          : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-white/5"
                      )}
                    >
                      <span className="relative z-20 mt-[1px]">Актив</span>
                      {filterStatus === 'active' && (
                        <motion.div 
                          layoutId="statusPillDesktop"
                          className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg -z-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-white/[0.05]"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        />
                      )}
                    </button>
                    <button 
                      onClick={() => setFilterStatus('closed')}
                      className={cn(
                        "px-4 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all relative h-full flex items-center justify-center min-w-[65px] z-10",
                        filterStatus === 'closed' 
                          ? "text-deposit-600 dark:text-deposit-400" 
                          : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-white/5"
                      )}
                    >
                      <span className="relative z-20 mt-[1px]">Закрыт</span>
                      {filterStatus === 'closed' && (
                        <motion.div 
                          layoutId="statusPillDesktop"
                          className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg -z-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-white/[0.05]"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        />
                      )}
                    </button>
                  </div>

                  {/* Sort Inline */}
                  <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-900/50 backdrop-blur-md p-0.5 rounded-xl border border-slate-200/60 dark:border-white/[0.05] shrink-0 h-8">
                    {[
                      { key: 'startDate', label: 'Дата' },
                      { key: 'rate', label: 'Ставка' },
                      { key: 'amount', label: 'Сумма' },
                      { key: 'total', label: 'Итог' }
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => requestSort(item.key as any)}
                        className={cn(
                          "px-3 h-full flex items-center justify-center text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap cursor-pointer relative z-10",
                          sortConfig?.key === item.key 
                            ? "bg-white dark:bg-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-white/[0.05] text-deposit-600 dark:text-deposit-400" 
                            : "text-slate-500 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-white/5"
                        )}
                      >
                        <div className="flex items-center gap-1 leading-none">
                          <span className="mt-[1px]">{item.label}</span>
                          {sortConfig?.key === item.key && (
                            <span className="text-[9px] leading-none mt-[1px]">
                              {sortConfig.direction === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    
                    {sortConfig && (
                      <button 
                        onClick={resetSort}
                        className="p-1 px-[6px] text-slate-400 hover:text-rose-500 rounded-lg transition-all ml-0.5 hover:bg-slate-200/50 dark:hover:bg-slate-800/80 flex items-center justify-center cursor-pointer h-full"
                        title="Сбросить сортировку"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.5px]" />
                      </button>
                    )}
                  </div>

                  {/* Vertical Divider line */}
                  <div className="w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0" />

                  {/* Scrollable Bank Selection chips */}
                  {uniqueBanks.length > 0 && (
                    <div 
                      ref={desktopBankScrollRef}
                      {...desktopDragHandlers}
                      className="flex-1 min-w-0 flex flex-nowrap items-center gap-2 relative z-30 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x pb-0.5 shrink-0 px-0.5 select-none"
                    >
                      <button
                        onClick={() => {
                          if (wasDragging.current) return;
                          onSelectedBanksChange([]);
                        }}
                        onDragStart={(e) => e.preventDefault()}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 h-8 rounded-[10px] text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 backdrop-blur-md select-none cursor-pointer active:scale-95",
                          selectedBanks.length === 0
                            ? "bg-deposit-500/10 dark:bg-deposit-500/20 text-deposit-600 dark:text-deposit-400 border-deposit-500/30 " 
                            : "bg-white/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:border-deposit-500/30 hover:bg-white dark:hover:bg-slate-800"
                        )}
                        style={selectedBanks.length === 0 ? { boxShadow: "0 0 12px rgba(var(--rgb-deposit),0.3)", borderColor: "rgba(var(--rgb-deposit),0.4)" } : undefined}
                      >
                        <div className={cn("w-3.5 h-3.5 flex items-center justify-center shrink-0 leading-none", selectedBanks.length === 0 ? "text-deposit-600 dark:text-deposit-400" : "text-slate-400 dark:text-slate-500")}>
                          <svg 
                            viewBox="0 0 24 24" 
                            className="w-3.5 h-3.5 shrink-0" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path 
                              d="M11.051 7.616C11.1171 7.41334 11.2462 7.23709 11.4195 7.11297C11.5928 6.98884 11.8012 6.92334 12.0143 6.92602C12.2275 6.9287 12.4342 6.99942 12.6043 7.12786C12.7744 7.2563 12.8991 7.43574 12.96 7.64L13.697 9.092C13.7687 9.23315 13.8729 9.35526 14.0011 9.44827C14.1292 9.54128 14.2776 9.60254 14.434 9.627L16.068 9.883C16.2784 9.88382 16.4832 9.95099 16.6532 10.0749C16.8233 10.1989 16.9498 10.3733 17.015 10.5734C17.0801 10.7735 17.0805 10.989 17.016 11.1893C16.9516 11.3896 16.8256 11.5645 16.656 11.689L15.484 12.857C15.3718 12.9687 15.2877 13.1055 15.2387 13.256C15.1897 13.4066 15.1771 13.5666 15.202 13.723L15.461 15.336C15.5323 15.5382 15.5367 15.7579 15.4736 15.9627C15.4105 16.1676 15.2832 16.3468 15.1106 16.4738C14.9379 16.6009 14.729 16.6691 14.5147 16.6684C14.3003 16.6677 14.0918 16.5982 13.92 16.47L12.455 15.72C12.3139 15.6477 12.1576 15.61 11.999 15.61C11.8404 15.61 11.6841 15.6477 11.543 15.72L10.078 16.47C9.9062 16.5971 9.69818 16.6658 9.48446 16.666C9.27075 16.6663 9.06258 16.598 8.89047 16.4713C8.71836 16.3446 8.59138 16.1661 8.52813 15.962C8.46488 15.7578 8.46869 15.5388 8.53901 15.337L8.79701 13.724C8.82209 13.5675 8.8096 13.4072 8.76057 13.2565C8.71154 13.1057 8.62737 12.9688 8.51501 12.857L7.35901 11.705C7.18367 11.5835 7.05177 11.4092 6.98257 11.2074C6.91338 11.0056 6.91052 10.787 6.97441 10.5835C7.0383 10.38 7.1656 10.2022 7.3377 10.0762C7.50981 9.95015 7.7177 9.88246 7.93101 9.883L9.56401 9.627C9.72044 9.60254 9.86882 9.54128 9.99695 9.44827C10.1251 9.35526 10.2293 9.23315 10.301 9.092L11.051 7.616Z" 
                              className={cn("transition-all duration-200", selectedBanks.length === 0 ? "fill-deposit-500 stroke-deposit-500 dark:fill-deposit-400 dark:stroke-deposit-400" : "fill-slate-400/40 stroke-slate-400/60 dark:fill-slate-500/40 dark:stroke-slate-500/60")} 
                              strokeWidth="1.5"
                            />
                          </svg>
                        </div>
                        <span className="leading-none mt-[1px]">Все</span>
                      </button>
                      
                      {uniqueBanks.map((bankName, bankIdx) => {
                        const isSelected = selectedBanks.includes(bankName);
                        const bankDetails = getBankDetails(bankName);
                        const hasLogo = bankDetails.logoUrl;
                        const labelsVisible = uniqueBanks.length <= 5;
                        
                        return (
                          <button
                            key={`bank-filter-desktop-${bankName}-${bankIdx}`}
                            type="button"
                            title={bankName}
                            onClick={() => {
                              if (wasDragging.current) return;
                              if (isSelected) {
                                onSelectedBanksChange(selectedBanks.filter(b => b !== bankName));
                              } else {
                                onSelectedBanksChange([...selectedBanks, bankName]);
                              }
                            }}
                            onDragStart={(e) => e.preventDefault()}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 h-8 rounded-[10px] text-[9px] font-black uppercase tracking-widest transition-all border group overflow-hidden shrink-0 backdrop-blur-md select-none cursor-pointer active:scale-95",
                              isSelected 
                                ? "bg-deposit-500/10 dark:bg-deposit-500/20 text-deposit-600 dark:text-deposit-400 border-deposit-500/30 " 
                                : "bg-white/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:border-deposit-500/30 hover:bg-white dark:hover:bg-slate-800"
                            )}
                            style={isSelected ? { boxShadow: "0 0 12px rgba(var(--rgb-deposit),0.3)", borderColor: "rgba(var(--rgb-deposit),0.4)" } : undefined}
                          >
                            <div className={cn("w-4 h-4 min-w-[16px] flex items-center justify-center shrink-0", isSelected && "drop-shadow-[0_0_4px_rgba(var(--rgb-deposit),0.5)]")}>
                              {hasLogo ? (
                                <BankLogo logoUrl={bankDetails.logoUrl!} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <span className="font-bold text-[6px] leading-none mt-[1px]" style={{ color: bankDetails.color }}>{bankDetails.logoText}</span>
                              )}
                            </div>
                            {(labelsVisible || isSelected) && (
                              <span className="whitespace-nowrap transition-all duration-300 leading-none mt-[1px]">{bankName}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Export Button Popover Dropdown */}
                  <div className="shrink-0">
                    <Popover className="relative shrink-0 z-50">
                      <Popover.Button className="flex items-center justify-center p-2 px-3 w-auto h-8 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-white/[0.05] text-slate-500 hover:text-deposit-600 dark:text-slate-400 dark:hover:text-deposit-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all focus:outline-none cursor-pointer active:scale-95">
                        <Download className="w-3 h-3 stroke-[2px]" />
                        <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest leading-none mt-[1px]">Экспорт</span>
                      </Popover.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-150"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                      >
                        <Popover.Panel className="absolute right-0 top-[calc(100%+0.5rem)] w-36 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border border-slate-200/50 dark:border-white/[0.08] rounded-2xl shadow-2xl p-2 outline-none z-50">
                          <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Экспорт</h4>
                          <div className="flex flex-col gap-1">
                            <button 
                              onClick={() => exportToPDF('', undefined, filteredDeposits)}
                              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group/btn cursor-pointer active:scale-95"
                            >
                              <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                                <FileText className="w-3.5 h-3.5 text-rose-500 group-hover/btn:scale-110 transition-transform" />
                              </div>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">PDF</span>
                            </button>
                            <button 
                              onClick={() => exportToImage('', filteredDeposits)}
                              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group/btn cursor-pointer active:scale-95"
                            >
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                <ImageIcon className="w-3.5 h-3.5 text-emerald-500 group-hover/btn:scale-110 transition-transform" />
                              </div>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">PNG</span>
                            </button>
                            <button 
                              onClick={() => exportToXLSX(filteredDeposits)}
                              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group/btn cursor-pointer active:scale-95"
                            >
                              <div className="w-7 h-7 rounded-lg bg-[#21A366]/10 flex items-center justify-center">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-[#21A366] group-hover/btn:scale-110 transition-transform" />
                              </div>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Excel</span>
                            </button>
                          </div>
                        </Popover.Panel>
                      </Transition>
                    </Popover>
                  </div>
                </div>

                {/* Mobile & Tablet layout: TWO ROWS */}
                <div className="flex xl:hidden flex-col gap-3 w-full">
                  {/* Row 1: Switcher + Sort (pushed left) + Export (pushed right) */}
                  <div className="flex items-center justify-between w-full gap-2 pb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Left: Status Toggle (Segmented Control style) */}
                      <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 p-0.5 rounded-xl border border-slate-200/60 dark:border-white/[0.05] shadow-sm gap-0 h-[32px] sm:h-8 shrink-0">
                        <button 
                          onClick={() => setFilterStatus('all')}
                          className={cn(
                            "px-3 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all relative h-full flex items-center justify-center min-w-[55px] sm:min-w-[65px] z-10",
                            filterStatus === 'all' 
                              ? "text-deposit-600 dark:text-deposit-400" 
                              : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-white/5"
                          )}
                        >
                          <span className="relative z-20 mt-[1px]">Все</span>
                          {filterStatus === 'all' && (
                            <motion.div 
                              layoutId="statusPillMobile"
                              className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg -z-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-white/[0.05]"
                              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                            />
                          )}
                        </button>
                        <button 
                          onClick={() => setFilterStatus('active')}
                          className={cn(
                            "px-3 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all relative h-full flex items-center justify-center min-w-[55px] sm:min-w-[65px] z-10",
                            filterStatus === 'active' 
                              ? "text-deposit-600 dark:text-deposit-400" 
                              : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-white/5"
                          )}
                        >
                          <span className="relative z-20 mt-[1px]">Актив</span>
                          {filterStatus === 'active' && (
                            <motion.div 
                              layoutId="statusPillMobile"
                              className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg -z-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-white/[0.05]"
                              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                            />
                          )}
                        </button>
                        <button 
                          onClick={() => setFilterStatus('closed')}
                          className={cn(
                            "px-3 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all relative h-full flex items-center justify-center min-w-[55px] sm:min-w-[65px] z-10",
                            filterStatus === 'closed' 
                              ? "text-deposit-600 dark:text-deposit-400" 
                              : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-white/5"
                          )}
                        >
                          <span className="relative z-20 mt-[1px]">Закрыт</span>
                          {filterStatus === 'closed' && (
                            <motion.div 
                              layoutId="statusPillMobile"
                              className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg -z-10 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-white/[0.05]"
                              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                            />
                          )}
                        </button>
                      </div>

                      {/* Mobile & Portrait Tablet Sort Dropdown */}
                      <Popover className="relative shrink-0 z-50 portrait:block hidden">
                        <Popover.Button className={cn(
                          "flex items-center justify-center md:gap-1.5 w-[32px] md:w-auto px-0 md:px-3 h-[32px] bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-white/[0.05] rounded-xl transition-all focus:outline-none cursor-pointer active:scale-95",
                          sortConfig 
                            ? "text-deposit-600 dark:text-deposit-400 border-deposit-500/30 bg-deposit-500/5 dark:bg-deposit-500/10" 
                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
                        )}>
                          <ArrowDownUp className="w-3 h-3 stroke-[2px]" />
                          <span className="hidden md:inline-block text-[9px] font-black uppercase tracking-widest leading-none mt-[1px]">Сортировка</span>
                        </Popover.Button>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-150"
                          enterFrom="opacity-0 scale-95"
                          enterTo="opacity-100 scale-100"
                          leave="transition ease-in duration-150"
                          leaveFrom="opacity-100 scale-100"
                          leaveTo="opacity-0 scale-95"
                        >
                          <Popover.Panel className="absolute left-0 top-[calc(100%+0.5rem)] w-36 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border border-slate-200/50 dark:border-white/[0.08] rounded-2xl shadow-2xl p-2 outline-none z-50">
                             <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-2 pt-1">Сортировка</h4>
                            <div className="flex flex-col gap-0.5">
                              {[
                               { key: 'startDate', label: 'Дата' },
                               { key: 'rate', label: 'Ставка' },
                               { key: 'amount', label: 'Сумма' },
                               { key: 'total', label: 'Итог' }
                              ].map((item) => (
                                <button
                                  key={`sort-mobile-${item.key}`}
                                  onClick={() => requestSort(item.key as any)}
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer group active:scale-95",
                                    sortConfig?.key === item.key
                                      ? "bg-deposit-50 dark:bg-deposit-500/10 text-deposit-600 dark:text-deposit-400"
                                      : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"
                                  )}
                                >
                                  <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                  {sortConfig?.key === item.key && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[8px] font-bold bg-white dark:bg-black/20 px-1.5 py-0.5 rounded-md shadow-sm">
                                        {sortConfig.direction === 'asc' ? 'По возраст.' : 'По убыв.'}
                                      </span>
                                    </div>
                                  )}
                                </button>
                              ))}
                              {sortConfig && (
                                <div className="mt-1 pt-1 border-t border-slate-200/50 dark:border-white/[0.05]">
                                  <button 
                                    onClick={resetSort}
                                    className="flex items-center justify-center gap-2 w-full p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 transition-all cursor-pointer active:scale-95"
                                  >
                                    <X className="w-3.5 h-3.5 stroke-[2px]" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Сбросить</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </Popover.Panel>
                        </Transition>
                      </Popover>

                      {/* Landscape Tablet Sort Inline */}
                      <div className="hidden landscape:flex items-center gap-0.5 bg-slate-50 dark:bg-slate-900/50 backdrop-blur-md p-0.5 rounded-xl border border-slate-200/60 dark:border-white/[0.05] shrink-0 h-8">
                        {[
                          { key: 'startDate', label: 'Дата' },
                          { key: 'rate', label: 'Ставка' },
                          { key: 'amount', label: 'Сумма' },
                          { key: 'total', label: 'Итог' }
                        ].map((item) => (
                          <button
                            key={`sort-tablet-${item.key}`}
                            onClick={() => requestSort(item.key as any)}
                            className={cn(
                              "px-3 h-full flex items-center justify-center text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap cursor-pointer relative z-10",
                              sortConfig?.key === item.key 
                                ? "bg-white dark:bg-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-white/[0.05] text-deposit-600 dark:text-deposit-400" 
                                : "text-slate-500 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-white/5"
                            )}
                          >
                            <div className="flex items-center gap-1 leading-none">
                              <span className="mt-[1px]">{item.label}</span>
                              {sortConfig?.key === item.key && (
                                <span className="text-[9px] leading-none mt-[1px]">
                                  {sortConfig.direction === 'asc' ? '▲' : '▼'}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                        
                        {sortConfig && (
                          <button 
                            onClick={resetSort}
                            className="p-1 px-[6px] text-slate-400 hover:text-rose-500 rounded-lg transition-all ml-0.5 hover:bg-slate-200/50 dark:hover:bg-slate-800/80 flex items-center justify-center cursor-pointer h-full"
                            title="Сбросить сортировку"
                          >
                            <X className="w-3.5 h-3.5 stroke-[2.5px]" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Export popover aligned to right */}
                    <Popover className="relative shrink-0 z-50">
                      <Popover.Button className="flex items-center justify-center p-2 portrait:px-2 portrait:w-[32px] landscape:px-3 landscape:w-auto h-[32px] bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-white/[0.05] text-slate-500 hover:text-deposit-600 dark:text-slate-400 dark:hover:text-deposit-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all focus:outline-none cursor-pointer active:scale-95">
                        <Download className="w-3 h-3 stroke-[2px]" />
                        <span className="hidden landscape:inline-block ml-1.5 text-[9px] font-black uppercase tracking-widest leading-none mt-[1px]">Экспорт</span>
                      </Popover.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-150"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                      >
                        <Popover.Panel className="absolute right-0 top-[calc(100%+0.5rem)] w-36 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border border-slate-200/50 dark:border-white/[0.08] rounded-2xl shadow-2xl p-2 outline-none z-50">
                          <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Экспорт</h4>
                          <div className="flex flex-col gap-1">
                            <button 
                              onClick={() => exportToPDF('', undefined, filteredDeposits)}
                              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group/btn cursor-pointer active:scale-95"
                            >
                              <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                                <FileText className="w-3 h-3 text-rose-500 group-hover/btn:scale-110 transition-transform" />
                              </div>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">PDF</span>
                            </button>
                            <button 
                              onClick={() => exportToImage('', filteredDeposits)}
                              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group/btn cursor-pointer active:scale-95"
                            >
                              <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                <ImageIcon className="w-3 h-3 text-emerald-500 group-hover/btn:scale-110 transition-transform" />
                              </div>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">PNG</span>
                            </button>
                            <button 
                              onClick={() => exportToXLSX(filteredDeposits)}
                              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group/btn cursor-pointer active:scale-95"
                            >
                              <div className="w-6 h-6 rounded-lg bg-[#21A366]/10 flex items-center justify-center">
                                <FileSpreadsheet className="w-3 h-3 text-[#21A366] group-hover/btn:scale-110 transition-transform" />
                              </div>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Excel</span>
                            </button>
                          </div>
                        </Popover.Panel>
                      </Transition>
                    </Popover>
                  </div>

                  {/* Row 2: Scrollable Bank selection chips (mobile specific) */}
                  {uniqueBanks.length > 0 && (
                    <div 
                      ref={bankScrollRef}
                      {...mobileDragHandlers}
                      className="flex flex-nowrap items-center gap-2 relative z-30 w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x pb-2 pt-1 shrink-0 px-0.5 select-none"
                    >
                      <button
                        onClick={() => {
                          if (wasDragging.current) return;
                          onSelectedBanksChange([]);
                        }}
                        onDragStart={(e) => e.preventDefault()}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 h-8 rounded-[10px] text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 backdrop-blur-md select-none cursor-pointer active:scale-95",
                          selectedBanks.length === 0
                            ? "bg-deposit-500/10 dark:bg-deposit-500/20 text-deposit-600 dark:text-deposit-400 border-deposit-500/30 " 
                            : "bg-white/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:border-deposit-500/30 hover:bg-white dark:hover:bg-slate-800"
                        )}
                        style={selectedBanks.length === 0 ? { boxShadow: "0 0 12px rgba(var(--rgb-deposit),0.3)", borderColor: "rgba(var(--rgb-deposit),0.4)" } : undefined}
                      >
                        <div className={cn("w-3.5 h-3.5 flex items-center justify-center shrink-0 leading-none", selectedBanks.length === 0 ? "text-deposit-600 dark:text-deposit-400" : "text-slate-400 dark:text-slate-500")}>
                          <svg 
                            viewBox="0 0 24 24" 
                            className="w-3.5 h-3.5 shrink-0" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path 
                              d="M11.051 7.616C11.1171 7.41334 11.2462 7.23709 11.4195 7.11297C11.5928 6.98884 11.8012 6.92334 12.0143 6.92602C12.2275 6.9287 12.4342 6.99942 12.6043 7.12786C12.7744 7.2563 12.8991 7.43574 12.96 7.64L13.697 9.092C13.7687 9.23315 13.8729 9.35526 14.0011 9.44827C14.1292 9.54128 14.2776 9.60254 14.434 9.627L16.068 9.883C16.2784 9.88382 16.4832 9.95099 16.6532 10.0749C16.8233 10.1989 16.9498 10.3733 17.015 10.5734C17.0801 10.7735 17.0805 10.989 17.016 11.1893C16.9516 11.3896 16.8256 11.5645 16.656 11.689L15.484 12.857C15.3718 12.9687 15.2877 13.1055 15.2387 13.256C15.1897 13.4066 15.1771 13.5666 15.202 13.723L15.461 15.336C15.5323 15.5382 15.5367 15.7579 15.4736 15.9627C15.4105 16.1676 15.2832 16.3468 15.1106 16.4738C14.9379 16.6009 14.729 16.6691 14.5147 16.6684C14.3003 16.6677 14.0918 16.5982 13.92 16.47L12.455 15.72C12.3139 15.6477 12.1576 15.61 11.999 15.61C11.8404 15.61 11.6841 15.6477 11.543 15.72L10.078 16.47C9.9062 16.5971 9.69818 16.6658 9.48446 16.666C9.27075 16.6663 9.06258 16.598 8.89047 16.4713C8.71836 16.3446 8.59138 16.1661 8.52813 15.962C8.46488 15.7578 8.46869 15.5388 8.53901 15.337L8.79701 13.724C8.82209 13.5675 8.8096 13.4072 8.76057 13.2565C8.71154 13.1057 8.62737 12.9688 8.51501 12.857L7.35901 11.705C7.18367 11.5835 7.05177 11.4092 6.98257 11.2074C6.91338 11.0056 6.91052 10.787 6.97441 10.5835C7.0383 10.38 7.1656 10.2022 7.3377 10.0762C7.50981 9.95015 7.7177 9.88246 7.93101 9.883L9.56401 9.627C9.72044 9.60254 9.86882 9.54128 9.99695 9.44827C10.1251 9.35526 10.2293 9.23315 10.301 9.092L11.051 7.616Z" 
                              className={cn("transition-all duration-200", selectedBanks.length === 0 ? "fill-deposit-500 stroke-deposit-500 dark:fill-deposit-400 dark:stroke-deposit-400" : "fill-slate-400/40 stroke-slate-400/60 dark:fill-slate-500/40 dark:stroke-slate-500/60")} 
                              strokeWidth="1.5"
                            />
                          </svg>
                        </div>
                        <span className="leading-none mt-[1px]">Все</span>
                      </button>
                      
                      {uniqueBanks.map((bankName, bankIdx) => {
                        const isSelected = selectedBanks.includes(bankName);
                        const bankDetails = getBankDetails(bankName);
                        const hasLogo = bankDetails.logoUrl;
                        const labelsVisible = uniqueBanks.length <= 4;
                        
                        return (
                          <button
                            key={`bank-filter-mobile-chip-${bankName}-${bankIdx}`}
                            type="button"
                            title={bankName}
                            onClick={() => {
                              if (wasDragging.current) return;
                              if (isSelected) {
                                onSelectedBanksChange(selectedBanks.filter(b => b !== bankName));
                              } else {
                                onSelectedBanksChange([...selectedBanks, bankName]);
                              }
                            }}
                            onDragStart={(e) => e.preventDefault()}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 h-8 rounded-[10px] text-[9px] font-black uppercase tracking-widest transition-all border group overflow-hidden shrink-0 backdrop-blur-md select-none cursor-pointer active:scale-95",
                              isSelected 
                                ? "bg-deposit-500/10 dark:bg-deposit-500/20 text-deposit-600 dark:text-deposit-400 border-deposit-500/30 " 
                                : "bg-white/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:border-deposit-500/30 hover:bg-white dark:hover:bg-slate-800"
                            )}
                            style={isSelected ? { boxShadow: "0 0 12px rgba(var(--rgb-deposit),0.3)", borderColor: "rgba(var(--rgb-deposit),0.4)" } : undefined}
                          >
                            <div className={cn("w-4 h-4 min-w-[16px] flex items-center justify-center shrink-0", isSelected && "drop-shadow-[0_0_4px_rgba(var(--rgb-deposit),0.5)]")}>
                              {hasLogo ? (
                                <BankLogo logoUrl={bankDetails.logoUrl!} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <span className="font-bold text-[6px]" style={{ color: bankDetails.color }}>{bankDetails.logoText}</span>
                              )}
                            </div>
                            {(labelsVisible || isSelected) && (
                              <span className="whitespace-nowrap transition-all duration-300 leading-none mt-[1px]">{bankName}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};


