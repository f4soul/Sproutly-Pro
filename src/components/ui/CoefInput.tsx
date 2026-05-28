import React, { useState } from 'react';
import { cn } from '../../lib/utils';

export const CoefInput = ({ value, onChange, className }: { value: number, onChange: (v: number) => void, className?: string }) => {
  const [focused, setFocused] = useState(false);
  const displayValue = focused ? (value === 0 ? '' : value) : (value ? parseFloat(value.toFixed(3)) : '');
  
  return (
    <input
      type="number"
      step="0.001"
      value={displayValue}
      onFocus={(e) => { setFocused(true); e.target.select(); }}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={cn(
        "w-full min-w-0 px-1 py-1 text-center font-mono tabular-nums bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded transition-all outline-none",
        className
      )}
    />
  );
};
