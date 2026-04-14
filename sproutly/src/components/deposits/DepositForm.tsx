import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { X, Save, Calendar, Landmark, Percent, Wallet, Info, Clock, ChevronDown, Check, Plus, Trash2 } from 'lucide-react';
import { Listbox, Transition, Combobox } from '@headlessui/react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ru } from 'date-fns/locale';
import "react-datepicker/dist/react-datepicker.css";
import { motion, AnimatePresence } from 'motion/react';
import { Deposit, CalculationFormula, Bank } from '../../types';

import { BankIconEditor } from './BankIconEditor';
import { db } from '../../db';
import { cn } from '../../lib/utils';
import { addDays, differenceInDays } from 'date-fns';
import { auth } from '../../firebase';
import { getAllBanks, DEFAULT_BANK_ICON } from '../../lib/banks';

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
  const [duration, setDuration] = useState<number | ''>('');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [query, setQuery] = useState('');
  const [showBankEditor, setShowBankEditor] = useState(false);
  const [newBank, setNewBank] = useState<Partial<Bank>>({
    name: '',
    color: '#6366f1',
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
    formula: 'simple_months',
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

  const handleSaveNewBank = async () => {
    if (!newBank.name) return;
    const user = auth.currentUser;
    const bankToSave = {
      ...newBank,
      id: 'custom_' + Date.now(),
      userId: user?.uid,
      logoText: newBank.name.charAt(0).toUpperCase(),
      updatedAt: Date.now()
    } as Bank;

    await db.banks.add(bankToSave);
    setBanks(prev => [...prev, bankToSave]);
    setFormData(prev => ({ ...prev, bank: bankToSave.name }));
    setShowBankEditor(false);
  };

  const [bankToDelete, setBankToDelete] = useState<string | null>(null);

  const confirmDeleteBank = async () => {
    if (!bankToDelete) return;
    await db.banks.delete(bankToDelete);
    setBanks(prev => prev.filter(b => b.id !== bankToDelete));
    const deletedBank = banks.find(b => b.id === bankToDelete);
    if (formData.bank === deletedBank?.name) {
      setFormData(prev => ({ ...prev, bank: '' }));
    }
    setBankToDelete(null);
  };

  const handleDeleteBank = (e: React.MouseEvent, bankId: string) => {
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
      await db.deposits.update(deposit.id, dataToSave);
    } else {
      await db.deposits.add(dataToSave);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white/95 dark:bg-dark-card/95 backdrop-blur-2xl w-full max-w-xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-light-border dark:border-dark-border/50 flex flex-col max-h-[90vh]"
        >
          <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-light-border dark:border-dark-border flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary">{deposit ? 'Редактировать вклад' : 'Новый вклад'}</h3>
              <p className="text-light-text-secondary dark:text-dark-text-secondary text-[10px] sm:text-xs font-medium mt-1">Заполните данные для точного расчета налога</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#F5F5F7] dark:hover:bg-white/5 rounded-full transition-all active:scale-90 cursor-pointer">
              <X className="w-5 h-5 text-light-text-secondary" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto custom-scrollbar flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Landmark className="w-3.5 h-3.5 text-blue-500 stroke-[1.5px]" /> Банк
                </label>
                
                <Combobox value={formData.bank} onChange={(val) => {
                  if (val === '__ADD_NEW__') {
                    setNewBank({ ...newBank, name: query });
                    setShowBankEditor(true);
                  } else {
                    setFormData({ ...formData, bank: val });
                  }
                }}>
                  <div className="relative">
                    <div className="relative w-full cursor-default overflow-hidden rounded-2xl bg-[#F5F5F7] dark:bg-white/5 text-left border border-transparent focus-within:border-blue-500/30 transition-all">
                      <Combobox.Input
                        className="w-full border-none py-3 pl-4 pr-10 text-sm font-medium bg-transparent outline-none text-light-text-primary dark:text-dark-text-primary"
                        displayValue={(val: any) => (typeof val === 'string' ? val : '')}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Выберите банк"
                      />
                      <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <ChevronDown className="h-4 w-4 text-light-text-secondary" aria-hidden="true" />
                      </Combobox.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                      afterLeave={() => setQuery('')}
                    >
                      <Combobox.Options className="absolute mt-2 max-h-60 w-full overflow-auto rounded-2xl bg-white dark:bg-dark-card py-2 text-sm shadow-2xl z-[110] border border-light-border dark:border-dark-border focus:outline-none">
                        {filteredBanks.length === 0 && query !== '' ? (
                          <div className="relative cursor-default select-none py-2 px-4 text-light-text-secondary">
                            Ничего не найдено.
                          </div>
                        ) : (
                          filteredBanks.map((bank) => (
                            <Combobox.Option
                              key={bank.id}
                              className={({ active }) =>
                                cn(
                                  'relative cursor-pointer select-none py-3 pl-10 pr-4 font-medium transition-colors',
                                  active ? 'bg-[#F5F5F7] dark:bg-white/5 text-blue-600' : 'text-light-text-primary dark:text-dark-text-primary'
                                )
                              }
                              value={bank.name}
                            >
                              {({ selected }) => (
                                <>
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                      <div className="w-6 h-6 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border flex items-center justify-center overflow-hidden transition-all">
                                        <img 
                                          src={bank.logoUrl} 
                                          alt="" 
                                          className="w-4 h-4 object-contain"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                      <span className={cn('block truncate', selected ? 'font-bold' : 'font-medium')}>
                                        {bank.name}
                                      </span>
                                    </div>
                                    {bank.isCustom && (
                                      <button 
                                        type="button"
                                        onClick={(e) => handleDeleteBank(e, String(bank.id))}
                                        className="absolute inset-y-0 right-2 my-auto h-7 w-7 flex items-center justify-center text-light-text-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer z-10"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                    {selected && !bank.isCustom && (
                                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                        <Check className="h-4 w-4 stroke-[2px]" />
                                      </span>
                                    )}
                                    {selected && bank.isCustom && (
                                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                        <Check className="h-4 w-4 stroke-[2px]" />
                                      </span>
                                    )}
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
                              'w-full flex items-center gap-2 px-4 py-3 text-blue-600 font-bold transition-colors border-t border-light-border dark:border-dark-border mt-2 cursor-pointer',
                              active ? 'bg-[#F5F5F7] dark:bg-white/5' : ''
                            )
                          }
                        >
                          <Plus size={18} className="stroke-[2px]" />
                          Добавить новый банк
                        </Combobox.Option>
                      </Combobox.Options>
                    </Transition>
                  </div>
                </Combobox>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-emerald-500 stroke-[1.5px]" /> Сумма (₽)
                </label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  value={formData.amount === 0 ? '' : formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="apple-input w-full font-mono text-sm"
                  placeholder="0.00"
                />
              </div>

              {showBankEditor && (
                <div className="md:col-span-2 mt-2 p-6 bg-[#F5F5F7] dark:bg-white/5 rounded-3xl border border-light-border dark:border-dark-border animate-in slide-in-from-top-2 duration-300 shadow-inner">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xs font-bold text-light-text-secondary uppercase tracking-widest flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Настройка банка
                    </h4>
                    <button type="button" onClick={() => setShowBankEditor(false)} className="text-light-text-secondary hover:text-rose-500 transition-colors cursor-pointer p-2 hover:bg-rose-500/10 rounded-full">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex flex-col xl:flex-row gap-6">
                    <div className="space-y-4 flex flex-col w-full xl:w-1/3">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest">Название банка</label>
                        <input 
                          type="text"
                          value={newBank.name}
                          onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
                          placeholder="Напр. Тинькофф, Сбербанк..."
                          className="apple-input w-full"
                        />
                      </div>
                      <div className="flex-1" />
                      <button
                        type="button"
                        onClick={handleSaveNewBank}
                        disabled={!newBank.name}
                        className="apple-button w-full bg-blue-600 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Сохранить банк
                      </button>
                    </div>
                    <div className="w-full xl:w-2/3">
                      <BankIconEditor 
                        bank={newBank} 
                        onChange={(updates) => setNewBank(prev => ({ ...prev, ...updates }))} 
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-500 stroke-[1.5px]" /> Дата открытия
                </label>
                <div className="relative w-full group">
                  <DatePicker
                    selected={formData.startDate}
                    onChange={(date) => date && handleStartDateChange(date)}
                    locale="ru"
                    dateFormat="dd.MM.yyyy"
                    className="apple-input w-full pr-12 cursor-pointer"
                    placeholderText="Выберите дату"
                    wrapperClassName="w-full"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text-secondary pointer-events-none group-focus-within:text-blue-500 transition-colors stroke-[1.5px]" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-violet-500 stroke-[1.5px]" /> Срок (дней)
                </label>
                <input 
                  type="number" 
                  disabled={formData.formula === 'daily_balance' || formData.formula === 'min_balance'}
                  placeholder="Напр. 91, 181..."
                  value={duration}
                  onChange={(e) => handleDurationChange(e.target.value ? Number(e.target.value) : '')}
                  className="apple-input w-full disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-500 stroke-[1.5px]" /> Дата закрытия
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
                    locale="ru"
                    dateFormat="dd.MM.yyyy"
                    disabled={formData.formula === 'daily_balance' || formData.formula === 'min_balance'}
                    className="apple-input w-full pr-12 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    placeholderText="Бессрочно"
                    isClearable
                    wrapperClassName="w-full"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text-secondary pointer-events-none group-focus-within:text-blue-500 transition-colors stroke-[1.5px]" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Percent className="w-3.5 h-3.5 text-amber-500 stroke-[1.5px]" /> Ставка (%)
                </label>
                <input 
                  required
                  type="number" 
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
                <label className="text-[11px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest">Формула расчета</label>
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
                    <Listbox.Button className="relative w-full cursor-pointer rounded-2xl bg-[#F5F5F7] dark:bg-white/5 py-3 pl-4 pr-10 text-left border border-transparent focus:border-blue-500/30 transition-all font-medium text-sm text-light-text-primary dark:text-dark-text-primary">
                      <span className="block truncate">
                        {formulas.find(f => f.id === formData.formula)?.name}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <ChevronDown className="h-4 w-4 text-light-text-secondary" aria-hidden="true" />
                      </span>
                    </Listbox.Button>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Listbox.Options className="absolute mt-2 max-h-60 w-full overflow-auto rounded-2xl bg-white dark:bg-dark-card py-2 text-sm shadow-2xl z-[110] border border-light-border dark:border-dark-border focus:outline-none">
                        {formulas.map((formula) => (
                          <Listbox.Option
                            key={formula.id}
                            className={({ active }) =>
                              cn(
                                'relative cursor-pointer select-none py-3 pl-10 pr-3 font-medium transition-colors',
                                active ? 'bg-[#F5F5F7] dark:bg-white/5 text-blue-600' : 'text-light-text-primary dark:text-dark-text-primary'
                              )
                            }
                            value={formula.id}
                          >
                            {({ selected }) => (
                              <>
                                <span className={cn('block truncate', selected ? 'font-bold' : 'font-medium')}>
                                  {formula.name}
                                </span>
                                {selected ? (
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                    <Check className="h-4 w-4 stroke-[2px]" />
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
                <label className="text-[11px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-500 stroke-[1.5px]" /> Примечание
                </label>
                <input 
                  type="text" 
                  value={formData.sourceNote}
                  onChange={(e) => setFormData({ ...formData, sourceNote: e.target.value })}
                  className="apple-input w-full"
                  placeholder="Напр. На отпуск, Резерв..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest">Комментарий</label>
              <textarea 
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="apple-input w-full h-24 min-h-[96px] max-h-[96px] py-3 resize-none overflow-y-auto custom-scrollbar"
                placeholder="Дополнительные детали..."
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <ToggleChip 
                label="Накопительный" 
                icon={<Wallet className="w-3.5 h-3.5 stroke-[1.5px]" />}
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
                label="Закрыт" 
                icon={<X className="w-3.5 h-3.5 stroke-[1.5px]" />}
                checked={!!formData.isClosed} 
                onChange={(val) => setFormData({ ...formData, isClosed: val })} 
              />
              <ToggleChip 
                label="Разбивать доход" 
                icon={<Calendar className="w-3.5 h-3.5 stroke-[1.5px]" />}
                checked={!!formData.splitIncome} 
                onChange={(val) => setFormData({ ...formData, splitIncome: val })} 
              />
            </div>
          </form>

          <div className="p-6 sm:p-8 bg-[#F5F5F7] dark:bg-white/5 flex gap-3 sm:gap-4 border-t border-light-border dark:border-dark-border">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 apple-button bg-white dark:bg-dark-card text-light-text-primary dark:text-dark-text-primary border border-light-border dark:border-dark-border hover:bg-[#F5F5F7] dark:hover:bg-white/10 text-sm sm:text-base"
            >
              Отмена
            </button>
            <button 
              onClick={handleSubmit}
              className="flex-[2] apple-button bg-blue-600 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5px]" />
              Сохранить
            </button>
          </div>
        </motion.div>
      </div>

      {/* Delete Bank Confirmation Modal */}
      {bankToDelete && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-dark-card rounded-t-[32px] sm:rounded-[32px] shadow-2xl max-w-sm w-full p-6 sm:p-8 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 border border-light-border dark:border-dark-border">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6">
              <Trash2 className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
            </div>
            <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2 tracking-tight">Удалить банк?</h3>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-8 leading-relaxed">
              Вы уверены, что хотите удалить этот банк? Это действие нельзя отменить.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setBankToDelete(null)}
                className="flex-1 apple-button bg-[#F5F5F7] dark:bg-white/5 text-light-text-primary dark:text-dark-text-primary hover:bg-[#E5E5E7] dark:hover:bg-white/10"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmDeleteBank}
                className="flex-1 apple-button bg-rose-500 text-white shadow-lg shadow-rose-500/20"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ToggleChip({ label, checked, onChange, icon }: { label: string; checked: boolean; onChange: (val: boolean) => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-300 select-none cursor-pointer text-[11px] font-black uppercase tracking-wider",
        checked 
          ? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95" 
          : "border-light-border dark:border-dark-border bg-white dark:bg-white/5 text-light-text-secondary dark:text-dark-text-secondary hover:border-blue-500/50 hover:text-blue-500 active:scale-95"
      )}
    >
      {icon && (
        <div className={cn("w-3.5 h-3.5 flex items-center justify-center transition-transform", checked ? "scale-110" : "")}>
          {icon}
        </div>
      )}
      <span>{label}</span>
      {checked && <Check className="w-3.5 h-3.5 stroke-[3px] animate-in zoom-in duration-300" />}
    </button>
  );
}
