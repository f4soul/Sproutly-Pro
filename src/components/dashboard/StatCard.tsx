import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';

interface StatCardProps {
  title: string;
  value: string | number | React.ReactNode;
  icon: React.ReactNode;
  description: string;
  highlight?: boolean;
  index: number;
  tooltip?: string;
}

export function StatCard({ title, value, icon, description, highlight, index, tooltip }: StatCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div 
      className={cn(
        "apple-card p-4 sm:p-6 space-y-3 sm:space-y-4 group !overflow-visible",
        highlight && "border-rose-500/30 dark:border-rose-500/20"
      )}
    >
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 transition-transform group-hover:scale-110 duration-500 shadow-sm border border-slate-100 dark:border-slate-700/50 shrink-0">
          {icon}
        </div>
        <div className="flex items-center gap-1.5 text-right justify-end ml-auto">
          {tooltip && (
            <div 
              ref={tooltipRef}
              className="relative flex items-center justify-center -mb-0.5 outline-none"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowTooltip(!showTooltip);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 dark:text-slate-500 hover:text-primary-500 transition-colors cursor-help">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
              </svg>
              <div 
                className={cn(
                  "absolute top-full mt-2 w-48 sm:w-56 p-2 bg-slate-900/95 dark:bg-white/95 backdrop-blur-xl rounded-xl shadow-xl transition-all duration-200 z-[60] text-center text-white dark:text-slate-900 text-[10px] font-bold leading-tight pointer-events-none",
                  index % 2 === 0 
                    ? "-left-12 sm:left-auto sm:right-0 origin-top-left sm:origin-top-right"
                    : "right-0 origin-top-right",
                  showTooltip ? "opacity-100 scale-100" : "opacity-0 scale-95"
                )}
              >
                {tooltip}
              </div>
            </div>
          )}
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight">{title}</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className={cn("text-[clamp(1.125rem,2vw,1.5rem)] font-bold tracking-tight text-slate-950 dark:text-white truncate", highlight && "text-rose-600 dark:text-rose-400")}>
          {typeof value === 'number' ? <AnimatedCurrency value={value} /> : value}
        </div>
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">{description}</p>
      </div>
    </div>
  );
}
