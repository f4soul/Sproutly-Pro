import React from 'react';
import { SproutlyLogo } from './SproutlyLogo';

const Bone = ({ className }: { className: string }) => (
  <div className={`relative overflow-hidden ${className}`}>
    <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10 pointer-events-none" />
  </div>
);

export const ListSkeleton: React.FC<{ rows?: number; className?: string }> = ({ rows = 3, className }) => (
  <div className={`space-y-3 ${className ?? ''}`} aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white p-3 dark:border-white/5 dark:bg-slate-900">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-200/80 dark:bg-slate-700/60">
          <SproutlyLogo className="absolute inset-0 m-auto h-6 w-6 animate-pulse text-slate-400/70 dark:text-slate-400/50" />
          <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10 pointer-events-none" />
        </div>
        <div className="flex-1 space-y-2">
          <Bone className="h-2.5 w-3/4 rounded-full bg-slate-200/80 dark:bg-slate-700/60" />
          <Bone className="h-2.5 w-1/2 rounded-full bg-slate-200/60 dark:bg-slate-700/40" />
        </div>
        <Bone className="h-2.5 w-12 rounded-full bg-slate-200/60 dark:bg-slate-700/40" />
      </div>
    ))}
  </div>
);
