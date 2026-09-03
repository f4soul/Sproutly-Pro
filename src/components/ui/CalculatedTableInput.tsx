import React, { Fragment, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calculator, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/taxCalculator';

interface CalculatedTableInputProps {
  value: number;
  computedValue: number;
  baseAmount?: number;
  onChange: (val: number) => void;
  type: 'percent' | 'percent_annual' | 'coef' | 'percent_base';
  label: string;
  className?: string;
  mobileOnly?: boolean;
}

export const CalculatedTableInput = ({
  value,
  computedValue,
  baseAmount,
  onChange,
  type,
  label,
  className,
  mobileOnly = false
}: CalculatedTableInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState('');

  const handleOpen = () => {
    setLocalValue(value === 0 ? '' : value.toString().replace('.', ','));
    setIsOpen(true);
  };

  const handleSave = () => {
    const valStr = localValue.replace(/,/g, '.').replace(/\s/g, '');
    let num = parseFloat(valStr);
    if (isNaN(num)) num = 0;
    
    onChange(num);
    setIsOpen(false);
  };
  
  const sign = type.includes('percent') ? '%' : 'Коэф.';

  let liveComputed = computedValue;
  if (baseAmount !== undefined && localValue !== '') {
    let v = parseFloat(localValue.replace(/,/g, '.').replace(/\s/g, ''));
    if (isNaN(v)) v = 0;
    if (type === 'coef') liveComputed = baseAmount * v;
    else liveComputed = baseAmount * (v / 100);
  } else if (localValue === '') {
    liveComputed = 0;
  }

  return (
    <>
      <div 
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        className={cn(
          "w-full flex flex-col justify-center items-end cursor-pointer group relative",
          className
        )}
      >
        <div className={cn("tabular-nums font-bold text-primary-600 dark:text-primary-400  w-full text-right truncate", mobileOnly && "pb-3")}>
          {value > 0 ? value : 0}
        </div>
        {value > 0 && (
          <div className={cn(
            "text-slate-400 dark:text-slate-500 tabular-nums select-none pointer-events-none w-full text-left truncate",
            mobileOnly 
              ? "absolute left-0 bottom-0 text-[10px] pr-1" 
              : "mt-0.5 text-[8px] xl:text-[9px] leading-none"
          )}>
            ≈{formatCurrency(computedValue)}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <Dialog as="div" className="relative z-[200]" open={isOpen} onClose={() => setIsOpen(false)} static>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-y-0 right-0 left-0 md:left-68 bg-slate-900/10 dark:bg-slate-950/80 backdrop-blur-sm pointer-events-auto z-[190]"
              aria-hidden="true"
              onClick={() => setIsOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 left-0 md:left-68 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <Dialog.Panel as={Fragment}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 100 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 100 }}
                  className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-t-[32px] sm:rounded-[24px] rounded-b-none sm:rounded-b-[24px] shadow-2xl max-w-sm w-full mx-auto p-5 sm:p-6 pb-8 sm:pb-6 border-t sm:border border-slate-200/60 dark:border-white/[0.05] pointer-events-auto"
                >
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-3 text-primary-500">
                      <div className="p-2 bg-primary-500/10 rounded-xl">
                        <Calculator size={20} className="stroke-[2px]" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">{label}</h3>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-white/[0.02] shadow-inner">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      <span>Задать значение</span>
                      <span>В {type === 'coef' ? 'у.е' : 'процентах'}</span>
                    </div>
                    
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        autoFocus
                        value={localValue}
                        onChange={(e) => setLocalValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave();
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 pr-10 text-lg tabular-nums font-bold text-primary-600 dark:text-primary-400 focus:border-primary-500 outline-none text-right placeholder/30 shadow-sm"
                        placeholder="0"
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 font-bold">
                        {sign}
                      </div>
                      {localValue.length > 0 && (
                        <button 
                          onClick={() => setLocalValue('')} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hover:text-slate-500"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {(type === 'coef' || type === 'percent' || type === 'percent_base') && baseAmount === 0 && (
                    <div className="mb-4 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-xl">
                      <span className="text-[11px] leading-tight font-medium text-amber-700 dark:text-amber-400 block text-center">Укажите Базовый оклад в настройках, чтобы формула начала расчет.</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-2 mb-6">
                    <span className="text-xs font-bold text-slate-500">Результат ({sign}):</span>
                    <span className="tabular-nums font-bold text-primary-500">
                      ≈ {formatCurrency(liveComputed)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="flex-[0.4] apple-button flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wide text-xs font-bold"
                    >
                      Отмена
                    </button>
                    <button 
                      onClick={handleSave}
                      className="flex-[0.6] apple-button flex items-center justify-center bg-primary-500 text-white shadow-lg shadow-primary-500/25 gap-2 uppercase tracking-wide text-xs font-bold"
                    >
                      Сохранить
                    </button>
                  </div>
                </motion.div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
};
