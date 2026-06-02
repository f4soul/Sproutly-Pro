import React from 'react';
import { format, eachDayOfInterval, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion } from 'motion/react';
import { SproutlyLogo } from '../../ui/SproutlyLogo';
import { cn } from '../../../lib/utils';
import { HeatmapData } from '../../../types';
import { getIntensity, getColorClass } from './utils';

interface HeatmapMonthCardProps {
  month: Date;
  heatmapData: HeatmapData;
  setExpandedMonth: (month: Date) => void;
}

export function HeatmapMonthCard({ month, heatmapData, setExpandedMonth }: HeatmapMonthCardProps) {
  const days = eachDayOfInterval({ start: month, end: new Date(month.getFullYear(), month.getMonth() + 1, 0) });
  const startDay = (getDay(month) + 6) % 7; 
  const emptyDays = Array.from({ length: startDay });

  return (
    <motion.div
      onClick={() => setExpandedMonth(month)}
      className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-md rounded-[1.25rem] sm:rounded-[1.5rem] border border-slate-200/60 dark:border-white/[0.05] p-3 sm:p-3.5 lg:p-4 xl:p-4.5 pb-2.5 sm:pb-3 lg:pb-3.5 xl:pb-4 flex flex-col cursor-pointer hover:border-deposit-500/40 dark:hover:border-deposit-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all group relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-1.5 sm:mb-2 shrink-0">
        <h4 className="text-[10px] sm:text-[11px] lg:text-[12px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 group-hover:text-deposit-500 transition-colors leading-none">
          {format(month, 'LLLL', { locale: ru })}
        </h4>
      </div>
      
      {/* Mini heat grid */}
      <div className="grid grid-cols-7 grid-rows-6 gap-[2.5px] sm:gap-[3px] lg:gap-[3px] xl:gap-[4px] mt-auto">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-[2px] sm:rounded-[3px]" />
        ))}
        {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const density = heatmapData.days[dateKey];
            const intensity = getIntensity(density?.amount || 0, heatmapData);
            const isMaturing = density?.maturingCount > 0;
            const isOpening = density?.openingCount > 0;

            return (
              <div 
                key={dateKey} 
                className={cn(
                  "aspect-square rounded-[3px] sm:rounded-[4px] lg:rounded-[5px] relative flex items-center justify-center pointer-events-none",
                  getColorClass(intensity),
                  isMaturing && "ring-[1.5px] ring-amber-400 dark:ring-amber-500 ring-inset shadow-[0_0_8px_rgba(251,191,36,0.5)] z-10",
                  intensity > 0 ? "border border-white/10 shadow-sm" : ""
                )}
              >
                <span className={cn(
                  "absolute inset-0 flex items-center justify-center text-[7.5px] sm:text-[8px] md:text-[8.5px] lg:text-[9px] xl:text-[11px] font-black leading-none pointer-events-none",
                  intensity === 0 ? "text-slate-400/60 dark:text-slate-500/60" : "text-white/90",
                  isMaturing && "text-amber-500 dark:text-amber-400/90 lg:text-[7.5px] drop-shadow-sm"
                )}>
                  {format(day, 'd')}
                </span>

                {isOpening && (
                  <div className="absolute -top-1 -right-1 z-15 flex items-center justify-center">
                    <SproutlyLogo className="w-2 h-2 sm:w-2 sm:h-2 text-deposit-500 dark:text-deposit-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
                  </div>
                )}
              </div>
            )
        })}
      </div>
    </motion.div>
  );
}
