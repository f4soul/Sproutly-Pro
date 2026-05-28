import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, X } from 'lucide-react';
import { TaxBracket } from '../../types';
import { formatCurrency } from '../../lib/taxCalculator';

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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="tax-reference-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 w-full h-[100dvh] z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/60"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="apple-card max-w-lg w-full max-h-[90dvh] flex flex-col overflow-hidden relative z-10"
          >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 text-slate-950 dark:text-white">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-full text-primary-600 dark:text-primary-400">
              <Info size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold">Справка: НДФЛ {year}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-950 dark:hover:text-white cursor-pointer p-1 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              В {year} году применяется прогрессивная шкала НДФЛ. Налог рассчитывается ступенчато: каждая следующая ставка применяется только к сумме, превышающей предыдущий порог.
            </p>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-3 bg-white/50 dark:bg-black/20 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <div className="col-span-8">Доход за год</div>
                <div className="col-span-4 text-right">Ставка</div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {brackets.map((bracket, index) => {
                  const prevLimit = index === 0 ? 0 : brackets[index - 1].limit;
                  return (
                    <div key={`bracket-${bracket.rate}-${bracket.limit}`} className="grid grid-cols-12 gap-2 p-3 items-center text-sm">
                      <div className="col-span-8 text-slate-950 dark:text-white">
                        {bracket.limit === Infinity 
                          ? `Свыше ${formatCurrency(prevLimit)}`
                          : index === 0 
                            ? `До ${formatCurrency(bracket.limit)}`
                            : `От ${formatCurrency(prevLimit)} до ${formatCurrency(bracket.limit)}`
                        }
                      </div>
                      <div className="col-span-4 text-right font-bold text-primary-600 dark:text-primary-400">
                        {Math.round(bracket.rate * 100)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-800/50 mt-6">
              <h4 className="text-sm font-bold text-primary-800 dark:text-primary-300 mb-2">Пример расчета</h4>
              <p className="text-xs text-primary-600 dark:text-primary-400 leading-relaxed">
                Если ваш доход за год составил 3 000 000 ₽ (по шкале 2025 года):<br/>
                • С первых 2 400 000 ₽ вы заплатите 13% = 312 000 ₽<br/>
                • С оставшихся 600 000 ₽ вы заплатите 15% = 90 000 ₽<br/>
                • Итого налог: 402 000 ₽ (эффективная ставка 13.4%)
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-800/50">
          <button 
            onClick={onClose}
            className="apple-button w-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-950 dark:text-white hover:bg-slate-50 dark:hover:bg-white/20"
          >
            Понятно
          </button>
        </div>
      </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
