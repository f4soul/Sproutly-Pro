import React, { useState, useRef, Fragment } from 'react';
import { Dialog } from '@headlessui/react';
import { TaxYearSettings, AppSettings, TaxBracket } from '../../types';
import { db, syncWithFirebase } from '../../config/db';
import { Plus, Trash2, Download, Upload, CloudSync, Archive as ArchiveIcon, AlertTriangle, CheckCircle2, Settings2 as Settings2Icon, ChevronDown, TrendingUp, ReceiptRussianRuble } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Archive, ArchiveHeaderActions } from './Archive';
import { SecuritySettings } from './SecuritySettings';
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
    
    await db.taxYearSettings.put({
      year: nextYear,
      limit: 210000,
      ndflRate: 13,
      updatedAt: Date.now()
    });
    setNewYear(nextYear + 1);
    addToast(`Период ${nextYear} добавлен`);
    syncWithFirebase();
  };

  const restore2024 = async () => {
    if (taxSettings.find(s => s.year === 2024)) return;
    await db.taxYearSettings.put({
      year: 2024,
      limit: 210000,
      ndflRate: 13,
      updatedAt: Date.now()
    });
    addToast('Период 2024 восстановлен');
    syncWithFirebase();
  };

  const updateYearSetting = async (year: number, field: keyof TaxYearSettings, value: number) => {
    await db.taxYearSettings.update(year, { [field]: value, updatedAt: Date.now() });
    syncWithFirebase();
  };

  const confirmDeleteYear = async () => {
    if (yearToDelete !== null) {
      await db.taxYearSettings.delete(yearToDelete);
      
      const { auth } = await import('../../config/firebase');
      const user = auth.currentUser;
      if (user) {
        await db.deletedQueue.put({
          collection: 'taxYearSettings',
          docId: `${user.uid}_${yearToDelete}`,
          timestamp: Date.now()
        });
      }
      
      setYearToDelete(null);
      addToast('Период удален');
      syncWithFirebase();
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
    const appSettingsData = await db.appSettings.toArray();
    const banks = await db.banks.toArray();
    
    // Convert Dates properly for deposits before exporting if needed,
    // though JSON.stringify handles Dates to ISO strings.
    const data = { 
      deposits, 
      settings, 
      appSettings: appSettingsData,
      banks,
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
        const now = Date.now();
        
        if (data.deposits) {
          const mappedDeposits = data.deposits.map((d: any) => ({
            ...d,
            startDate: new Date(d.startDate),
            endDate: d.endDate ? new Date(d.endDate) : undefined,
            updatedAt: now
          }));
          await db.deposits.clear();
          await db.deposits.bulkPut(mappedDeposits);
        }
        if (data.settings) {
          const mappedSettings = data.settings.map((s: any) => ({ ...s, updatedAt: now }));
          await db.taxYearSettings.clear();
          await db.taxYearSettings.bulkPut(mappedSettings);
        }
        if (data.appSettings) {
          const mappedApp = data.appSettings.map((s: any) => ({ ...s, updatedAt: now }));
          await db.appSettings.clear();
          await db.appSettings.bulkPut(mappedApp);
        }
        if (data.banks) {
          const mappedBanks = data.banks.map((b: any) => ({ ...b, updatedAt: now }));
          await db.banks.clear();
          await db.banks.bulkPut(mappedBanks);
        }
        if (data.incomeTracker && data.incomeTracker.years && data.incomeTracker.activeYear) {
          // setState handles setting updatedAt inside
          setState(data.incomeTracker);
        }
        addToast('Данные успешно импортированы');
        setTimeout(() => window.location.reload(), 1500);
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

  const availableBracketYears = Object.keys(state.taxBrackets).map(Number).sort((a, b) => a - b);

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
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300 relative w-full max-w-6xl mx-auto pb-12">
      {/* Backup Section */}
      <section className="apple-card p-4 sm:p-5 xl:p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-[18px] bg-primary-500/10 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
            <CloudSync className="w-5 h-5 md:w-6 md:h-6 text-primary-500 stroke-[1.8px]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight text-slate-950 dark:text-white truncate">Резервная копия</h3>
            <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Экспорт и импорт данных</p>
          </div>
        </div>
        
        <div className="flex gap-2.5 shrink-0 items-center">
          <button 
            type="button"
            onClick={exportData}
            className="apple-button w-11 h-11 lg:w-auto lg:h-11 flex items-center justify-center gap-2 px-0 lg:px-4 py-0 lg:py-2.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold text-xs transition-all rounded-[14px] cursor-pointer outline-none active:scale-[0.95] shadow-sm border border-primary-500/5 dark:border-white/[0.04] shrink-0"
            title="Экспорт"
          >
            <Download className="w-5 h-5 lg:w-4 lg:h-4 stroke-[2.2px] shrink-0" />
            <span className="hidden lg:inline">Экспорт</span>
          </button>
          <label 
            className="apple-button w-11 h-11 lg:w-auto lg:h-11 flex items-center justify-center gap-2 px-0 lg:px-4 py-0 lg:py-2.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold text-xs transition-all rounded-[14px] cursor-pointer outline-none active:scale-[0.95] shadow-sm border border-primary-500/5 dark:border-white/[0.04] shrink-0"
            title="Импорт"
          >
            <Upload className="w-5 h-5 lg:w-4 lg:h-4 stroke-[2.2px] shrink-0" />
            <span className="hidden lg:inline">Импорт</span>
            <input type="file" className="sr-only" accept=".json" onChange={importData} />
          </label>
        </div>
      </section>
      {/* Tax Brackets and Deposits Tax Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* Шкала НДФЛ Section */}
        <section className="apple-card p-4 sm:p-5 xl:p-6 space-y-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4 h-12">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center shrink-0">
                <Settings2Icon className="w-6 h-6 text-primary-600 stroke-[1.5px]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold tracking-tight text-slate-950 dark:text-white truncate">Шкала НДФЛ</h3>
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
                    isYearExpanded ? "border-primary-500/30 shadow-md" : "border-slate-200 dark:border-slate-800 hover:border-primary-500/20 shadow-sm"
                  )}
                >
                  {/* Year Accordion Header */}
                  <div 
                    className="h-16 px-4 flex items-center justify-between cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setExpandedBracketYear(isYearExpanded ? null : year)}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div animate={{ rotate: isYearExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
                        <ChevronDown size={20} className="text-slate-500" />
                      </motion.div>
                      <span className="text-base font-bold text-slate-950 dark:text-white font-mono">{year}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {!isYearExpanded && (
                        <div className="text-right">
                          <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider">Структура</span>
                          <span className="text-sm font-bold text-primary-600 dark:text-primary-400 font-mono whitespace-nowrap">
                            {yearBrackets.length} {getPlural(yearBrackets.length, 'ступень', 'ступени', 'ступеней')}
                          </span>
                        </div>
                      )}
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); setBracketYearToDelete(year); }}
                        className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer opacity-100 lg:opacity-40 lg:group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2px]" />
                      </button>
                    </div>
                  </div>

                  {/* Brackets Content */}
                  <div 
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                      isYearExpanded ? "grid-rows-[1fr] opacity-100 pointer-events-auto" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="p-4 bg-transparent space-y-3 border-t border-slate-200/30 dark:border-slate-800/30">
                        {yearBrackets.map((bracket, index) => {
                          const isBracketExpanded = expandedBracketIndex === index;
                          return (
                            <div 
                              key={`bracket-${year}-${index}`} 
                              className={cn(
                                "apple-card overflow-hidden border transition-all",
                                isBracketExpanded ? "border-primary-500/30 bg-white dark:bg-slate-950/50" : "border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/30"
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
                                  <span className="text-sm font-bold text-slate-950 dark:text-white truncate">{bracket.label || `Ступень ${index + 1}`}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {!isBracketExpanded && (
                                    <span className="text-xs font-bold text-primary-600 font-mono">
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

                              <div 
                                className={cn(
                                  "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                                  isBracketExpanded ? "grid-rows-[1fr] opacity-100 pointer-events-auto" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                                )}
                              >
                                <div className="overflow-hidden">
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
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <button 
                          onClick={() => addBracket(year)}
                          className="w-full apple-button border border-primary-500/20 bg-primary-50/30 dark:bg-primary-500/5 hover:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center gap-2 py-2.5 transition-all shadow-sm active:scale-[0.98]"
                        >
                          <Plus size={14} className="stroke-[3px]" /> 
                          <span className="text-[10px] font-bold uppercase tracking-wider">Добавить ступень</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button 
              onClick={addBracketYear}
              className="w-full apple-button border border-primary-500/20 bg-white dark:bg-slate-950/50 hover:bg-primary-50 dark:hover:bg-primary-500/5 text-primary-600 dark:text-primary-400 flex items-center justify-center gap-2 py-3 transition-all shadow-sm active:scale-[0.99] group"
            >
              <Plus size={16} className="stroke-[3px] group-hover:scale-110 transition-transform" /> 
              <span className="text-xs font-bold uppercase tracking-wider">Добавить период</span>
            </button>
          </div>
        </section>

        {/* Налог на вклады Section */}
        <section className="apple-card p-4 sm:p-5 xl:p-6 space-y-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4 h-12">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-deposit-500/10 flex items-center justify-center shrink-0">
                <ReceiptRussianRuble className="w-6 h-6 text-deposit-600 stroke-[1.5px]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold tracking-tight text-slate-950 dark:text-white truncate">Налог на вклады</h3>
                <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Лимиты и ставки</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!taxSettings.find(s => s.year === 2024) && (
                <button 
                  onClick={restore2024}
                  className="px-3 md:px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-deposit-600 dark:text-deposit-400 text-[11px] lg:text-xs font-bold rounded-xl hover:bg-deposit-50 dark:hover:bg-deposit-500/10 transition-all cursor-pointer"
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
                  className="apple-card overflow-hidden border border-slate-200 dark:border-slate-800 transition-all hover:border-deposit-500/20 shadow-sm group"
                >
                  <div 
                    className="h-16 px-4 flex items-center justify-between cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-deposit-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setExpandedYear(isExpanded ? null : setting.year)}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
                        <ChevronDown size={20} className="text-slate-500" />
                      </motion.div>
                      <span className="text-base font-bold text-slate-950 dark:text-white font-mono">{setting.year}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {!isExpanded && (
                        <div className="text-right">
                          <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider">Лимит</span>
                          <span className="text-sm font-mono font-semibold text-deposit-600 dark:text-deposit-400">{setting.limit.toLocaleString('ru-RU')} ₽</span>
                        </div>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setYearToDelete(setting.year); }}
                        className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer opacity-100 lg:opacity-40 lg:group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2px]" />
                      </button>
                    </div>
                  </div>

                  <div 
                    className={cn(
                      "grid bg-transparent transition-[grid-template-rows,opacity] duration-300 ease-out",
                      isExpanded ? "grid-rows-[1fr] opacity-100 pointer-events-auto" : "grid-rows-[0fr] opacity-0 pointer-events-none"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="p-4 grid grid-cols-1 gap-4 border-t border-slate-200/50 dark:border-slate-800/50">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0">Лимит</label>
                          <div className="relative w-full xl:w-[140px]">
                            <input 
                              type="number" 
                              value={setting.limit}
                              onChange={(e) => updateYearSetting(setting.year, 'limit', Number(e.target.value))}
                              className="apple-input w-full px-3 py-2 text-sm font-mono text-left xl:text-right !pr-12 bg-slate-50 dark:bg-slate-800"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold pointer-events-none">₽</span>
                          </div>
                        </div>
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0">Ставка (%)</label>
                          <div className="relative w-full xl:w-[140px]">
                            <input 
                              type="number" 
                              value={setting.ndflRate}
                              onChange={(e) => updateYearSetting(setting.year, 'ndflRate', Number(e.target.value))}
                              className="apple-input w-full px-3 py-2 text-sm font-mono text-left xl:text-right !pr-12 bg-slate-50 dark:bg-slate-800"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold pointer-events-none">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            <button 
              onClick={addYear}
              className="w-full mt-2 apple-button border border-deposit-500/20 bg-white dark:bg-slate-950/50 hover:bg-deposit-50 dark:hover:bg-deposit-500/5 text-deposit-600 dark:text-deposit-400 flex items-center justify-center gap-2 py-3 transition-all shadow-sm active:scale-[0.99] group"
            >
              <Plus size={16} className="stroke-[3px] group-hover:scale-110 transition-transform" /> 
              <span className="text-xs font-bold uppercase tracking-wider">Добавить период</span>
            </button>
          </div>
        </section>
      </div>

      {/* Security & Archive Section side by side grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch mb-6 lg:mb-8">
        {/* Security Section */}
        <SecuritySettings appSettings={appSettings} />

        {/* Archive Section */}
        <section className="apple-card p-4 sm:p-5 xl:p-6 h-full flex flex-col">
          <div className="flex items-center gap-4 mb-6 justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <ArchiveIcon className="w-6 h-6 text-orange-600 stroke-[1.5px]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold tracking-tight text-slate-950 dark:text-white truncate">Архив</h3>
                <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate pr-2">Удаленные вклады</p>
              </div>
            </div>
            <div className="shrink-0">
               <ArchiveHeaderActions />
            </div>
          </div>
          <Archive />
        </section>
      </div>

      {/* Delete Confirmation Modals */}
      <AnimatePresence>
        {yearToDelete !== null && (
          <Dialog as="div" className="relative z-[150]" open={true} onClose={() => setYearToDelete(null)} static>
            <motion.div 
              key="delete-year-modal-settings"
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
                  className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col pointer-events-auto p-6 text-center"
                >
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                      <Trash2 className="w-6 h-6 stroke-[1.5px]" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white mb-2">Удалить период?</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                    Вы уверены, что хотите удалить настройки налога на вклады для <strong>{yearToDelete}</strong> года? Это действие нельзя отменить.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setYearToDelete(null)}
                      className="flex-1 apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-white hover:bg-[#E5E5E7] dark:hover:bg-white/10 text-sm sm:text-base cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button 
                      onClick={confirmDeleteYear}
                      className="flex-1 apple-button bg-rose-500 text-white shadow-lg shadow-rose-500/20 text-sm sm:text-base cursor-pointer"
                    >
                      Удалить
                    </button>
                  </div>
                </motion.div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}

        {bracketYearToDelete !== null && (
          <Dialog as="div" className="relative z-[150]" open={true} onClose={() => setBracketYearToDelete(null)} static>
            <motion.div 
              key="delete-bracket-year-modal-settings"
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
                  className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col pointer-events-auto p-6 text-center"
                >
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                      <Trash2 className="w-6 h-6 stroke-[1.5px]" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white mb-2">Удалить период?</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                    Вы уверены, что хотите удалить настройки шкалы НДФЛ для <strong>{bracketYearToDelete}</strong> года? Это действие нельзя отменить.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setBracketYearToDelete(null)}
                      className="flex-1 apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-white hover:bg-[#E5E5E7] dark:hover:bg-white/10 text-sm sm:text-base cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button 
                      onClick={confirmDeleteBracketYear}
                      className="flex-1 apple-button bg-rose-500 text-white shadow-lg shadow-rose-500/20 text-sm sm:text-base cursor-pointer"
                    >
                      Удалить
                    </button>
                  </div>
                </motion.div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}

        {bracketToDelete !== null && (
          <Dialog as="div" className="relative z-[150]" open={true} onClose={() => setBracketToDelete(null)} static>
            <motion.div 
              key="delete-bracket-modal-settings"
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
                  className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col pointer-events-auto p-6 text-center"
                >
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                      <Trash2 className="w-6 h-6 stroke-[1.5px]" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white mb-2">Удалить ступень?</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                    Вы уверены, что хотите удалить эту ступень налога? Расчеты могут измениться.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setBracketToDelete(null)}
                      className="flex-1 apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-white hover:bg-[#E5E5E7] dark:hover:bg-white/10 text-sm sm:text-base cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button 
                      onClick={confirmDeleteBracket}
                      className="flex-1 apple-button bg-rose-500 text-white shadow-lg shadow-rose-500/20 text-sm sm:text-base cursor-pointer"
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
    </div>
  );
}
