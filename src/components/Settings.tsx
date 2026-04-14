import React, { useState, useRef } from 'react';
import { TaxYearSettings, AppSettings, TaxBracket } from '../types';
import { db } from '../db';
import { Plus, Trash2, Download, Upload, ShieldCheck, Archive as ArchiveIcon, AlertTriangle, CheckCircle2, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Archive } from './Archive';
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
  
  // Tax Brackets State
  const [selectedBracketYear, setSelectedBracketYear] = useState<number>(2025);
  const currentBrackets = state.taxBrackets[selectedBracketYear] || state.taxBrackets[2025] || DEFAULT_TAX_BRACKETS[2025];

  const addYear = async () => {
    if (taxSettings.find(s => s.year === newYear)) {
      addToast('Этот год уже добавлен', 'info');
      return;
    }
    await db.taxYearSettings.add({
      year: newYear,
      limit: 210000,
      ndflRate: 13
    });
    setNewYear(newYear + 1);
    addToast(`Период ${newYear} добавлен`);
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
    <div className="space-y-6 animate-in fade-in duration-700 relative max-w-4xl mx-auto pb-12">
      {/* Backup Section */}
      <div className="grid grid-cols-1 gap-4">
        <section className="apple-card p-4 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-blue-600 stroke-[1.5px]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary truncate">Резервная копия</h3>
              <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-medium truncate">Управление данными</p>
            </div>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={exportData}
              className="p-2.5 bg-[#F5F5F7] dark:bg-white/5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all text-blue-600 cursor-pointer"
              title="Экспорт"
            >
              <Download className="w-4 h-4 stroke-[2px]" />
            </button>
            <label 
              className="p-2.5 bg-[#F5F5F7] dark:bg-white/5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all text-emerald-600 cursor-pointer"
              title="Импорт"
            >
              <Upload className="w-4 h-4 stroke-[2px]" />
              <input type="file" className="sr-only" accept=".json" onChange={importData} />
            </label>
          </div>
        </section>
      </div>

      {/* Income Tax Brackets Section */}
      <section className="apple-card p-5 space-y-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
            <SettingsIcon className="w-5 h-5 text-indigo-600 stroke-[1.5px]" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary">Прогрессивная шкала НДФЛ</h3>
            <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-medium">Настройки ступеней налога на доходы</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 uppercase tracking-wider">Выберите год:</label>
          <div className="flex flex-wrap gap-2">
            {availableBracketYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedBracketYear(year)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer",
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

        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-1 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest px-1 sm:px-2">
            <div className="col-span-4">Название</div>
            <div className="col-span-4">Лимит (₽)</div>
            <div className="col-span-3">Ставка (%)</div>
            <div className="col-span-1"></div>
          </div>
          
          {currentBrackets.map((bracket, index) => (
            <div key={index} className="grid grid-cols-12 gap-1 sm:gap-2 items-center bg-[#F5F5F7] dark:bg-white/5 p-1.5 sm:p-2 rounded-xl border border-light-border dark:border-dark-border">
              <div className="col-span-4">
                <input 
                  type="text" 
                  value={bracket.label ?? ''} 
                  onChange={(e) => handleBracketChange(index, 'label', e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border rounded-lg sm:rounded-xl px-1.5 py-1 sm:px-2 sm:py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="col-span-4">
                {bracket.limit === Infinity ? (
                  <div className="w-full bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg sm:rounded-xl px-1.5 py-1 sm:px-2 sm:py-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                    ∞
                  </div>
                ) : (
                  <TableInput 
                    value={bracket.limit ?? 0} 
                    onChange={(val) => handleBracketChange(index, 'limit', val)}
                    className="w-full bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border rounded-lg sm:rounded-xl px-1.5 py-1 sm:px-2 sm:py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-left"
                  />
                )}
              </div>
              <div className="col-span-3">
                <div className="relative">
                  <input 
                    type="number" 
                    value={bracket.rate != null ? Math.round(bracket.rate * 100) : ''} 
                    onChange={(e) => handleBracketChange(index, 'rate', (parseFloat(e.target.value) || 0) / 100)}
                    className="w-full bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border rounded-lg sm:rounded-xl px-1.5 py-1 sm:px-2 sm:py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-mono pr-4 sm:pr-6"
                  />
                  <span className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] sm:text-xs">%</span>
                </div>
              </div>
              <div className="col-span-1 flex justify-end">
                <button 
                  onClick={() => removeBracket(index)}
                  disabled={currentBrackets.length <= 1}
                  className="p-1 sm:p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          ))}
          
          <button 
            onClick={addBracket}
            className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-2 py-1 cursor-pointer uppercase tracking-wider"
          >
            <Plus size={14} /> Добавить ступень
          </button>
        </div>
      </section>

      {/* Deposits Tax Periods Section */}
      <section className="apple-card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-emerald-600 stroke-[1.5px]" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary">Налог на вклады</h3>
              <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-medium">Лимиты и ставки по годам</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!taxSettings.find(s => s.year === 2024) && (
              <button 
                onClick={restore2024}
                className="px-3 py-1.5 bg-[#F5F5F7] dark:bg-white/5 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all cursor-pointer"
              >
                Восстановить 2024
              </button>
            )}
            <button 
              onClick={addYear}
              className="w-8 h-8 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all active:scale-90 cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {taxSettings.sort((a, b) => b.year - a.year).map(setting => (
            <motion.div 
              layout
              key={setting.year} 
              className="p-3.5 bg-[#F5F5F7] dark:bg-white/5 rounded-[16px] space-y-3 relative group border border-light-border dark:border-dark-border transition-all hover:border-emerald-500/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-light-text-primary dark:text-dark-text-primary font-mono">{setting.year}</span>
                <button 
                  onClick={() => setYearToDelete(setting.year)}
                  className="p-1.5 text-light-text-secondary hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-rose-500/10 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2px]" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[9px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest shrink-0">Лимит</label>
                  <div className="relative w-full">
                    <input 
                      type="number" 
                      value={setting.limit}
                      onChange={(e) => updateYearSetting(setting.year, 'limit', Number(e.target.value))}
                      className="w-full bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border rounded-lg px-2 py-1 text-xs font-mono text-right focus:ring-1 focus:ring-emerald-500 outline-none pr-5"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-light-text-secondary">₽</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[9px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest shrink-0">Ставка</label>
                  <div className="relative w-full">
                    <input 
                      type="number" 
                      value={setting.ndflRate}
                      onChange={(e) => updateYearSetting(setting.year, 'ndflRate', Number(e.target.value))}
                      className="w-full bg-white dark:bg-gray-800 border border-light-border dark:border-dark-border rounded-lg px-2 py-1 text-xs font-mono text-right focus:ring-1 focus:ring-emerald-500 outline-none pr-5"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-light-text-secondary">%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Archive Section */}
      <section className="apple-card p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <ArchiveIcon className="w-5 h-5 text-orange-600 stroke-[1.5px]" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary">Архив вкладов</h3>
            <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-medium">Закрытые вклады</p>
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
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-light-border dark:border-dark-border"
            >
              <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary mb-2">Удалить период?</h3>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-6">
                Вы уверены, что хотите удалить настройки для {yearToDelete} года? Это действие нельзя отменить.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setYearToDelete(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button 
                  onClick={confirmDeleteYear}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors cursor-pointer"
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
