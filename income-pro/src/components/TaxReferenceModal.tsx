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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <Info size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold">Справка: НДФЛ {year}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full flex-1">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              В {year} году применяется прогрессивная шкала НДФЛ. Налог рассчитывается ступенчато: каждая следующая ставка применяется только к сумме, превышающей предыдущий порог.
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-3 bg-gray-100 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="col-span-8">Доход за год</div>
                <div className="col-span-4 text-right">Ставка</div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {brackets.map((bracket, index) => {
                  const prevLimit = index === 0 ? 0 : brackets[index - 1].limit;
                  return (
                    <div key={index} className="grid grid-cols-12 gap-2 p-3 items-center text-sm">
                      <div className="col-span-8 text-gray-700 dark:text-gray-300">
                        {bracket.limit === Infinity 
                          ? `Свыше ${formatCurrency(prevLimit)}`
                          : index === 0 
                            ? `До ${formatCurrency(bracket.limit)}`
                            : `От ${formatCurrency(prevLimit)} до ${formatCurrency(bracket.limit)}`
                        }
                      </div>
                      <div className="col-span-4 text-right font-bold text-blue-600 dark:text-blue-400">
                        {Math.round(bracket.rate * 100)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 mt-6">
              <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Пример расчета</h4>
              <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                Если ваш доход за год составил 3 000 000 ₽ (по шкале 2025 года):<br/>
                • С первых 2 400 000 ₽ вы заплатите 13% = 312 000 ₽<br/>
                • С оставшихся 600 000 ₽ вы заплатите 15% = 90 000 ₽<br/>
                • Итого налог: 402 000 ₽ (эффективная ставка 13.4%)
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
          <button 
            onClick={onClose}
            className="w-full py-2.5 font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-xl transition-colors cursor-pointer text-sm"
          >
            Понятно
          </button>
        </div>
      </motion.div>
    </div>
  );
};
