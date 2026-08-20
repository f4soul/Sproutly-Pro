import React, { useRef, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getBankDetails } from '../../../lib/banks';
import { BankLogo } from '../BankLogo';

interface HeatmapFiltersProps {
  displayYear: number;
  setDisplayYear: React.Dispatch<React.SetStateAction<number>>;
  setExpandedMonth: (date: Date | null) => void;
  selectedBank: string;
  setSelectedBank: (bank: string) => void;
  uniqueBanks: string[];
}

export function HeatmapFilters({
  displayYear,
  setDisplayYear,
  setExpandedMonth,
  selectedBank,
  setSelectedBank,
  uniqueBanks
}: HeatmapFiltersProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // React mouse drag state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    if (scrollRef.current) {
      scrollRef.current.classList.add('cursor-grabbing');
      startX.current = e.pageX - scrollRef.current.offsetLeft;
      scrollLeft.current = scrollRef.current.scrollLeft;
    }
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.classList.remove('cursor-grabbing');
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.classList.remove('cursor-grabbing');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="flex flex-col gap-2 md:gap-2.5 lg:gap-3 shrink-0">
      <div className="flex flex-row items-center justify-between gap-2 sm:gap-4 relative z-30">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
           <h3 className="text-base sm:text-xl lg:text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white truncate">
              КАРТА ВКЛАДОВ
           </h3>
           <span className="text-base sm:text-xl lg:text-2xl font-black text-deposit-500 shrink-0">{displayYear}</span>
        </div>

        {/* Year Nav Block */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-md rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-white/[0.08] shadow-sm p-1 shrink-0">
              <button 
                onClick={() => setDisplayYear(prev => prev - 1)}
                className="px-2 sm:px-1.5 py-1 flex items-center justify-center text-slate-400 hover:text-deposit-500 hover:bg-white/80 dark:hover:bg-white/10 rounded-lg sm:rounded-xl transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-0.5 sm:mx-1" />
              <button 
                onClick={() => { setDisplayYear(new Date().getFullYear()); setExpandedMonth(null); }}
                className="px-2.5 sm:px-2 py-1.5 flex items-center justify-center text-[8.5px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10 rounded-lg sm:rounded-xl transition-all whitespace-nowrap"
              >
                <span className="leading-none mt-[1px]">Сегодня</span>
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-0.5 sm:mx-1" />
              <button 
                onClick={() => setDisplayYear(prev => prev + 1)}
                className="px-2 sm:px-1.5 py-1 flex items-center justify-center text-slate-400 hover:text-deposit-500 hover:bg-white/80 dark:hover:bg-white/10 rounded-lg sm:rounded-xl transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-180" />
              </button>
          </div>
        </div>
      </div>

      {/* Compact Bank Filters */}
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="flex flex-nowrap items-center gap-2 relative z-30 w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x"
      >
          <button 
            onClick={() => setSelectedBank('all')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 h-8 rounded-[10px] text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 backdrop-blur-md active:scale-95",
              selectedBank === 'all' 
                ? "bg-deposit-500/10 dark:bg-deposit-500/20 text-deposit-600 dark:text-deposit-400 border-deposit-500/30 " 
                : "bg-white/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:border-deposit-500/30 hover:bg-white dark:hover:bg-slate-800"
            )}
            style={selectedBank === 'all' ? { boxShadow: "0 0 12px rgba(var(--rgb-deposit),0.3)", borderColor: "rgba(var(--rgb-deposit),0.4)" } : undefined}
          >
            <div className={cn("w-3.5 h-3.5 flex items-center justify-center shrink-0 leading-none", selectedBank === 'all' ? "text-deposit-600 dark:text-deposit-400" : "text-slate-400 dark:text-slate-500")}>
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
                  className={cn("transition-all duration-200", selectedBank === 'all' ? "fill-deposit-500 stroke-deposit-500 dark:fill-deposit-400 dark:stroke-deposit-400" : "fill-slate-400/40 stroke-slate-400/60 dark:fill-slate-500/40 dark:stroke-slate-500/60")} 
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <span className="leading-none mt-[1px]">Все</span>
          </button>
          {uniqueBanks.map((bank, bankIdx) => {
            const isSelected = selectedBank === bank;
            const bankDetails = getBankDetails(bank);
            const hasLogo = bankDetails.logoUrl;
            const labelsVisible = uniqueBanks.length <= 6;

            return (
              <button 
                key={`bank-filter-${bank}-${bankIdx}`}
                onClick={() => setSelectedBank(bank)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 h-8 rounded-[10px] text-[9px] font-black uppercase tracking-widest transition-all border group overflow-hidden shrink-0 backdrop-blur-md active:scale-95",
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
                  <span className="whitespace-nowrap transition-all duration-300 leading-none mt-[1px]">{bank}</span>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}
