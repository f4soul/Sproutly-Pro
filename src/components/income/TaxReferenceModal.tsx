import React, { Fragment } from 'react';
import { Dialog } from '@headlessui/react';
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
        <Dialog as="div" className="relative z-[100]" open={true} onClose={onClose} static>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <Dialog.Panel as={Fragment}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col max-h-[90vh] pointer-events-auto"
              >
        <div className="flex justify-between items-center px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 text-slate-950 dark:text-white">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-full text-primary-600 dark:text-primary-400">
              <Info size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight">Справка: НДФЛ {year}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-all active:scale-90 cursor-pointer -mt-4 -mr-2 sm:-mr-4">
            <X className="w-5 h-5 text-slate-500" />
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
            className="apple-button w-full bg-slate-950 dark:bg-white/10 border border-transparent dark:border-white/10 text-white hover:bg-slate-800 dark:hover:bg-white/20 shadow-sm"
          >
            Понятно
          </button>
        </div>
              </motion.div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
