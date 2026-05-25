import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  highlight?: boolean;
  index: number;
}

export function StatCard({ title, value, icon, description, highlight, index }: StatCardProps) {
  return (
    <div 
      className={cn(
        "apple-card p-4 sm:p-6 space-y-3 sm:space-y-4 group",
        highlight && "border-rose-500/30 dark:border-rose-500/20"
      )}
    >
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 transition-transform group-hover:scale-110 duration-500 shadow-sm border border-slate-100 dark:border-slate-700/50 shrink-0">
          {icon}
        </div>
        <span className="text-[9px] sm:text-[10px] text-right font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight">{title}</span>
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
