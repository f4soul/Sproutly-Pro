import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { formatNumber } from '../../lib/taxCalculator';

export const TableInput = ({ 
  value, 
  onChange, 
  className, 
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
  const [localValue, setLocalValue] = useState('');
  
  const displayValue = focused 
    ? localValue
    : (isInteger 
        ? Math.round(value).toString() 
        : (hideDecimals 
            ? Math.round(value).toLocaleString('ru-RU') 
            : formatNumber(value)));

  const handleFocus = () => {
    setFocused(true);
    setLocalValue(value === 0 ? '' : value.toString().replace('.', ','));
  };

  const commitValue = () => {
    const valStr = localValue.replace(/,/g, '.').replace(/\s/g, '');
    let num = parseFloat(valStr);
    if (isNaN(num)) num = 0;
    if (isInteger) num = Math.round(num);
    
    setFocused(false);
    if (num !== value) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    commitValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full min-w-0 px-1.5 py-1 text-right font-mono tabular-nums text-xs md:text-sm bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded transition-all outline-none",
        className
      )}
    />
  );
};

