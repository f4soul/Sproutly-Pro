import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  highlight?: boolean;
  index: number;
}

export function StatCard({ title, value, icon, description, highlight, index }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className={cn(
        "apple-card p-6 space-y-4 group",
        highlight && "border-rose-500/30 dark:border-rose-500/20"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="p-2.5 rounded-2xl bg-[#F5F5F7] dark:bg-white/5 transition-transform group-hover:scale-110 duration-500">
          {icon}
        </div>
        <span className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest">{title}</span>
      </div>
      <div className="space-y-1">
        <div className={cn("text-[clamp(1.125rem,2vw,1.5rem)] font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary truncate", highlight && "text-rose-600 dark:text-rose-400")}>{value}</div>
        <p className="text-[11px] font-medium text-light-text-secondary dark:text-dark-text-secondary truncate">{description}</p>
      </div>
    </motion.div>
  );
}
