import React, { useState, useRef } from 'react';
import { TaxYearSettings, AppSettings, TaxBracket } from '../types';
import { db } from '../db';
import { Plus, Trash2, Download, Upload, ShieldCheck, Archive as ArchiveIcon, AlertTriangle, CheckCircle2, Settings as SettingsIcon, ChevronDown, TrendingUp, ReceiptRussianRuble } from 'lucide-react';
import { cn } from '../lib/utils';
import { Archive, ArchiveHeaderActions } from './Archive';
import { motion, AnimatePresence } from 'motion/react';
import { useAppState } from '../hooks/useAppState';
import { DEFAULT_TAX_BRACKETS } from '../lib/constants';
import { TableInput } from './TableInput';

interface SettingsProps {
  taxSettings: TaxYearSettings[];
  appSettings: AppSettings;
}

export function Settings({ taxSettings, appSettings }: SettingsProps) {
  const { state, setState, addToast } = useAppState();
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [yearToDelete, setYearToDelete] = useState<number | null>(null);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [expandedBracketIndex, setExpandedBracketIndex] = useState<number | null>(null);
  
  // Tax Brackets State
  const [selectedBracketYear, setSelectedBracketYear] = useState<number>(2025);
  const currentBrackets = state.taxBrackets[selectedBracketYear] || state.taxBrackets[2025] || DEFAULT_TAX_BRACKETS[2025];

  const addYear = async () => {
    const maxYear = taxSettings.length > 0 ? Math.max(...taxSettings.map(s => s.year)) : new Date().getFullYear();
    const nextYear = Math.max(newYear, maxYear + 1);
    
    if (taxSettings.find(s => s.year === nextYear)) {
      addToast('Этот период уже добавлен', 'info');
      return;
    }
    
    await db.taxYearSettings.add({
      year: nextYear,
      limit: 210000,
      ndflRate: 13
    });
    setNewYear(nextYear + 1);
    addToast(`Период ${nextYear} добавлен`);
  };

  const restore2024 = async () => {
    if (taxSettings.find(s => s.year === 2024)) return;
    await db.taxYearSettings.add({
      year: 2024,
      limit: 210000,
      ndflRate: 13
    });
    addToast('Период 2024 восстановлен');
  };

  const updateYearSetting = async (year: number, field: keyof TaxYearSettings, value: number) => {
    await db.taxYearSettings.update(year, { [field]: value });
  };

  const confirmDeleteYear = async () => {
    if (yearToDelete !== null) {
      await db.taxYearSettings.delete(yearToDelete);
      setYearToDelete(null);
      addToast('Период удален');
    }
  };

  const exportData = async () => {
    const deposits = await db.deposits.toArray();
    const settings = await db.taxYearSettings.toArray();
    const data = { 
      deposits, 
      settings, 
      incomeTracker: state,
      exportDate: new Date().toISOString() 
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Данные экспортированы');
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.deposits) {
          await db.deposits.clear();
          await db.deposits.bulkAdd(data.deposits);
        }
        if (data.settings) {
          await db.taxYearSettings.clear();
          await db.taxYearSettings.bulkAdd(data.settings);
        }
        if (data.incomeTracker && data.incomeTracker.years && data.incomeTracker.activeYear) {
          setState(data.incomeTracker);
        }
        addToast('Данные успешно импортированы');
      } catch {
        addToast('Ошибка при импорте данных', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBracketChange = (index: number, field: 'limit' | 'rate' | 'label', value: any) => {
    const newBrackets = [...currentBrackets];
    newBrackets[index] = { ...newBrackets[index], [field]: value };
    setState(prev => ({
      ...prev,
      taxBrackets: { ...prev.taxBrackets, [selectedBracketYear]: newBrackets }
    }));
  };

  const addBracket = () => {
    const newBrackets = [...currentBrackets, { limit: Infinity, rate: 0.13, label: 'Новая ступень' }];
    if (newBrackets.length > 1 && newBrackets[newBrackets.length - 2].limit === Infinity) {
      newBrackets[newBrackets.length - 2].limit = 5000000;
    }
    setState(prev => ({
      ...prev,
      taxBrackets: { ...prev.taxBrackets, [selectedBracketYear]: newBrackets }
    }));
  };

  const removeBracket = (index: number) => {
    if (currentBrackets.length <= 1) return;
    const newBrackets = currentBrackets.filter((_, i) => i !== index);
    if (index === currentBrackets.length - 1) {
      newBrackets[newBrackets.length - 1].limit = Infinity;
    }
    setState(prev => ({
      ...prev,
      taxBrackets: { ...prev.taxBrackets, [selectedBracketYear]: newBrackets }
    }));
  };

  const availableBracketYears = Array.from(new Set([...Object.keys(state.taxBrackets).map(Number), 2024, 2025, 2026, 2027])).sort((a, b) => a - b);

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-700 relative w-full max-w-7xl mx-auto pb-12">
      {/* Backup Section */}
      <section className="apple-card p-4 sm:p-5 xl:p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-blue-600 stroke-[1.5px]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm md:text-base font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary truncate">Резервная копия</h3>
            <p className="hidden sm:block text-[11px] lg:text-xs text-light-text-secondary dark:text-dark-text-secondary font-medium mt-0.5 truncate">Управление данными, экспорт и импорт</p>
            <p className="sm:hidden text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-medium mt-0.5 truncate">Экспорт и импорт</p>
          </div>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={exportData}
            className="apple-button w-10 h-10 md:w-auto md:h-auto flex items-center justify-center gap-2 p-0 md:px-4 md:py-2.5 bg-[#F5F5F7] dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all text-blue-600 font-semibold text-xs rounded-xl"
            title="Экспорт"
          >
            <Download className="w-4 h-4 md:w-4 md:h-4 stroke-[2px]" />
            <span className="hidden md:inline">Экспорт</span>
          </button>
          <label 
            className="apple-button w-10 h-10 md:w-auto md:h-auto flex items-center justify-center gap-2 p-0 md:px-4 md:py-2.5 bg-[#F5F5F7] dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all text-emerald-600 font-semibold text-xs rounded-xl cursor-pointer"
            title="Импорт"
          >
            <Upload className="w-4 h-4 md:w-4 md:h-4 stroke-[2px]" />
            <span className="hidden md:inline">Импорт</span>
            <input type="file" className="sr-only" accept=".json" onChange={importData} />
          </label>
        </div>
      </section>

      {/* Income Tax Brackets Section */}
      <section className="apple-card p-5 lg:p-6 space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
            <SettingsIcon className="w-6 h-6 text-indigo-600 stroke-[1.5px]" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary">Прогрессивная шкала НДФЛ</h3>
            <p className="text-[11px] lg:text-xs text-light-text-secondary dark:text-dark-text-secondary font-medium mt-0.5">Настройки ступеней налога на доходы</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {availableBracketYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedBracketYear(year)}
                className={cn(
                  "apple-button px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedBracketYear === year 
                    ? "bg-indigo-600 text-white" 
                    : "bg-[#F5F5F7] dark:bg-white/5 text-light-text-primary dark:text-dark-text-primary hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {currentBrackets.map((bracket, index) => {
            const isExpanded = expandedBracketIndex === index;
            return (
              <div 
                key={index} 
                className={cn(
                  "apple-card overflow-hidden transition-all border",
                  isExpanded ? "border-indigo-500/30 shadow-md" : "border-slate-200 dark:border-slate-800 hover:border-indigo-500/20"
                )}
              >
                {/* Accordion Header */}
                <div 
                  className="p-3 sm:p-4 flex items-center justify-between cursor-pointer bg-[#F5F5F7]/50 dark:bg-white/5 hover:bg-[#F5F5F7] dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setExpandedBracketIndex(isExpanded ? null : index)}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
                      <ChevronDown size={18} className="text-light-text-secondary shrink-0" />
                    </motion.div>
                    <span className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary truncate">{bracket.label || `Ступень ${index + 1}`}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {!isExpanded && (
                      <div className="text-right flex items-center gap-3">
                        {bracket.limit !== Infinity && (
                          <span className="hidden sm:inline-block text-[11px] font-mono text-slate-500 whitespace-nowrap">{bracket.limit?.toLocaleString('ru-RU')} ₽</span>
                        )}
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono whitespace-nowrap">
                          {bracket.rate != null ? Math.round(bracket.rate * 100) : 0}%
                        </span>
                      </div>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeBracket(index); }}
                      disabled={currentBrackets.length <= 1}
                      className="p-1.5 text-light-text-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <Trash2 className="w-4 h-4 stroke-[2px]" />
                    </button>
                  </div>
                </div>

                {/* Accordion Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-transparent"
                    >
                      <div className="p-3 lg:p-4 grid gap-4 border-t border-light-border/50 dark:border-dark-border/50">
                        <div className="flex flex-col xl:flex-row gap-4">
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Название</label>
                            <input 
                              type="text" 
                              value={bracket.label ?? ''} 
                              onChange={(e) => handleBracketChange(index, 'label', e.target.value)}
                              className="apple-input w-full px-3 py-2 text-sm font-medium"
                            />
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Лимит (₽)</label>
                            {bracket.limit === Infinity ? (
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 text-center border border-transparent">
                                Максимум
                              </div>
                            ) : (
                              <input 
                                type="number"
                                value={bracket.limit ?? 0} 
                                onChange={(e) => handleBracketChange(index, 'limit', Number(e.target.value))}
                                className="apple-input w-full px-3 py-2 text-sm font-mono font-semibold text-left"
                              />
                            )}
                          </div>

                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ставка (%)</label>
                            <div className="relative">
                              <input 
                                type="number" 
                                value={bracket.rate != null ? Math.round(bracket.rate * 100) : ''} 
                                onChange={(e) => handleBracketChange(index, 'rate', (parseFloat(e.target.value) || 0) / 100)}
                                className="apple-input w-full px-3 py-2 text-sm font-mono font-semibold pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          
          <button 
            onClick={addBracket}
            className="w-full mt-2 apple-button border-2 border-dashed border-indigo-200 dark:border-indigo-500/20 bg-transparent hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2 py-3 transition-colors"
          >
            <Plus size={16} className="stroke-[2px]" /> 
            <span className="text-xs font-bold uppercase tracking-wider">Добавить ступень</span>
          </button>
        </div>
      </section>

      {/* Deposits Tax Periods Section */}
      <section className="apple-card p-5 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <ReceiptRussianRuble className="w-6 h-6 text-emerald-600 stroke-[1.5px]" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary truncate">Налог на вклады</h3>
              <p className="text-[11px] lg:text-xs text-light-text-secondary dark:text-dark-text-secondary font-medium mt-0.5">Лимиты и ставки по годам</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!taxSettings.find(s => s.year === 2024) && (
              <button 
                onClick={restore2024}
                className="px-3 md:px-4 py-2 bg-[#F5F5F7] dark:bg-white/5 text-emerald-600 dark:text-emerald-400 text-[11px] lg:text-xs font-bold rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all cursor-pointer"
              >
                Восстановить 2024
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4">
          {taxSettings.sort((a, b) => b.year - a.year).map(setting => {
            const isExpanded = expandedYear === setting.year;
            return (
              <div 
                key={setting.year} 
                className="apple-card overflow-hidden border border-light-border dark:border-dark-border transition-all hover:border-emerald-500/20 shadow-sm group"
              >
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer bg-[#F5F5F7] dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setExpandedYear(isExpanded ? null : setting.year)}
                >
                  <div className="flex items-center gap-3">
                    <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
                      <ChevronDown size={20} className="text-light-text-secondary" />
                    </motion.div>
                    <span className="text-lg font-black text-light-text-primary dark:text-dark-text-primary font-mono">{setting.year}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {!isExpanded && (
                      <div className="text-right">
                        <span className="block text-[10px] uppercase text-light-text-secondary font-bold tracking-wider">Лимит</span>
                        <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">{setting.limit.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setYearToDelete(setting.year); }}
                      className="p-1.5 text-light-text-secondary hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4 stroke-[2px]" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-transparent"
                    >
                      <div className="p-4 grid grid-cols-1 gap-4 border-t border-light-border/50 dark:border-dark-border/50">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                          <label className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest shrink-0">Лимит</label>
                          <div className="relative w-full xl:w-[140px]">
                            <input 
                              type="number" 
                              value={setting.limit}
                              onChange={(e) => updateYearSetting(setting.year, 'limit', Number(e.target.value))}
                              className="apple-input w-full px-3 py-2 text-sm font-mono text-left xl:text-right pr-6 bg-[#F5F5F7] dark:bg-slate-800"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-light-text-secondary font-bold">₽</span>
                          </div>
                        </div>
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                          <label className="text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest shrink-0">Ставка (%)</label>
                          <div className="relative w-full xl:w-[140px]">
                            <input 
                              type="number" 
                              value={setting.ndflRate}
                              onChange={(e) => updateYearSetting(setting.year, 'ndflRate', Number(e.target.value))}
                              className="apple-input w-full px-3 py-2 text-sm font-mono text-left xl:text-right pr-6 bg-[#F5F5F7] dark:bg-slate-800"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-light-text-secondary font-bold">%</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          
          <button 
            onClick={addYear}
            className="w-full mt-2 apple-button border-2 border-dashed border-emerald-200 dark:border-emerald-500/20 bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2 py-3 transition-colors"
          >
            <Plus size={16} className="stroke-[2px]" /> 
            <span className="text-xs font-bold uppercase tracking-wider">Добавить период</span>
          </button>
        </div>
      </section>

      {/* Archive Section */}
      <section className="apple-card p-5 lg:p-6">
        <div className="flex items-center gap-4 mb-6 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <ArchiveIcon className="w-6 h-6 text-orange-600 stroke-[1.5px]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary truncate">Архив вкладов</h3>
              <p className="text-[11px] lg:text-xs text-light-text-secondary dark:text-dark-text-secondary font-medium mt-0.5 truncate pr-2">Все закрытые и завершенные вклады</p>
            </div>
          </div>
          <div className="shrink-0">
             <ArchiveHeaderActions />
          </div>
        </div>
        <Archive />
      </section>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {yearToDelete !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="apple-card p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary mb-2">Удалить период?</h3>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-6">
                Вы уверены, что хотите удалить настройки для {yearToDelete} года? Это действие нельзя отменить.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setYearToDelete(null)}
                  className="flex-1 apple-button bg-[#F5F5F7] dark:bg-white/5 text-light-text-primary dark:text-dark-text-primary hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Отмена
                </button>
                <button 
                  onClick={confirmDeleteYear}
                  className="flex-1 apple-button bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
