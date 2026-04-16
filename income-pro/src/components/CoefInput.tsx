import React, { useState } from 'react';
import { cn } from '../lib/utils';

export const CoefInput = ({ value, onChange, className }: { value: number, onChange: (v: number) => void, className?: string }) => {
  const [focused, setFocused] = useState(false);
  const displayValue = focused ? value : (value ? parseFloat(value.toFixed(3)) : '');
  
  return (
    <input
      type="number"
      step="0.001"
      value={displayValue}
      onFocus={(e) => { setFocused(true); e.target.select(); }}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={cn(
        "w-full bg-transparent border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 outline-none px-1 py-1 text-center transition-all font-mono tabular-nums rounded-md",
        className
      )}
    />
  );
};
