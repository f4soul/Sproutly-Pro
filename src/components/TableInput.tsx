import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { formatNumber } from '../lib/taxCalculator';

export const TableInput = ({ 
  value, 
  onChange, 
  className, 
  step = "any",
  isCurrency = true,
  hideDecimals = false,
  isInteger = false
}: { 
  value: number, 
  onChange: (val: number) => void, 
  className?: string, 
  step?: string,
  isCurrency?: boolean,
  hideDecimals?: boolean,
  isInteger?: boolean
}) => {
  const [focused, setFocused] = useState(false);
  
  const displayValue = focused 
    ? (value === 0 ? '' : value) 
    : (isInteger 
        ? Math.round(value).toString() 
        : (hideDecimals 
            ? Math.round(value).toLocaleString('ru-RU') 
            : formatNumber(value)));

  return (
    <input
      type={focused ? "number" : "text"}
      value={displayValue}
      onFocus={(e) => { setFocused(true); e.target.select(); }}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(isInteger ? Math.round(parseFloat(e.target.value) || 0) : (parseFloat(e.target.value) || 0))}
      step={isInteger ? "1" : step}
      className={cn(
        "apple-input w-full px-1 md:px-2 py-1.5 text-right font-mono tabular-nums text-xs md:text-sm",
        className
      )}
    />
  );
};
