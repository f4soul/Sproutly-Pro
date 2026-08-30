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
    isToday?: boolean;
  }>;
  startDay: number;
  setExpandedMonth: (month: Date) => void;
  hasToday?: boolean;
  id?: string;
}

export const HeatmapMonthCard = React.memo(function HeatmapMonthCard({
  month,
  days,
  startDay,
  setExpandedMonth,
  hasToday,
  id
}: HeatmapMonthCardProps) {
  return (
    <motion.div
      id={id}
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
      className={cn(
        "backdrop-blur-md rounded-panel sm:rounded-card p-3.5 sm:p-4 lg:p-3 xl:p-6 pb-3 sm:pb-3.5 lg:pb-2.5 xl:pb-5 flex flex-col cursor-pointer transition-all group relative overflow-hidden",
        hasToday 
          ? "bg-primary-50/50 dark:bg-primary-950/20 border border-primary-200/60 dark:border-primary-800/40 hover:border-primary-400 dark:hover:border-primary-600 shadow-[0_0_20px_rgba(59,130,246,0.05)] dark:shadow-[0_0_20px_rgba(59,130,246,0.03)] hover:shadow-lg hover:-translate-y-0.5" 
          : "bg-white/60 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/[0.05] hover:border-deposit-500/40 dark:hover:border-deposit-500/30 hover:shadow-lg hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-2.5 lg:mb-1.5 xl:mb-3 shrink-0">
        <h4 className={cn(
          "text-[10px] sm:text-[11px] lg:text-[11px] xl:text-[12px] font-black uppercase tracking-widest transition-colors leading-none",
          hasToday ? "text-primary-600 dark:text-primary-400" : "text-slate-600 dark:text-slate-400 group-hover:text-deposit-500"
        )}>
          {format(month, 'LLLL', { locale: ru })}
        </h4>
        
        {hasToday && (
          <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
        )}
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
                  day.colorClass,
                  (day.isToday && day.intensity === 0) && "ring-1 ring-inset ring-primary-500/50 dark:ring-primary-400/50 bg-primary-50/50 dark:bg-primary-900/20"
                )}
              >
                <span className={cn(
                  "relative z-10 flex items-center justify-center transition-colors",
                  day.isToday
                    ? (day.intensity === 0 ? "text-primary-600 dark:text-primary-400" : "text-white")
                    : (day.intensity === 0 
                        ? "text-slate-400/60 dark:text-slate-500/60" 
                        : "text-white/90"),
                  (!day.isToday && day.isMaturing) && "text-amber-500 dark:text-amber-400/90"
                )}>
                  {day.dayNumber}
                </span>

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
