import React from 'react';

import { SproutlyLogo } from '../../ui/SproutlyLogo';
import { cn } from '../../../lib/utils';

interface HeatmapLegendProps {
  className?: string;
}

export function HeatmapLegend({ className }: HeatmapLegendProps) {
  return (
    <div className={cn("w-full flex justify-center shrink-0 mb-6 md:mb-8 lg:mb-4 xl:mb-6", className)}>
      <div className="flex flex-col md:flex-row items-center justify-center gap-2.5 sm:gap-4 bg-white/60 dark:bg-slate-950/60 px-3 sm:px-4 py-2 sm:py-2.5 rounded-[1rem] sm:rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm backdrop-blur-md w-max max-w-full">
        
        {/* Intensity Legend */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 md:border-r border-slate-200 dark:border-white/10 md:pr-4 shrink-0">
          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-[1px]">Меньше</span>
          <div className="flex gap-1 sm:gap-1.5 items-center">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] bg-slate-100/50 dark:bg-white/[0.03] border border-transparent" />
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] bg-deposit-100 dark:bg-deposit-950/60 border border-deposit-200/50" />
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] bg-deposit-200 dark:bg-deposit-900/60 border border-deposit-300/50" />
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] bg-deposit-400 dark:bg-deposit-800/80 border border-deposit-400/50" />
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] bg-deposit-500 dark:bg-deposit-500 border border-deposit-600/50" />
          </div>
          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-[1px]">Больше</span>
        </div>

        {/* Action Legend */}
        <div className="flex items-center gap-4 shrink-0 justify-center border-t border-slate-200/50 dark:border-white/5 pt-2 md:border-none md:pt-0 pb-0.5 sm:pb-0 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 rounded-[4px] ring-[1.5px] ring-amber-400 dark:ring-amber-500 ring-inset shadow-[0_0_12px_rgba(251,191,36,0.6)] bg-white/50 dark:bg-[#0B0F19]" />
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest leading-none mt-[1px]">Выплата</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center justify-center p-0.5">
              <SproutlyLogo className="w-3.5 h-3.5 text-deposit-500 drop-shadow-[0_0_6px_rgba(var(--rgb-deposit),0.6)]" />
            </div>
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mt-[1px]">Открытие</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}
