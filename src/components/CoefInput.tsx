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
        "apple-input w-full px-1 py-1 text-center font-mono tabular-nums",
        className
      )}
    />
  );
};
