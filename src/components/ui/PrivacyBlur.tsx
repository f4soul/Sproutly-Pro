import React from 'react';
import { cn } from '../../lib/utils';

export const PrivacyBlur = ({ children, isPrivate, className }: { children: React.ReactNode, isPrivate: boolean, className?: string }) => {
  return (
    <span className={cn(
      "transition-all duration-300 rounded-lg inline-block relative", 
      isPrivate ? "opacity-50 select-none pointer-events-none" : "opacity-100", 
      className
    )}
    style={{
      filter: isPrivate ? 'blur(calc(3px + 0.25em))' : 'none'
    }}>
      {children}
    </span>
  );
};
