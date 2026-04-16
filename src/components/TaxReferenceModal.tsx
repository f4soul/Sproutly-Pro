import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Info, X } from 'lucide-react';
import { TaxBracket } from '../types';
import { formatCurrency } from '../lib/taxCalculator';

export const TaxReferenceModal = ({ 
  isOpen, 
  onClose, 
  year,
  brackets 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  year: number;
  brackets: TaxBracket[];
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="apple-card max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-light-border dark:border-dark-border shrink-0">
          <div className="flex items-center gap-3 text-light-text-primary dark:text-dark-text-primary">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
              <Info size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold">Справка: НДФЛ {year}</h3>
          </div>
          <button onClick={onClose} className="text-light-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary cursor-pointer p-1 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-4">
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
              В {year} году применяется прогрессивная шкала НДФЛ. Налог рассчитывается ступенчато: каждая следующая ставка применяется только к сумме, превышающей предыдущий порог.
            </p>
            
            <div className="bg-[#F5F5F7] dark:bg-white/5 rounded-xl border border-light-border dark:border-dark-border overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-3 bg-white/50 dark:bg-black/20 border-b border-light-border dark:border-dark-border text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                <div className="col-span-8">Доход за год</div>
                <div className="col-span-4 text-right">Ставка</div>
              </div>
              <div className="divide-y divide-light-border dark:divide-dark-border">
                {brackets.map((bracket, index) => {
                  const prevLimit = index === 0 ? 0 : brackets[index - 1].limit;
                  return (
                    <div key={index} className="grid grid-cols-12 gap-2 p-3 items-center text-sm">
                      <div className="col-span-8 text-light-text-primary dark:text-dark-text-primary">
                        {bracket.limit === Infinity 
                          ? `Свыше ${formatCurrency(prevLimit)}`
                          : index === 0 
                            ? `До ${formatCurrency(bracket.limit)}`
                            : `От ${formatCurrency(prevLimit)} до ${formatCurrency(bracket.limit)}`
                        }
                      </div>
                      <div className="col-span-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                        {Math.round(bracket.rate * 100)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50 mt-6">
              <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-2">Пример расчета</h4>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
                Если ваш доход за год составил 3 000 000 ₽ (по шкале 2025 года):<br/>
                • С первых 2 400 000 ₽ вы заплатите 13% = 312 000 ₽<br/>
                • С оставшихся 600 000 ₽ вы заплатите 15% = 90 000 ₽<br/>
                • Итого налог: 402 000 ₽ (эффективная ставка 13.4%)
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-light-border dark:border-dark-border shrink-0 bg-[#F5F5F7]/50 dark:bg-white/5">
          <button 
            onClick={onClose}
            className="apple-button w-full bg-white dark:bg-white/10 border border-light-border dark:border-white/10 text-light-text-primary dark:text-dark-text-primary hover:bg-[#F5F5F7] dark:hover:bg-white/20"
          >
            Понятно
          </button>
        </div>
      </motion.div>
    </div>
  );
};
