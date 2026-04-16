import React, { useState, Fragment } from 'react';
import { TaxYearSettings, AppSettings } from '../types';
import { db } from '../db';
import { Plus, Trash2, Download, Upload, ShieldCheck, Archive as ArchiveIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Archive } from './Archive';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, Transition } from '@headlessui/react';

interface SettingsProps {
  taxSettings: TaxYearSettings[];
  appSettings: AppSettings;
}

export function Settings({ taxSettings }: SettingsProps) {
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [yearToDelete, setYearToDelete] = useState<number | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addYear = async () => {
    if (taxSettings.find(s => s.year === newYear)) {
      showToast('Этот год уже добавлен', 'error');
      return;
    }
    await db.taxYearSettings.add({
      year: newYear,
      limit: 210000,
      ndflRate: 13
    });
    setNewYear(newYear + 1);
    showToast(`Период ${newYear} добавлен`);
  };

  const restore2024 = async () => {
    if (taxSettings.find(s => s.year === 2024)) return;
    await db.taxYearSettings.add({
      year: 2024,
      limit: 210000,
      ndflRate: 13
    });
    showToast('Период 2024 восстановлен');
  };

  const updateYearSetting = async (year: number, field: keyof TaxYearSettings, value: number) => {
    await db.taxYearSettings.update(year, { [field]: value });
  };

  const confirmDeleteYear = async () => {
    if (yearToDelete !== null) {
      await db.taxYearSettings.delete(yearToDelete);
      setYearToDelete(null);
      showToast('Период удален');
    }
  };

  const exportData = async () => {
    const deposits = await db.deposits.toArray();
    const settings = await db.taxYearSettings.toArray();
    const data = { deposits, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sproutly_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Данные экспортированы');
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
        showToast('Данные успешно импортированы');
      } catch {
        showToast('Ошибка при импорте данных', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 relative max-w-4xl mx-auto pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={cn(
              "fixed bottom-12 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 backdrop-blur-xl border font-bold text-sm",
              toastMessage.type === 'success' 
                ? "bg-emerald-500/90 text-white border-emerald-400/20" 
                : "bg-rose-500/90 text-white border-rose-400/20"
            )}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Tax Periods Section */}
      <section className="apple-card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-emerald-600 stroke-[1.5px]" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary">Налоговые периоды</h3>
              <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-medium">Лимиты и ставки по годам</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!taxSettings.find(s => s.year === 2024) && (
              <button 
                onClick={restore2024}
                className="px-3 py-1.5 bg-[#F5F5F7] dark:bg-white/5 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
              >
                Восстановить 2024
              </button>
            )}
            <button 
              onClick={addYear}
              className="w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-90 cursor-pointer shadow-lg shadow-blue-500/20 flex items-center justify-center"
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
              className="p-3.5 bg-[#F5F5F7] dark:bg-white/5 rounded-[16px] space-y-3 relative group border border-light-border dark:border-dark-border transition-all hover:border-blue-500/20"
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
                  <input 
                    type="number" 
                    value={setting.limit}
                    onChange={(e) => updateYearSetting(setting.year, 'limit', Number(e.target.value))}
                    className="apple-input w-full max-w-[80px] font-mono text-[11px] py-1 px-2 text-right bg-white dark:bg-dark-card"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[9px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest shrink-0">НДФЛ %</label>
                  <input 
                    type="number" 
                    value={setting.ndflRate}
                    onChange={(e) => updateYearSetting(setting.year, 'ndflRate', Number(e.target.value))}
                    className="apple-input w-full max-w-[56px] font-mono text-[11px] py-1 px-2 text-right bg-white dark:bg-dark-card"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      
      {/* Archive Section */}
      <section className="apple-card p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center shrink-0">
            <ArchiveIcon className="w-5 h-5 text-slate-600 dark:text-slate-400 stroke-[1.5px]" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-light-text-primary dark:text-dark-text-primary">Архив вкладов</h3>
            <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary font-medium">Удаленные и завершенные записи</p>
          </div>
        </div>
        <Archive />
      </section>

      {/* Delete Confirmation Modal */}
      <Transition show={yearToDelete !== null} as={Fragment}>
        <Dialog as="div" className="relative z-[150]" onClose={() => setYearToDelete(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-t-[32px] sm:rounded-[32px] bg-white dark:bg-dark-card p-6 sm:p-8 text-left align-middle shadow-2xl transition-all border border-light-border dark:border-dark-border">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6">
                    <AlertTriangle className="w-6 h-6 text-rose-500 stroke-[1.5px]" />
                  </div>
                  <Dialog.Title as="h3" className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2 tracking-tight">
                    Удалить период?
                  </Dialog.Title>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-8 leading-relaxed">
                    Вы собираетесь удалить налоговый период за <strong className="text-light-text-primary dark:text-dark-text-primary">{yearToDelete} год</strong>. Все настройки лимитов для этого года будут стерты.
                  </p>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="flex-1 apple-button bg-[#F5F5F7] dark:bg-white/5 text-light-text-primary dark:text-dark-text-primary hover:bg-[#E5E5E7] dark:hover:bg-white/10 text-sm sm:text-base"
                      onClick={() => setYearToDelete(null)}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      className="flex-1 apple-button bg-rose-500 text-white shadow-lg shadow-rose-500/20 text-sm sm:text-base"
                      onClick={confirmDeleteYear}
                    >
                      Удалить
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
