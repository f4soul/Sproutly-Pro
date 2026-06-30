import React from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { SproutlyLogo } from '../../ui/SproutlyLogo';

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
  return (
    <motion.div
      onClick={() => setExpandedMonth(month)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpandedMonth(month);
        }
      }}
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 280px' } as React.CSSProperties}
      className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-md rounded-panel sm:rounded-card border border-slate-200/60 dark:border-white/[0.05] p-3.5 sm:p-4 lg:p-3 xl:p-6 pb-3 sm:pb-3.5 lg:pb-2.5 xl:pb-5 flex flex-col cursor-pointer hover:border-deposit-500/40 dark:hover:border-deposit-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all group relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-2 sm:mb-2.5 lg:mb-1.5 xl:mb-3 shrink-0">
        <h4 className="text-[10px] sm:text-[11px] lg:text-[11px] xl:text-[12px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 group-hover:text-deposit-500 transition-colors leading-none">
          {format(month, 'LLLL', { locale: ru })}
        </h4>
      </div>
      
      {/* Mini heat grid rendering pure pre-calculated primitive metrics with smooth fading */}
      <div className="grid grid-cols-7 grid-rows-6 gap-[2.5px] sm:gap-[3px] lg:gap-[2px] xl:gap-[4px] mt-auto">
        {days.map((day, idx) => {
            const isOpening = day.isOpening;
            const isFirstDay = idx === 0;

            return (
              <div 
                key={day.dateKey} 
                style={isFirstDay ? { gridColumnStart: startDay + 1 } : undefined}
                className={cn(
                  "aspect-square rounded-[4px] sm:rounded-[4px] lg:rounded-[5px] relative flex items-center justify-center text-[7.5px] sm:text-[8px] md:text-[8.5px] lg:text-[7.5px] xl:text-[11px] font-black leading-none pointer-events-none select-none",
                  day.colorClass
                )}
              >
                {day.dayNumber}

                {isOpening && (
                  <div className="absolute -top-1 -right-1 z-15 flex items-center justify-center">
                    <SproutlyLogo className="w-2 h-2 xl:w-2.5 xl:h-2.5 text-deposit-500 dark:text-deposit-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
                  </div>
                )}
              </div>
            );
        })}
      </div>
    </motion.div>
  );
});
