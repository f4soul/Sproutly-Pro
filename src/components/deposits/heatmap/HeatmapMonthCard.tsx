import React from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';

// Highly optimized, extremely lightweight inline SVG sprout icon to avoid rendering the heavy 4.3KB SproutlyLogo 300+ times
const SimpleSprout = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C12 2 15 7 15 11C15 14.5 12.5 17 12 17C11.5 17 9 14.5 9 11C9 7 12 2 12 2Z" />
    <path d="M12 11C12 11 15 13 17 13C19 13 21 11.5 21 11.5C21 11.5 18 10 16 10C14 10 12 11 12 11Z" opacity="0.8" />
  </svg>
);

interface HeatmapMonthCardProps {
  month: Date;
  days: Array<{
    dateKey: string;
    dayNumber: number;
    intensity: number;
    isMaturing: boolean;
    isOpening: boolean;
    colorClass: string;
  }>;
  startDay: number;
  setExpandedMonth: (month: Date) => void;
}

export const HeatmapMonthCard = React.memo(function HeatmapMonthCard({
  month,
  days,
  startDay,
  setExpandedMonth
}: HeatmapMonthCardProps) {
  const emptyDays = Array.from({ length: startDay });

  return (
    <motion.div
      onClick={() => setExpandedMonth(month)}
      className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-md rounded-[1.25rem] sm:rounded-[1.5rem] border border-slate-200/60 dark:border-white/[0.05] p-3.5 sm:p-4 lg:p-3 xl:p-6 pb-3 sm:pb-3.5 lg:pb-2.5 xl:pb-5 flex flex-col cursor-pointer hover:border-deposit-500/40 dark:hover:border-deposit-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all group relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-2 sm:mb-2.5 lg:mb-1.5 xl:mb-3 shrink-0">
        <h4 className="text-[10px] sm:text-[11px] lg:text-[11px] xl:text-[12px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 group-hover:text-deposit-500 transition-colors leading-none">
          {format(month, 'LLLL', { locale: ru })}
        </h4>
      </div>
      
      {/* Mini heat grid rendering pure pre-calculated primitive metrics with smooth fading */}
      <div className="grid grid-cols-7 grid-rows-6 gap-[2.5px] sm:gap-[3px] lg:gap-[2px] xl:gap-[4px] mt-auto">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-[2px] sm:rounded-[3px]" />
        ))}
        {days.map((day) => {
            const isMaturing = day.isMaturing;
            const isOpening = day.isOpening;

            return (
              <div 
                key={day.dateKey} 
                className={cn(
                  "aspect-square rounded-[3px] sm:rounded-[4px] lg:rounded-[5px] relative flex items-center justify-center text-[7.5px] sm:text-[8px] md:text-[8.5px] lg:text-[7.5px] xl:text-[11px] font-black leading-none pointer-events-none select-none",
                  day.colorClass,
                  day.intensity === 0 ? "text-slate-400/60 dark:text-slate-500/60" : "text-white/90",
                  isMaturing && "ring-[1.5px] ring-amber-400 dark:ring-amber-500 ring-inset shadow-[0_0_8px_rgba(251,191,36,0.5)] z-10 text-amber-500 dark:text-amber-400/90 drop-shadow-sm",
                  day.intensity > 0 ? "border border-white/10 shadow-sm" : ""
                )}
              >
                {day.dayNumber}

                {isOpening && (
                  <div className="absolute -top-1 -right-1 z-15 flex items-center justify-center">
                    <SimpleSprout className="w-2 h-2 sm:w-2 sm:h-2 text-deposit-500 dark:text-deposit-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
                  </div>
                )}
              </div>
            );
        })}
      </div>
    </motion.div>
  );
});
