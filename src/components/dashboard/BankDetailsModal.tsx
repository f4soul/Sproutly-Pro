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
              <Dialog.Panel className="apple-card w-full max-w-md transform overflow-hidden p-6 text-left align-middle transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] dark:bg-white/5 border border-light-border dark:border-dark-border flex items-center justify-center overflow-hidden p-1.5 shadow-sm">
                      <img 
                        src={getBankDetails(selectedBank || '').logoUrl} 
                        alt="" 
                        className="w-full h-full object-contain" 
                        style={{ transform: `scale(${getBankDetails(selectedBank || '').iconScale || 1}) translate(${getBankDetails(selectedBank || '').iconOffsetX || 0}px, ${getBankDetails(selectedBank || '').iconOffsetY || 0}px)` }}
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-light-text-primary dark:text-dark-text-primary">
                        {selectedBank}
                      </Dialog.Title>
                      <p className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest">Детализация за {selectedYear} год</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-[#F5F5F7] dark:hover:bg-white/10 text-light-text-secondary transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Итоговый доход в банке</div>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(bankData.find(b => b.name === selectedBank)?.value || 0)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest px-1">Активные вклады</h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {selectedBankDeposits.map((d, i) => {
                        const yearIncome = calculateIncomeByYears(d).find(yi => yi.year === selectedYear)?.income || 0;
                        return (
                          <div key={i} className="p-3 rounded-xl bg-[#F5F5F7] dark:bg-white/5 border border-light-border dark:border-dark-border space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary truncate max-w-[180px]">{d.sourceNote || 'Вклад без названия'}</div>
                              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(yearIncome)}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-tighter">Сумма</span>
                                <span className="text-[10px] font-bold text-light-text-primary dark:text-dark-text-primary">{formatCurrency(d.amount)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-tighter">Ставка</span>
                                <span className="text-[10px] font-bold text-light-text-primary dark:text-dark-text-primary">{d.rate}%</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-tighter">Срок до</span>
                                <span className="text-[10px] font-bold text-light-text-primary dark:text-dark-text-primary">
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
                    className="apple-button w-full bg-blue-600 text-white shadow-lg shadow-blue-500/20"
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
