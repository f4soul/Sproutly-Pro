import React, { Fragment } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Deposit } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { getBankDetails } from '../../lib/banks';
import { calculateIncomeByYears } from '../../lib/depositCalculations';

interface BankDetailsModalProps {
  selectedBank: string | null;
  selectedYear: number;
  onClose: () => void;
  bankData: { name: string; value: number }[];
  selectedBankDeposits: Deposit[];
}

export function BankDetailsModal({ 
  selectedBank, 
  selectedYear, 
  onClose, 
  bankData, 
  selectedBankDeposits 
}: BankDetailsModalProps) {
  return (
    <AnimatePresence>
      {!!selectedBank && (
        <Dialog as="div" className="relative z-[100]" open={true} onClose={onClose} static>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/10 dark:bg-slate-950/80 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <Dialog.Panel as={Fragment}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white dark:bg-slate-950 w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col pointer-events-auto px-6 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden p-1.5 shadow-sm">
                      <img 
                        src={getBankDetails(selectedBank || '').logoUrl} 
                        alt="" 
                        className="w-full h-full object-contain" 
                        style={{ transform: `scale(${getBankDetails(selectedBank || '').iconScale || 1}) translate(${getBankDetails(selectedBank || '').iconOffsetX || 0}px, ${getBankDetails(selectedBank || '').iconOffsetY || 0}px)` }}
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-slate-950 dark:text-white">
                        {selectedBank}
                      </Dialog.Title>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Детализация за {selectedYear} год</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-slate-50 dark:hover:bg-white/10 text-slate-500 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-deposit-50 dark:bg-deposit-500/10 border border-deposit-100 dark:border-deposit-500/20">
                    <div className="text-[10px] font-bold text-deposit-600 dark:text-deposit-400 uppercase tracking-widest mb-1">Итоговый доход в банке</div>
                    <div className="text-2xl font-bold text-deposit-700 dark:text-deposit-300">
                      <span className="tabular-nums">{formatCurrency(bankData.find(b => b.name === selectedBank)?.value || 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Активные вклады</h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {selectedBankDeposits.map((d, i) => {
                        const yearIncome = calculateIncomeByYears(d).find(yi => yi.year === selectedYear)?.income || 0;
                        return (
                          <div key={`bank-deposit-${d.id || i}-${i}`} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="text-xs font-bold text-slate-950 dark:text-white truncate max-w-[180px]">{d.sourceNote || 'Вклад без названия'}</div>
                              <div className="text-xs font-bold text-deposit-600 dark:text-deposit-400 tabular-nums">{formatCurrency(yearIncome, d.currency || 'RUB')}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Сумма</span>
                                <span className="text-[10px] font-bold text-slate-950 dark:text-white tabular-nums">{formatCurrency(d.amount, d.currency || 'RUB')}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Ставка</span>
                                <span className="text-[10px] font-bold text-slate-950 dark:text-white tabular-nums">{d.rate}%</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Срок до</span>
                                <span className="text-[10px] font-bold text-slate-950 dark:text-white">
                                  {d.endDate && !isNaN(new Date(d.endDate).getTime()) ? new Date(d.endDate).toLocaleDateString() : '...'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    type="button"
                    className="apple-button w-full bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                    onClick={onClose}
                  >
                    Закрыть
                  </button>
                </div>
              </motion.div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
