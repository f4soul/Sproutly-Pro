import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
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
    <Transition show={!!selectedBank} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden p-1.5 shadow-sm">
                      <img 
                        src={getBankDetails(selectedBank || '').logoUrl} 
                        alt="" 
                        className="w-full h-full object-contain" 
                        style={{ transform: `scale(${getBankDetails(selectedBank || '').iconScale || 1}) translate(${getBankDetails(selectedBank || '').iconOffsetX || 0}px, ${getBankDetails(selectedBank || '').iconOffsetY || 0}px)` }}
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-black leading-6 text-slate-900 dark:text-white">
                        {selectedBank}
                      </Dialog.Title>
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Детализация за {selectedYear} год</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                    <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Итоговый доход в банке</div>
                    <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(bankData.find(b => b.name === selectedBank)?.value || 0)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest px-1">Активные вклады</h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                      {selectedBankDeposits.map((d, i) => {
                        const yearIncome = calculateIncomeByYears(d).find(yi => yi.year === selectedYear)?.income || 0;
                        return (
                          <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50 space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[180px]">{d.sourceNote || 'Вклад без названия'}</div>
                              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(yearIncome)}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Сумма</span>
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">{formatCurrency(d.amount)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Ставка</span>
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">{d.rate}%</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Срок до</span>
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">
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
                    className="w-full inline-flex justify-center rounded-xl border border-transparent bg-slate-900 dark:bg-white px-4 py-3 text-sm font-black text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer shadow-xl shadow-slate-900/20 dark:shadow-white/10"
                    onClick={onClose}
                  >
                    Закрыть
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
