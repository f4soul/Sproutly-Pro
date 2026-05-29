import React from 'react';
import { cn } from '../../lib/utils';

export const PrivacyBlur = ({ children, isPrivate, className }: { children: React.ReactNode, isPrivate: boolean, className?: string }) => {
  return (
    <span className={cn(
      "transition-all duration-300 rounded-lg inline-block relative", 
      isPrivate ? "opacity-40 select-none pointer-events-none grayscale brightness-50 text-slate-800 dark:text-slate-200" : "opacity-100", 
      className
    )}
    style={{
      filter: isPrivate ? 'blur(0.35em)' : 'none'
    }}>
      {children}
    </span>
  );
};
