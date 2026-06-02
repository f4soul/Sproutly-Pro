import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { X, Save, Calendar, CalendarX, Landmark, Percent, Wallet, Info, Clock, ChevronDown, Check, Plus, Trash2, Calculator, Settings, Edit2 } from 'lucide-react';
import { Listbox, Transition, Combobox, Dialog } from '@headlessui/react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ru } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import { motion, AnimatePresence } from 'motion/react';
import { Deposit, CalculationFormula, Bank } from '../../types';

import { BankIconEditor } from './BankIconEditor';
import { db, syncWithFirebase } from '../../config/db';
import { cn } from '../../lib/utils';
import { addDays, differenceInDays } from 'date-fns';
import { auth } from '../../config/firebase';
import { getAllBanks, DEFAULT_BANK_ICON, syncCustomBanksCache } from '../../lib/banks';
import { BankLogo } from './BankLogo';

registerLocale('ru', ru);

const formulas: { id: CalculationFormula; name: string }[] = [
  { id: 'simple_days', name: 'В конце срока' },
  { id: 'simple_months', name: 'Ежемесячная выплата' },
  { id: 'compound_monthly', name: 'С капитализацией' },
  { id: 'daily_balance', name: 'На ежедневный остаток' },
  { id: 'min_balance', name: 'На минимальный остаток' },
  { id: '', name: 'Без расчета' },
];

interface DepositFormProps {
  deposit?: Deposit;
  onClose: () => void;
}

export function DepositForm({ deposit, onClose }: DepositFormProps) {
  // Scroll locking handled by Dialog natively

  const [duration, setDuration] = useState<number | ''>('');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [query, setQuery] = useState('');
  const [showBankEditor, setShowBankEditor] = useState(false);
  const [newBank, setNewBank] = useState<Partial<Bank>>({
    name: '',
    color: '#0d9488',
    logoText: '',
    logoUrl: DEFAULT_BANK_ICON,
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
    isCustom: true
  });

  const [formData, setFormData] = useState<Partial<Deposit>>({
    bank: '',
    startDate: new Date(),
    endDate: null,
    amount: 0,
    rate: 0,
    formula: 'simple_days',
    sourceNote: '',
    comment: '',
    isClosed: false,
    isArchived: 0,
    splitIncome: false,
  });

  useEffect(() => {
    const loadBanks = async () => {
      const allBanks = await getAllBanks();
      setBanks(allBanks);
    };
    loadBanks();
  }, []);

  useEffect(() => {
    if (deposit) {
      const startDate = deposit.startDate ? new Date(deposit.startDate) : new Date();
      const endDate = deposit.endDate ? new Date(deposit.endDate) : null;
      
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        ...deposit,
        startDate: isNaN(startDate.getTime()) ? new Date() : startDate,
        endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
      });
      if (deposit.endDate && !isNaN(startDate.getTime()) && endDate && !isNaN(endDate.getTime())) {
        setDuration(differenceInDays(endDate, startDate));
      }
    }
  }, [deposit]);

  const filteredBanks = useMemo(() => {
    return query === ''
      ? banks
      : banks.filter((bank) =>
          (bank.name || '')
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(query.toLowerCase().replace(/\s+/g, ''))
        );
  }, [banks, query]);

  const handleDurationChange = (val: number | '') => {
    setDuration(val);
    if (val !== '' && formData.startDate) {
      const startDate = new Date(formData.startDate);
      if (!isNaN(startDate.getTime())) {
        const newEndDate = addDays(startDate, val);
        setFormData(prev => ({ ...prev, endDate: newEndDate }));
      }
    }
  };

  const handleStartDateChange = (date: Date) => {
    if (isNaN(date.getTime())) return;
    setFormData(prev => ({ ...prev, startDate: date }));
    if (duration !== '') {
      const newEndDate = addDays(date, Number(duration));
      setFormData(prev => ({ ...prev, endDate: newEndDate }));
    }
  };

  const handleRawDateInput = (e: React.KeyboardEvent<HTMLElement>, isStartDate: boolean) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement;
      const val = target.value?.replace(/\D/g, '');
      if (val && val.length === 8) {
        const day = parseInt(val.substring(0, 2), 10);
        const month = parseInt(val.substring(2, 4), 10) - 1;
        const year = parseInt(val.substring(4, 8), 10);
        const newDate = new Date(year, month, day);
        if (!isNaN(newDate.getTime())) {
          if (isStartDate) {
             handleStartDateChange(newDate);
          } else {
             setFormData(prev => {
                const next = { ...prev, endDate: newDate };
                if (next.startDate) {
                  setDuration(differenceInDays(newDate, next.startDate));
                }
                return next;
             });
          }
          e.preventDefault();
        }
      }
    }
  };

  const handleSaveNewBank = async () => {
    if (!newBank.name) return;
    const user = auth.currentUser;
    const bankToSave = {
      ...newBank,
      isCustom: true,
      userId: user?.uid,
      logoText: newBank.name.charAt(0).toUpperCase(),
      updatedAt: Date.now()
    } as Bank;
    
    // Dexie will auto-generate id since banks table uses ++id or preserve existing
    const id = await db.banks.put(bankToSave);
    const savedBank = { ...bankToSave, id };
    
    // Sync synchronous RAM cache immediately
    await syncCustomBanksCache();

    if (newBank.id) {
      setBanks(prev => prev.map(b => b.id === newBank.id ? savedBank : b));
    } else {
      setBanks(prev => [...prev, savedBank]);
    }
    
    setFormData(prev => ({ ...prev, bank: savedBank.name }));
    setShowBankEditor(false);

    // Sync with Firebase in background
    syncWithFirebase().catch(console.error);
  };

  const handleEditBank = (e: React.MouseEvent, bank: Bank) => {
    e.preventDefault();
    e.stopPropagation();
    setNewBank(bank);
    setShowBankEditor(true);
  };

  const [bankToDelete, setBankToDelete] = useState<string | number | null>(null);

  const confirmDeleteBank = async () => {
    if (!bankToDelete) return;
    await db.banks.delete(bankToDelete);
    await syncCustomBanksCache(); // Sync RAM cache
    setBanks(prev => prev.filter(b => b.id !== bankToDelete));
    const deletedBank = banks.find(b => b.id === bankToDelete);
    if (formData.bank === deletedBank?.name) {
      setFormData(prev => ({ ...prev, bank: '' }));
    }
    const user = auth.currentUser;
    if (user) {
      const firestoreDocId = typeof bankToDelete === 'number' ? `${user.uid}_${bankToDelete}` : String(bankToDelete);
      await db.deletedQueue.put({ collection: 'banks', docId: firestoreDocId, timestamp: Date.now() });
    }
    setBankToDelete(null);

    // Sync deletion with Firebase in background
    syncWithFirebase().catch(console.error);
  };

  const handleDeleteBank = (e: React.MouseEvent, bankId: string | number) => {
    e.preventDefault();
    e.stopPropagation();
    setBankToDelete(bankId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    const dataToSave = {
      ...formData,
      userId: user?.uid || undefined,
      updatedAt: Date.now(),
      bank: formData.bank || 'Неизвестный банк',
      startDate: formData.startDate || new Date(),
      amount: Number(formData.amount) || 0,
      rate: Number(formData.rate) || 0,
    } as Deposit;

    if (deposit?.id) {
      await db.deposits.put({ ...dataToSave, id: deposit.id });
    } else {
      await db.deposits.put(dataToSave);
    }
    onClose();
  };

  return (
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
            className="bg-white dark:bg-slate-950 w-full max-w-xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col max-h-[90vh] pointer-events-auto"
          >
          <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 dark:text-white">{deposit ? 'Редактировать вклад' : 'Новый вклад'}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-medium mt-1">Заполните данные для точного расчета налога</p>
              </div>
              <button type="button" onClick={onClose} className="p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-all active:scale-90 cursor-pointer -mt-4 -mr-2 sm:-mr-4">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar flex-1">
            <div className="flex flex-wrap gap-2 w-full">
              <ToggleChip 
                label="Накопительный" 
                icon={<Wallet className="w-3 h-3 stroke-[1.5px]" />}
                checked={formData.formula === 'daily_balance' || formData.formula === 'min_balance'} 
                onChange={(val) => {
                  if (val) {
                    setFormData({ ...formData, formula: 'daily_balance', endDate: null });
                    setDuration('');
                  } else {
                    setFormData({ ...formData, formula: 'simple_months' });
                  }
                }} 
              />
              <ToggleChip 
                label="Разбивать доход" 
                icon={<Calendar className="w-3 h-3 stroke-[1.5px]" />}
                checked={!!formData.splitIncome} 
                onChange={(val) => setFormData({ ...formData, splitIncome: val })} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Landmark className="w-3.5 h-3.5 text-primary-500 stroke-[1.5px]" /> Банк
                </label>
                
                <Combobox value={formData.bank} onChange={(val) => {
                  if (val === '__ADD_NEW__') {
                    setNewBank({
                      name: query || '',
                      color: '#0d9488',
                      logoText: '',
                      logoUrl: DEFAULT_BANK_ICON,
                      iconScale: 1,
                      iconOffsetX: 0,
                      iconOffsetY: 0,
                      isCustom: true
                    });
                    setShowBankEditor(true);
                  } else {
                    setFormData({ ...formData, bank: val });
                  }
                  if (typeof document !== 'undefined' && document.activeElement) {
                    (document.activeElement as HTMLElement).blur();
                  }
                }}>
                  <div className="relative">
                    <div className="relative w-full cursor-default overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-left border border-transparent focus-within:border-deposit-500/30 transition-all">
                      <Combobox.Input
                        className="w-full border-none py-3 pl-4 pr-10 text-sm font-medium bg-transparent outline-none text-slate-950 dark:text-white"
                        displayValue={(val: any) => (typeof val === 'string' ? val : '')}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Выберите банк"
                      />
                      <Combobox.Button 
                        onClick={() => {
                          if (typeof document !== 'undefined' && document.activeElement) {
                            (document.activeElement as HTMLElement).blur();
                          }
                        }}
                        className="absolute inset-y-0 right-0 flex items-center px-3"
                      >
                        <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      </Combobox.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                      afterLeave={() => setQuery('')}
                    >
                      <Combobox.Options className="absolute mt-2 max-h-60 w-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-1.5 flex flex-col gap-0.5 text-sm shadow-2xl z-[110] border border-slate-200/60 dark:border-white/[0.08] focus:outline-none">
                        {filteredBanks.length === 0 && query !== '' ? (
                          <div className="relative cursor-default select-none py-2 px-4 text-slate-500">
                            Ничего не найдено.
                          </div>
                        ) : (
                          filteredBanks.map((bank, bankIdx) => (
                            <Combobox.Option
                              key={`bank-option-${bank.id || bank.name || 'custom'}-${bankIdx}`}
                              className={({ active }) =>
                                cn(
                                  'relative cursor-pointer select-none py-2.5 px-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-between gap-2 border border-transparent',
                                  active 
                                    ? 'bg-slate-100/70 dark:bg-slate-800/60 text-slate-900 dark:text-white border-slate-200/40 dark:border-white/[0.04] shadow-sm' 
                                    : 'text-slate-950 dark:text-white'
                                )
                              }
                              value={bank.name}
                            >
                              {({ selected }) => (
                                <>
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                      <div className="w-7 h-7 rounded-lg bg-white/50 dark:bg-transparent border border-slate-200/60 dark:border-white/[0.08] flex items-center justify-center overflow-hidden transition-all shrink-0">
                                        <BankLogo 
                                          logoUrl={bank.logoUrl} 
                                          alt="" 
                                          className="w-4.5 h-4.5 object-contain"
                                        />
                                      </div>
                                      <span className={cn('block truncate text-sm font-medium transition-all text-slate-800 dark:text-slate-200', selected && 'font-bold text-slate-950 dark:text-white')}>
                                        {bank.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {selected && (
                                        <span className="text-deposit-500 flex items-center justify-center">
                                          <Check className="h-4 w-4 stroke-[2.5px]" />
                                        </span>
                                      )}
                                      {bank.isCustom && (
                                        <>
                                          <button 
                                            type="button"
                                            onClick={(e) => handleEditBank(e, bank)}
                                            className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-deposit-500 hover:bg-deposit-500/10 rounded-lg transition-all cursor-pointer z-10 shrink-0"
                                            title="Редактировать банк"
                                          >
                                            <Edit2 size={13} className="stroke-[2px]" />
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={(e) => handleDeleteBank(e, bank.id as string | number)}
                                            className="h-7 w-7 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer z-10 shrink-0"
                                            title="Удалить банк"
                                          >
                                            <Trash2 size={13} className="stroke-[2px]" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </Combobox.Option>
                          ))
                        )}
                        <Combobox.Option
                          value="__ADD_NEW__"
                          className={({ active }) =>
                            cn(
                              'flex items-center gap-2.5 py-2.5 px-3 rounded-xl font-bold transition-all duration-200 cursor-pointer mt-1 border border-dashed border-deposit-500/20 dark:border-deposit-500/10 text-deposit-600 dark:text-deposit-400',
                              active 
                                ? 'bg-deposit-50/50 dark:bg-deposit-500/10 border-solid border-deposit-500/30' 
                                : 'bg-transparent'
                            )
                          }
                        >
                          <Plus size={16} className="stroke-[2.5px] text-deposit-500 shrink-0" />
                          <span className="text-xs tracking-wide uppercase">Добавить новый банк</span>
                        </Combobox.Option>
                      </Combobox.Options>
                    </Transition>
                  </div>
                </Combobox>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" /> Сумма (₽)
                </label>
                <input 
                  required
                  type="number" 
                  inputMode="decimal"
                  pattern="[0-9]*"
                  step="0.01"
                  value={formData.amount === 0 ? '' : formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="apple-input w-full font-mono text-sm"
                  placeholder="0.00"
                />
              </div>

              {showBankEditor && (
                <div className="md:col-span-2 mt-2 p-5 sm:p-6 lg:p-8 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 dark:border-white/[0.08] animate-in slide-in-from-top-2 duration-300 shadow-sm relative overflow-hidden">
                  <div className="relative flex items-center justify-between mb-6">
                    <h4 className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-deposit-500/10 dark:bg-deposit-500/20 flex items-center justify-center text-deposit-600 dark:text-deposit-400">
                        <Settings className="w-3.5 h-3.5 stroke-[2.5px]" />
                      </div>
                      Настройка банка
                    </h4>
                    <button type="button" onClick={() => setShowBankEditor(false)} className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full">
                      <X size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="relative flex flex-col gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Название банка</label>
                        <input 
                          type="text"
                          value={newBank.name}
                          onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
                          placeholder="Напр. Тинькофф, Сбербанк..."
                          className="apple-input w-full shadow-inner bg-white/50 dark:bg-slate-950/50"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleSaveNewBank}
                          disabled={!newBank.name}
                          className="apple-button w-full h-[46px] flex items-center justify-center bg-deposit-500 hover:bg-deposit-600 border border-deposit-400/50 dark:border-deposit-500/30 text-white shadow-[0_4px_16px_rgba(20,184,166,0.3)] hover:shadow-[0_4px_20px_rgba(20,184,166,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold active:scale-95 transition-all"
                        >
                          Сохранить
                        </button>
                      </div>
                    </div>
                    <div className="w-full">
                      <BankIconEditor 
                        bank={newBank} 
                        onChange={(updates) => setNewBank(prev => ({ ...prev, ...updates }))} 
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-primary-500 stroke-[1.5px]" /> Дата открытия
                </label>
                <div className="relative w-full group">
                  <DatePicker
                    selected={formData.startDate}
                    onChange={(date) => date && handleStartDateChange(date)}
                    onKeyDown={(e) => handleRawDateInput(e, true)}
                    locale="ru"
                    dateFormat="dd.MM.yyyy"
                    className="apple-input w-full pr-12 cursor-pointer"
                    placeholderText="Выберите дату"
                    wrapperClassName="w-full"
                    portalId="root"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-focus-within:text-primary-500 transition-colors stroke-[1.5px]" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-violet-500 stroke-[1.5px]" /> Срок (дней)
                </label>
                <input 
                  type="number" 
                  inputMode="decimal"
                  pattern="[0-9]*"
                  disabled={formData.formula === 'daily_balance' || formData.formula === 'min_balance'}
                  placeholder="91, 181..."
                  value={duration}
                  onChange={(e) => handleDurationChange(e.target.value ? Number(e.target.value) : '')}
                  className="apple-input w-full disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <CalendarX className="w-3.5 h-3.5 text-primary-500 stroke-[1.5px]" /> Дата закрытия
                </label>
                <div className="relative w-full group">
                  <DatePicker
                    selected={formData.endDate}
                    onChange={(date) => {
                      if (date) {
                        setFormData({ ...formData, endDate: date });
                        if (formData.startDate) {
                          setDuration(differenceInDays(date, formData.startDate));
                        }
                      } else {
                        setFormData({ ...formData, endDate: null });
                        setDuration('');
                      }
                    }}
                    onKeyDown={(e) => handleRawDateInput(e, false)}
                    locale="ru"
                    dateFormat="dd.MM.yyyy"
                    disabled={formData.formula === 'daily_balance' || formData.formula === 'min_balance'}
                    className="apple-input w-full pr-12 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    placeholderText="Бессрочно"
                    isClearable
                    wrapperClassName="w-full"
                    portalId="root"
                  />
                  <CalendarX className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-focus-within:text-primary-500 transition-colors stroke-[1.5px]" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Percent className="w-3.5 h-3.5 text-amber-500 stroke-[1.5px]" /> Ставка (%)
                </label>
                <input 
                  required
                  type="number" 
                  inputMode="decimal"
                  pattern="[0-9]*"
                  step="0.01"
                  value={formData.rate === 0 ? '' : formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="apple-input w-full font-mono text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calculator className="w-3.5 h-3.5 text-primary-500 stroke-[1.5px]" /> Формула расчета
                </label>
                <Listbox 
                  value={formData.formula} 
                  onChange={(val) => {
                    const isSavings = val === 'daily_balance' || val === 'min_balance';
                    setFormData({ 
                      ...formData, 
                      formula: val as CalculationFormula,
                      ...(isSavings ? { endDate: null } : {})
                    });
                    if (isSavings) setDuration('');
                  }}
                >
                  <div className="relative">
                    <Listbox.Button className="relative w-full cursor-pointer rounded-2xl bg-slate-50 dark:bg-slate-800/50 py-3 pl-4 pr-10 text-left border border-transparent focus:border-deposit-500/30 transition-all font-medium text-sm text-slate-950 dark:text-white">
                      <span className="block truncate">
                        {formulas.find(f => f.id === formData.formula)?.name}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      </span>
                    </Listbox.Button>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Listbox.Options className="absolute mt-2 max-h-60 w-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-1.5 flex flex-col gap-0.5 text-sm shadow-2xl z-[110] border border-slate-200/60 dark:border-white/[0.08] focus:outline-none">
                        {formulas.map((formula) => (
                          <Listbox.Option
                            key={formula.id}
                            className={({ active }) =>
                              cn(
                                'relative cursor-pointer select-none py-2.5 px-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-between gap-2 border border-transparent',
                                active 
                                  ? 'bg-slate-100/70 dark:bg-slate-800/60 text-slate-900 dark:text-white border-slate-200/40 dark:border-white/[0.04] shadow-sm' 
                                  : 'text-slate-850 dark:text-slate-200'
                              )
                            }
                            value={formula.id}
                          >
                            {({ selected }) => (
                              <>
                                <span className={cn('block truncate text-sm font-medium transition-all text-slate-800 dark:text-slate-200', selected && 'font-bold text-slate-950 dark:text-white')}>
                                  {formula.name}
                                </span>
                                {selected ? (
                                  <span className="text-deposit-500 flex items-center justify-center shrink-0">
                                    <Check className="h-4 w-4 stroke-[2.5px]" />
                                  </span>
                                ) : null}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </Listbox>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-primary-500 stroke-[1.5px]" /> Примечание
                </label>
                <input 
                  type="text" 
                  value={formData.sourceNote}
                  onChange={(e) => setFormData({ ...formData, sourceNote: e.target.value })}
                  className="apple-input w-full"
                  placeholder="На отпуск, Резерв..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-deposit-500 stroke-[1.5px]" /> Факт. доход (₽)
                </label>
                <input 
                  type="number" 
                  inputMode="decimal"
                  pattern="[0-9]*"
                  step="0.01"
                  value={formData.factIncome !== undefined && formData.factIncome !== null ? formData.factIncome : ''}
                  onChange={(e) => setFormData({ ...formData, factIncome: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="apple-input w-full font-mono text-sm"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Комментарий</label>
                <textarea 
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  className="apple-input w-full min-h-[80px] max-h-[160px] resize-none overflow-y-auto custom-scrollbar"
                  placeholder="Дополнительные детали..."
                />
              </div>
            </div>
          </form>

          <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/50 flex gap-3 sm:gap-4 border-t border-slate-200 dark:border-slate-800">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 apple-button bg-white dark:bg-slate-950 text-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/10 text-sm sm:text-base"
            >
              Отмена
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!formData.bank || !formData.amount || !formData.rate || !formData.startDate}
              className="flex-[2] apple-button bg-deposit-500 hover:bg-deposit-600 dark:bg-deposit-600 dark:hover:bg-deposit-500 text-white shadow-lg shadow-deposit-500/20 flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5px]" />
              Сохранить
            </button>
          </div>
        </motion.div>
        </Dialog.Panel>
      </div>

      {/* Delete Bank Confirmation Modal */}
      <AnimatePresence>
        {bankToDelete && (
          <Dialog as="div" className="relative z-[150]" open={true} onClose={() => setBankToDelete(null)} static>
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
                  className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col pointer-events-auto p-6 sm:p-8"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 self-center">
                    <Trash2 className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2 tracking-tight text-center">Удалить банк?</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-center">
                    Вы уверены, что хотите удалить этот банк? Это действие нельзя отменить.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setBankToDelete(null)}
                      className="flex-1 apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-white hover:bg-[#E5E5E7] dark:hover:bg-white/10 cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteBank}
                      className="flex-1 apple-button bg-rose-500 text-white shadow-lg shadow-rose-500/20 cursor-pointer"
                    >
                      Удалить
                    </button>
                  </div>
                </motion.div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

function ToggleChip({ label, checked, onChange, icon }: { label: string; checked: boolean; onChange: (val: boolean) => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-200 select-none cursor-pointer text-[9px] font-bold uppercase tracking-wider min-w-0",
        checked 
          ? "border-deposit-500/30 bg-deposit-500/10 text-deposit-600 dark:text-deposit-400 active:scale-95" 
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:border-deposit-500/30 hover:text-deposit-500 active:scale-95"
      )}
    >
      {icon && (
        <div className={cn("w-3 h-3 flex items-center justify-center transition-transform shrink-0", checked ? "scale-110 text-deposit-500" : "")}>
          {icon}
        </div>
      )}
      <span className="truncate leading-none mt-[1px]">{label}</span>
      {checked && <Check className="w-3 h-3 stroke-[3px] animate-in zoom-in duration-200 shrink-0 text-deposit-500" />}
    </button>
  );
}
