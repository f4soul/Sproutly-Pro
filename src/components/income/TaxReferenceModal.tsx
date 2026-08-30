import React, { Fragment } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, X } from 'lucide-react';
import { TaxBracket } from '../../types';
import { formatNumber } from '../../lib/taxCalculator';

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
            className="fixed inset-y-0 right-0 left-0 md:left-68 bg-slate-900/20 dark:bg-slate-950/80 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 left-0 md:left-68 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none z-[100]">
            <Dialog.Panel as={Fragment}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-2xl w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200/60 dark:border-white/[0.08] flex flex-col max-h-[90vh] pointer-events-auto"
              >
        <div className="flex justify-between items-center px-6 py-5 sm:px-8 sm:py-6 shrink-0">
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

        <div className="px-4 sm:px-6 pb-2 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              В {year} году применяется прогрессивная шкала НДФЛ. Налог рассчитывается ступенчато: каждая следующая ставка применяется только к сумме, превышающей предыдущий порог.
            </p>
            
            <div className="bg-white/50 dark:bg-white/[0.03] rounded-2xl border border-slate-200/60 dark:border-white/[0.05] overflow-hidden backdrop-blur-md">
              <div className="grid grid-cols-12 gap-2 p-3 px-4 bg-slate-100/50 dark:bg-black/20 border-b border-slate-200/60 dark:border-white/[0.05] text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                <div className="col-span-8">Доход за год</div>
                <div className="col-span-4 text-right">Ставка</div>
              </div>
              <div className="divide-y divide-slate-200/60 dark:divide-white/[0.05]">
                {brackets.map((bracket, index) => {
                  const prevLimit = index === 0 ? 0 : (brackets[index - 1].limit || 0);
                  return (
                    <div key={`bracket-${bracket.rate}-${bracket.limit}`} className="grid grid-cols-12 gap-2 p-3 px-4 items-center text-sm transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <div className="col-span-8 text-slate-950 dark:text-white">
                        {bracket.limit === Infinity 
                          ? <span>Свыше <span className="tabular-nums">{formatNumber(prevLimit)} ₽</span></span>
                          : index === 0 
                            ? <span>До <span className="tabular-nums">{formatNumber(bracket.limit || 0)} ₽</span></span>
                            : <span>От <span className="tabular-nums">{formatNumber(prevLimit)}</span> до <span className="tabular-nums">{formatNumber(bracket.limit || 0)} ₽</span></span>
                        }
                      </div>
                      <div className="col-span-4 text-right font-bold text-primary-600 dark:text-primary-400">
                        <span className="tabular-nums">{Math.round(bracket.rate * 100)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-primary-50/50 dark:bg-primary-900/20 p-5 rounded-2xl border border-primary-100 dark:border-primary-800/30 mt-6 backdrop-blur-sm">
              <h4 className="text-sm font-bold text-primary-800 dark:text-primary-300 mb-2">Пример расчета</h4>
              <p className="text-xs text-primary-600 dark:text-primary-400 leading-relaxed">
                Если ваш доход за год составил <span className="tabular-nums">3 000 000 ₽</span> (по шкале 2025 года):<br/>
                • С первых <span className="tabular-nums">2 400 000 ₽</span> вы заплатите <span className="tabular-nums">13%</span> = <span className="tabular-nums">312 000 ₽</span><br/>
                • С оставшихся <span className="tabular-nums">600 000 ₽</span> вы заплатите <span className="tabular-nums">15%</span> = <span className="tabular-nums">90 000 ₽</span><br/>
                • Итого налог: <span className="tabular-nums">402 000 ₽</span> (эффективная ставка <span className="tabular-nums">13.4%</span>)
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 shrink-0">
          <button 
            onClick={onClose}
            className="apple-button w-full bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/[0.08] text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-white/10 transition-all active:scale-[0.98] py-3.5 sm:py-3 rounded-2xl font-bold text-sm sm:text-base shadow-sm"
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
