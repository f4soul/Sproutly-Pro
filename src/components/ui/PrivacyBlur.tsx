import React from 'react';
import { cn } from '../../lib/utils';

export const PrivacyBlur = ({ children, isPrivate, className }: { children: React.ReactNode, isPrivate: boolean, className?: string }) => {
  return (
    <span className={cn(
      "transition-all duration-300", 
      isPrivate ? "blur-[6px] opacity-30 select-none pointer-events-none grayscale" : "blur-0 opacity-100", 
      className
    )}>
      {children}
    </span>
  );
};
