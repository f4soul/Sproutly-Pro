import React from 'react';
import { format, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { HeatmapData } from '../../../types';
import { getIntensity, getColorClass } from './utils';
import { TrendingUp, Sparkle, X } from 'lucide-react';
import { SproutlyLogo } from '../../ui/SproutlyLogo';

interface HeatmapExpandedMonthProps {
  expandedMonth: Date;
  setExpandedMonth: (date: Date | null) => void;
  selectedDay: Date | null;
  setSelectedDay: (date: Date | null) => void;
  heatmapData: HeatmapData;
}

export function HeatmapExpandedMonth({
  expandedMonth,
  setExpandedMonth,
  selectedDay,
  setSelectedDay,
  heatmapData
}: HeatmapExpandedMonthProps) {
  const days = eachDayOfInterval({ start: expandedMonth, end: new Date(expandedMonth.getFullYear(), expandedMonth.getMonth() + 1, 0) });
  const startDay = (getDay(expandedMonth) + 6) % 7; 
  const emptyDays = Array.from({ length: startDay });

  React.useEffect(() => {
    if (!selectedDay) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.day-touch-zone') && !target.closest('.tooltip-touch-zone')) {
        setSelectedDay(null);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [selectedDay, setSelectedDay]);

  return (
    <motion.div 
      key="expanded-month-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-y-0 right-0 left-0 md:left-68 z-[110] flex items-center justify-center p-4 sm:p-6 lg:p-8 pointer-events-none"
    >
      <div 
        className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/70 cursor-pointer pointer-events-auto"
        onClick={() => { setExpandedMonth(null); setSelectedDay(null); }}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="relative z-10 w-full max-w-[420px] bg-white dark:bg-[#111315] rounded-[1.75rem] shadow-[0_32px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.7)] border border-white/60 dark:border-white/10 flex flex-col p-5 sm:p-5 lg:p-6 overflow-visible mx-auto pointer-events-auto"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedDay(null);
        }}
      >
        {/* Detailed Header */}
        <div className="flex items-center justify-between mb-4 shrink-0 relative z-20">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 sm:w-12 sm:h-12 bg-deposit-500/10 dark:bg-deposit-500/20 rounded-[12px] flex items-center justify-center border border-deposit-500/20">
               <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-deposit-500" />
             </div>
             <div className="flex flex-col">
               <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white leading-none">
                 {format(expandedMonth, 'LLLL', { locale: ru })}
               </h2>
               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 leading-none">Детализация</span>
             </div>
           </div>
           <button 
             onClick={() => { setExpandedMonth(null); setSelectedDay(null); }}
             className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
           >
             <X className="w-5 h-5" />
           </button>
        </div>

        {/* Calendar Grid Header */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 shrink-0 relative z-20">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
            <div key={d} className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Detailed Days */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 flex-1 relative">
          {emptyDays.map((_, i) => (
            <div key={`det-empty-${i}`} className="aspect-square bg-slate-100/50 dark:bg-white/[0.02] rounded-[10px] sm:rounded-xl border border-transparent" />
          ))}
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const density = heatmapData.days[dateKey];
            const intensity = getIntensity(density?.amount || 0, heatmapData);
            const hasInfo = (density?.openingCount > 0) || (density?.maturingCount > 0);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const isMaturing = density?.maturingCount > 0;
            const isOpening = density?.openingCount > 0;

            // Calculate tooltip position
            const dateNumber = day.getDate();
            const dayIndex = startDay + dateNumber - 1;
            const rowIndex = Math.floor(dayIndex / 7);
            const colIndex = dayIndex % 7;

            const isTopHalf = rowIndex < 3; 
            const isLeftPortion = colIndex < 3;
            const isRightPortion = colIndex > 3;

            let xAlignClass = "left-1/2 -translate-x-1/2";
            let arrowXClass = "left-1/2 -translate-x-1/2";

            if (isLeftPortion) {
              xAlignClass = "-left-2";
              arrowXClass = "left-6";
            } else if (isRightPortion) {
              xAlignClass = "-right-2";
              arrowXClass = "right-6";
            }

            let yAlignClass = "top-full mt-2 sm:mt-3";
            let arrowYClass = "-top-1.5 border-l border-t";

            if (!isTopHalf) {
              yAlignClass = "bottom-full mb-2 sm:mb-3";
              arrowYClass = "top-full -translate-y-1.5 border-b border-r";
            }

            return (
              <div key={`det-${dateKey}`} className="relative aspect-square w-full h-full" style={{ zIndex: isSelected ? 50 : (hasInfo ? 20 : 10) }}> 
                 <motion.div
                   whileHover={hasInfo ? { scale: 1.05 } : {}}
                   whileTap={hasInfo ? { scale: 0.95 } : {}}
                   transition={{ type: "spring", stiffness: 400, damping: 25 }}
                   onClick={(e) => { 
                     e.stopPropagation(); 
                     hasInfo ? setSelectedDay(day) : setSelectedDay(null); 
                   }}
                   className={cn(
                     "w-full h-full rounded-[10px] sm:rounded-xl flex flex-col items-center justify-center transition-colors duration-150 group/day cursor-default select-none relative day-touch-zone",
                     hasInfo && "cursor-pointer hover:z-50 hover:shadow-xl",
                     getColorClass(intensity),
                     isSelected ? "ring-[2px] ring-deposit-500 ring-offset-2 ring-offset-white dark:ring-offset-[#0B0F19] shadow-[0_0_20px_rgba(var(--rgb-deposit),0.5)] z-40 scale-105" : "",
                     (!density?.amount) ? "shadow-none" : "border-white/5 border shadow-sm"
                   )}
                   style={{ zIndex: isSelected ? 40 : (isMaturing ? 20 : 10) }}
                 >
                   {/* Maturing Glow Layer Inside */}
                   {isMaturing && (
                     <div className={cn(
                       "absolute inset-0 z-0 rounded-[10px] sm:rounded-xl ring-[2px] ring-amber-400 dark:ring-amber-500 ring-inset shadow-[0_0_16px_rgba(251,191,36,0.6)]",
                       intensity > 0 ? "bg-[#0B0F19]/80" : "bg-white/50 dark:bg-[#0B0F19]/50"
                     )} />
                   )}

                   {/* Opening Marker */}
                   {isOpening && (
                      <div className="absolute -top-1.5 -right-1.5 sm:-top-[3px] sm:-right-[3px] z-20 flex items-center justify-center">
                        <SproutlyLogo className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-deposit-500 dark:text-deposit-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
                      </div>
                   )}

                   <span className={cn(
                     "text-[13px] sm:text-[14px] lg:text-[16px] font-black leading-none z-10 transition-colors drop-shadow-sm",
                     intensity === 0 
                       ? "text-slate-400 dark:text-slate-500 group-hover/day:text-slate-700 dark:group-hover/day:text-slate-300" 
                       : "text-white",
                     isMaturing && "text-amber-500 dark:text-amber-400 z-20"
                   )}>
                     {format(day, 'd')}
                   </span>
                 </motion.div>

                 {/* Popover Tooltip */}
                 <AnimatePresence>
                   {(isSelected && hasInfo) && (
                     <motion.div
                       key="tooltip"
                       initial={{ opacity: 0, y: isTopHalf ? -5 : 5, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: isTopHalf ? -5 : 5, scale: 0.95 }}
                       transition={{ duration: 0.15 }}
                       className={cn(
                         "absolute z-[100] min-w-[200px] w-max max-w-[280px] bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-white/10 rounded-[1.25rem] shadow-[0_24px_48px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.8)] p-3 lg:p-4 flex flex-col gap-2 cursor-default pointer-events-auto tooltip-touch-zone",
                         yAlignClass,
                         xAlignClass
                       )}
                       onClick={(e) => e.stopPropagation()}
                     >
                        <div className={cn(
                          "absolute w-3 h-3 rotate-45 bg-white/95 dark:bg-slate-950/95 border-slate-200/60 dark:border-white/10",
                          arrowYClass,
                          arrowXClass
                        )} />
                        <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 text-center relative z-10">
                          {format(selectedDay, 'd MMMM yyyy', { locale: ru })}
                        </h4>
                        <div className="flex flex-col gap-1.5 relative z-10 mt-1 max-h-[140px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {heatmapData.days[format(selectedDay, 'yyyy-MM-dd')].openingNames.map((name, i) => (
                            <div key={`op-${i}`} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-white/[0.05] rounded-xl shrink-0">
                              <div className="flex items-center justify-center p-0.5 shrink-0">
                                <SproutlyLogo className="w-3 h-3 text-deposit-500 drop-shadow-[0_0_4px_rgba(var(--rgb-deposit),0.5)]" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Открытие</span>
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight truncate">{name}</span>
                              </div>
                            </div>
                          ))}
                          {heatmapData.days[format(selectedDay, 'yyyy-MM-dd')].maturingNames.map((name, i) => (
                            <div key={`m-${i}`} className="flex items-center gap-2 p-2 bg-amber-50/50 dark:bg-amber-500/10 rounded-xl border border-amber-200/50 dark:border-amber-500/20 shrink-0">
                              <Sparkle className="w-3 h-3 text-amber-500 shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 leading-none mb-0.5">Выплата</span>
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight truncate">{name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
