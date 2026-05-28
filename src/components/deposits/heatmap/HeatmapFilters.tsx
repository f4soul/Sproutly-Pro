import React, { useRef, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getBankDetails } from '../../../lib/banks';
import { BankLogo } from '../BankLogo';

interface HeatmapFiltersProps {
  displayYear: number;
  setDisplayYear: (year: number | ((prev: number) => number)) => void;
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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    
    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      el.classList.add('cursor-grabbing');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onMouseLeave = () => {
      isDown = false;
      el.classList.remove('cursor-grabbing');
    };
    const onMouseUp = () => {
      isDown = false;
      el.classList.remove('cursor-grabbing');
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 2;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);
    
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3 lg:gap-4 shrink-0">
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
        className="flex flex-nowrap items-center gap-2 relative z-30 w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x"
      >
          <button 
            onClick={() => setSelectedBank('all')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 backdrop-blur-md",
              selectedBank === 'all' 
                ? "bg-deposit-500/10 dark:bg-deposit-500/20 text-deposit-600 dark:text-deposit-400 border-deposit-500/30 shadow-[0_4px_12px_rgba(var(--rgb-deposit),0.1)]" 
                : "bg-white/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:border-deposit-500/30 hover:bg-white dark:hover:bg-slate-800"
            )}
          >
            <div className="w-3.5 h-3.5 bg-slate-200/50 dark:bg-white/10 rounded-[6px] flex items-center justify-center text-[8px] font-bold leading-none mt-[1px]">★</div>
            <span className="leading-none mt-[1px]">Все банки</span>
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
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[9px] font-black uppercase tracking-widest transition-all border group overflow-hidden shrink-0 backdrop-blur-md",
                  isSelected 
                    ? "bg-deposit-500/10 dark:bg-deposit-500/20 text-deposit-600 dark:text-deposit-400 border-deposit-500/30 shadow-[0_4px_12px_rgba(var(--rgb-deposit),0.1)]" 
                    : "bg-white/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:border-deposit-500/30 hover:bg-white dark:hover:bg-slate-800"
                )}
              >
                <div className="w-4 h-4 min-w-[16px] flex items-center justify-center shrink-0">
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
