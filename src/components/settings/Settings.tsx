import React, { useState, useRef } from 'react';
import { TaxYearSettings, AppSettings, TaxBracket } from '../../types';
import { db } from '../../config/db';
import { Plus, Trash2, Download, Upload, CloudSync, Archive as ArchiveIcon, AlertTriangle, CheckCircle2, Settings2 as Settings2Icon, ChevronDown, TrendingUp, ReceiptRussianRuble } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Archive, ArchiveHeaderActions } from './Archive';
import { motion, AnimatePresence } from 'motion/react';
import { useAppState } from '../../hooks/useAppState';
import { DEFAULT_TAX_BRACKETS } from '../../lib/constants';
import { TableInput } from '../ui/TableInput';
import { getPlural } from '../../lib/helpers';

interface SettingsProps {
  taxSettings: TaxYearSettings[];
  appSettings: AppSettings;
}

export function Settings({ taxSettings, appSettings }: SettingsProps) {
  const { state, setState, addToast } = useAppState();
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [yearToDelete, setYearToDelete] = useState<number | null>(null);
  const [bracketYearToDelete, setBracketYearToDelete] = useState<number | null>(null);
  const [bracketToDelete, setBracketToDelete] = useState<{ year: number, index: number } | null>(null);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [expandedBracketYear, setExpandedBracketYear] = useState<number | null>(null);
  const [expandedBracketIndex, setExpandedBracketIndex] = useState<number | null>(null);
  
  // Tax Brackets State
  // Current brackets is now used inside the loop for specific years

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

  const confirmDeleteBracketYear = () => {
    if (bracketYearToDelete !== null) {
      removeBracketYear(bracketYearToDelete);
      setBracketYearToDelete(null);
    }
  };

  const confirmDeleteBracket = () => {
    if (bracketToDelete !== null) {
      removeBracket(bracketToDelete.year, bracketToDelete.index);
      setBracketToDelete(null);
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

  const handleBracketChange = (year: number, index: number, field: 'limit' | 'rate' | 'label', value: any) => {
    const yearBrackets = state.taxBrackets[year] || DEFAULT_TAX_BRACKETS[2025];
    const newBrackets = [...yearBrackets];
    newBrackets[index] = { ...newBrackets[index], [field]: value };
    setState(prev => ({
      ...prev,
      taxBrackets: { ...prev.taxBrackets, [year]: newBrackets }
    }));
  };

  const addBracket = (year: number) => {
    const yearBrackets = state.taxBrackets[year] || DEFAULT_TAX_BRACKETS[2025];
    const newBrackets = [...yearBrackets, { limit: Infinity, rate: 0.13, label: 'Новая ступень' }];
    if (newBrackets.length > 1 && newBrackets[newBrackets.length - 2].limit === Infinity) {
      newBrackets[newBrackets.length - 2].limit = 5000000;
    }
    setState(prev => ({
      ...prev,
      taxBrackets: { ...prev.taxBrackets, [year]: newBrackets }
    }));
  };

  const removeBracket = (year: number, index: number) => {
    const yearBrackets = state.taxBrackets[year] || DEFAULT_TAX_BRACKETS[2025];
    if (yearBrackets.length <= 1) return;
    const newBrackets = yearBrackets.filter((_, i) => i !== index);
    if (index === yearBrackets.length - 1) {
      newBrackets[newBrackets.length - 1].limit = Infinity;
    }
    setState(prev => ({
      ...prev,
      taxBrackets: { ...prev.taxBrackets, [year]: newBrackets }
    }));
  };

  const availableBracketYears = Array.from(new Set([
    ...Object.keys(state.taxBrackets).map(Number),
    ...Object.keys(state.years).map(Number)
  ])).sort((a, b) => a - b);

  const addBracketYear = () => {
    const maxYear = Math.max(...availableBracketYears);
    const nextYear = maxYear + 1;
    setState(prev => ({
      ...prev,
      taxBrackets: {
        ...prev.taxBrackets,
        [nextYear]: JSON.parse(JSON.stringify(prev.taxBrackets[maxYear] || DEFAULT_TAX_BRACKETS[2025]))
      }
    }));
    setExpandedBracketYear(nextYear);
    addToast(`Период ${nextYear} добавлен в шкалу НДФЛ`);
  };

  const removeBracketYear = (year: number) => {
    if (availableBracketYears.length <= 1) {
      addToast('Должен остаться хотя бы один период', 'info');
      return;
    }
    setState(prev => {
      const newBrackets = { ...prev.taxBrackets };
      delete newBrackets[year];
      return { ...prev, taxBrackets: newBrackets };
    });
    addToast(`Период ${year} удален из шкалы НДФЛ`);
    if (expandedBracketYear === year) {
       setExpandedBracketYear(null);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-700 relative w-full max-w-6xl mx-auto pb-12">
      {/* Backup Section */}
      <section className="apple-card p-4 sm:p-5 xl:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <CloudSync className="w-5 h-5 md:w-6 md:h-6 text-blue-500 stroke-[1.5px]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">Резервная копия</h3>
            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Экспорт и импорт данных</p>
          </div>
        </div>
        
        <div className="flex gap-2 shrink-0 md:w-auto w-full">
          <button 
            onClick={exportData}
            className="apple-button flex-1 md:flex-none flex items-center justify-center p-2 lg:p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-all rounded-xl"
            title="Экспорт"
          >
            <Download className="w-4 h-4 md:w-5 md:h-5 stroke-[2px]" />
          </button>
          <label 
            className="apple-button flex-1 md:flex-none flex items-center justify-center p-2 lg:p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all rounded-xl cursor-pointer"
            title="Импорт"
          >
            <Upload className="w-4 h-4 md:w-5 md:h-5 stroke-[2px]" />
            <input type="file" className="sr-only" accept=".json" onChange={importData} />
          </label>
        </div>
      </section>
      {/* Tax Brackets and Deposits Tax Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* Шкала НДФЛ Section */}
        <section className="apple-card p-5 lg:p-6 space-y-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4 h-12">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Settings2Icon className="w-6 h-6 text-indigo-600 stroke-[1.5px]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">Шкала НДФЛ</h3>
                <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Настройки ступеней</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 flex-1 overflow-auto max-h-[600px] pr-1 scrollbar-hide">
            {availableBracketYears.sort((a, b) => b - a).map(year => {
              const isYearExpanded = expandedBracketYear === year;
              const yearBrackets = state.taxBrackets[year] || DEFAULT_TAX_BRACKETS[2025];
              
              return (
                <div 
                  key={year} 
                  className={cn(
                    "apple-card overflow-hidden border transition-all group",
                    isYearExpanded ? "border-indigo-500/30 shadow-md" : "border-slate-200 dark:border-slate-800 hover:border-indigo-500/20 shadow-sm"
                  )}
                >
                  {/* Year Accordion Header */}
                  <div 
                    className="h-16 px-4 flex items-center justify-between cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setExpandedBracketYear(isYearExpanded ? null : year)}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div animate={{ rotate: isYearExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
                        <ChevronDown size={20} className="text-slate-500" />
                      </motion.div>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono">{year} год</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {!isYearExpanded && (
                        <div className="text-right">
                          <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider">Структура</span>
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono whitespace-nowrap">
                            {yearBrackets.length} {getPlural(yearBrackets.length, 'ступень', 'ступени', 'ступеней')}
                          </span>
                        </div>
                      )}
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); setBracketYearToDelete(year); }}
                        className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2px]" />
                      </button>
                    </div>
                  </div>

                  {/* Brackets Content */}
                  <AnimatePresence>
                    {isYearExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-transparent space-y-3 border-t border-slate-200/30 dark:border-slate-800/30">
                          {yearBrackets.map((bracket, index) => {
                            const isBracketExpanded = expandedBracketIndex === index;
                            return (
                              <div 
                                key={index} 
                                className={cn(
                                  "apple-card overflow-hidden border transition-all",
                                  isBracketExpanded ? "border-indigo-500/30 bg-white dark:bg-slate-900/50" : "border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/30"
                                )}
                              >
                                <div 
                                  className="p-3 flex items-center justify-between cursor-pointer"
                                  onClick={() => setExpandedBracketIndex(isBracketExpanded ? null : index)}
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <motion.div animate={{ rotate: isBracketExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
                                      <ChevronDown size={16} className="text-slate-500 opacity-50 shrink-0" />
                                    </motion.div>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{bracket.label || `Ступень ${index + 1}`}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {!isBracketExpanded && (
                                      <span className="text-xs font-bold text-indigo-600 font-mono">
                                        {Math.round(bracket.rate * 100)}%
                                      </span>
                                    )}
                                    
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setBracketToDelete({ year, index }); }}
                                      disabled={yearBrackets.length <= 1}
                                      className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all disabled:opacity-30"
                                      title="Удалить ступень"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 stroke-[2px]" />
                                    </button>
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {isBracketExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="p-3 pt-0 grid gap-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Название</label>
                                            <input 
                                              type="text" 
                                              value={bracket.label ?? ''} 
                                              onChange={(e) => handleBracketChange(year, index, 'label', e.target.value)}
                                              className="apple-input w-full px-2.5 py-1.5 text-xs font-semibold"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Лимит (₽)</label>
                                            {bracket.limit === Infinity ? (
                                              <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-400 text-center border border-transparent">Максимум</div>
                                            ) : (
                                              <input 
                                                type="number"
                                                value={bracket.limit ?? 0} 
                                                onChange={(e) => handleBracketChange(year, index, 'limit', Number(e.target.value))}
                                                className="apple-input w-full px-2.5 py-1.5 text-xs font-mono font-semibold"
                                              />
                                            )}
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Ставка (%)</label>
                                            <div className="relative">
                                              <input 
                                                type="number" 
                                                value={Math.round(bracket.rate * 100)} 
                                                onChange={(e) => handleBracketChange(year, index, 'rate', (parseFloat(e.target.value) || 0) / 100)}
                                                className="apple-input w-full px-2.5 py-1.5 text-xs font-mono font-semibold"
                                              />
                                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">%</span>
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
                            onClick={() => addBracket(year)}
                            className="w-full apple-button border border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2 py-2.5 transition-all shadow-sm active:scale-[0.98]"
                          >
                            <Plus size={14} className="stroke-[3px]" /> 
                            <span className="text-[10px] font-bold uppercase tracking-wider">Добавить ступень</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            <button 
              onClick={addBracketYear}
              className="w-full apple-button border border-indigo-500/20 bg-white dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2 py-3 transition-all shadow-sm active:scale-[0.99] group"
            >
              <Plus size={16} className="stroke-[3px] group-hover:scale-110 transition-transform" /> 
              <span className="text-xs font-bold uppercase tracking-wider">Добавить период</span>
            </button>
          </div>
        </section>

        {/* Налог на вклады Section */}
        <section className="apple-card p-5 lg:p-6 space-y-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4 h-12">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <ReceiptRussianRuble className="w-6 h-6 text-emerald-600 stroke-[1.5px]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">Налог на вклады</h3>
                <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Лимиты и ставки</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!taxSettings.find(s => s.year === 2024) && (
                <button 
                  onClick={restore2024}
                  className="px-3 md:px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-emerald-600 dark:text-emerald-400 text-[11px] lg:text-xs font-bold rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all cursor-pointer"
                >
                  2024
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 flex-1 overflow-auto max-h-[600px] pr-1 scrollbar-hide">
            {taxSettings.sort((a, b) => b.year - a.year).map(setting => {
              const isExpanded = expandedYear === setting.year;
              return (
                <div 
                  key={setting.year} 
                  className="apple-card overflow-hidden border border-slate-200 dark:border-slate-800 transition-all hover:border-emerald-500/20 shadow-sm group"
                >
                  <div 
                    className="h-16 px-4 flex items-center justify-between cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setExpandedYear(isExpanded ? null : setting.year)}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
                        <ChevronDown size={20} className="text-slate-500" />
                      </motion.div>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono">{setting.year}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {!isExpanded && (
                        <div className="text-right">
                          <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider">Лимит</span>
                          <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">{setting.limit.toLocaleString('ru-RU')} ₽</span>
                        </div>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setYearToDelete(setting.year); }}
                        className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100"
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
                        <div className="p-4 grid grid-cols-1 gap-4 border-t border-slate-200/50 dark:border-slate-800/50">
                          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0">Лимит</label>
                            <div className="relative w-full xl:w-[140px]">
                              <input 
                                type="number" 
                                value={setting.limit}
                                onChange={(e) => updateYearSetting(setting.year, 'limit', Number(e.target.value))}
                                className="apple-input w-full px-3 py-2 text-sm font-mono text-left xl:text-right pr-6 bg-slate-50 dark:bg-slate-800"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">₽</span>
                            </div>
                          </div>
                          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0">Ставка (%)</label>
                            <div className="relative w-full xl:w-[140px]">
                              <input 
                                type="number" 
                                value={setting.ndflRate}
                                onChange={(e) => updateYearSetting(setting.year, 'ndflRate', Number(e.target.value))}
                                className="apple-input w-full px-3 py-2 text-sm font-mono text-left xl:text-right pr-6 bg-slate-50 dark:bg-slate-800"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">%</span>
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
              className="w-full mt-2 apple-button border border-emerald-500/20 bg-white dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2 py-3 transition-all shadow-sm active:scale-[0.99] group"
            >
              <Plus size={16} className="stroke-[3px] group-hover:scale-110 transition-transform" /> 
              <span className="text-xs font-bold uppercase tracking-wider">Добавить период</span>
            </button>
          </div>
        </section>
      </div>

      {/* Archive Section */}
      <section className="apple-card p-5 lg:p-6">
        <div className="flex items-center gap-4 mb-6 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <ArchiveIcon className="w-6 h-6 text-orange-600 stroke-[1.5px]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">Архив вкладов</h3>
              <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate pr-2">Все закрытые и завершенные вклады</p>
            </div>
          </div>
          <div className="shrink-0">
             <ArchiveHeaderActions />
          </div>
        </div>
        <Archive />
      </section>

      {/* Delete Confirmation Modals */}
      <AnimatePresence>
        {yearToDelete !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="apple-card p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Удалить период?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Вы уверены, что хотите удалить настройки налога на вклады для {yearToDelete} года? Это действие нельзя отменить.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setYearToDelete(null)}
                  className="flex-1 apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/10"
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

        {bracketYearToDelete !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="apple-card p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Удалить период из шкалы НДФЛ?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Вы уверены, что хотите удалить настройки шкалы НДФЛ для {bracketYearToDelete} года? Это действие нельзя отменить.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setBracketYearToDelete(null)}
                  className="flex-1 apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Отмена
                </button>
                <button 
                  onClick={confirmDeleteBracketYear}
                  className="flex-1 apple-button bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {bracketToDelete !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="apple-card p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Удалить ступень?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Вы уверены, что хотите удалить эту ступень налога? Расчеты могут измениться.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setBracketToDelete(null)}
                  className="flex-1 apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Отмена
                </button>
                <button 
                  onClick={confirmDeleteBracket}
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
