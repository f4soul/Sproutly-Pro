import React, { useState, Fragment } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { ReceiptRussianRuble, Plus, ChevronDown, Trash2 } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import { db, syncWithFirebase } from '../../../config/db';
import { cn } from '../../../lib/utils';
import { formatCurrency } from '../../../lib/taxCalculator';
import { showToast } from '../../../lib/toast';
import { TaxYearSettings } from '../../../types';

export function DepositsTaxSettings() {
  const { taxSettings } = useSettings();

  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1);
  const [yearToDelete, setYearToDelete] = useState<number | null>(null);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  const addYear = async () => {
    const maxYear = taxSettings.length > 0 ? Math.max(...taxSettings.map((s: TaxYearSettings) => s.year)) : new Date().getFullYear();
    const nextYear = Math.max(newYear, maxYear + 1);

    if (taxSettings.find((s: TaxYearSettings) => s.year === nextYear)) {
      showToast('Этот период уже добавлен', 'info');
      return;
    }

    await db.taxYearSettings.put({
      year: nextYear,
      limit: 210000,
      ndflRate: 13,
      updatedAt: Date.now()
    });
    setNewYear(nextYear + 1);
    showToast(`Период ${nextYear} добавлен`);
    syncWithFirebase();
  };

  const restore2024 = async () => {
    if (taxSettings.find((s: TaxYearSettings) => s.year === 2024)) return;
    await db.taxYearSettings.put({
      year: 2024,
      limit: 210000,
      ndflRate: 13,
      updatedAt: Date.now()
    });
    showToast('Период 2024 восстановлен');
    syncWithFirebase();
  };

  const updateYearSetting = async (year: number, field: keyof TaxYearSettings, value: number) => {
    await db.taxYearSettings.update(year, { [field]: value, updatedAt: Date.now() } as Partial<TaxYearSettings>);
    syncWithFirebase();
  };

  const confirmDeleteYear = async () => {
    if (yearToDelete !== null) {
      await db.taxYearSettings.delete(yearToDelete);

      const { auth } = await import('../../../config/firebase');
      const user = auth.currentUser;
      if (user) {
        await db.deletedQueue.put({
          collection: 'taxYearSettings',
          docId: `${user.uid}_${yearToDelete}`,
          timestamp: Date.now()
        });
      }

      setYearToDelete(null);
      showToast('Период удален');
      syncWithFirebase();
    }
  };

  return (
    <>
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
            {!taxSettings.find((s: TaxYearSettings) => s.year === 2024) && (
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
          {taxSettings.slice().sort((a: TaxYearSettings, b: TaxYearSettings) => b.year - a.year).map((setting: TaxYearSettings) => {
            const isExpanded = expandedYear === setting.year;
            return (
              <div
                key={setting.year}
                className="apple-card overflow-hidden border border-slate-200 dark:border-slate-800 transition-all hover:border-deposit-500/20 shadow-sm group"
              >
                <div
                  className="h-16 px-4 flex items-center justify-between cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-deposit-50 dark:hover:bg-slate-800 transition-colors active:scale-100"
                  onClick={() => setExpandedYear(isExpanded ? null : setting.year)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedYear(isExpanded ? null : setting.year);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
                      <ChevronDown size={20} className="text-slate-500" />
                    </motion.div>
                    <span className="text-base font-bold text-slate-950 dark:text-white tabular-nums">{setting.year}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isExpanded && (
                      <div className="text-right">
                        <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider">Лимит</span>
                        <span className="text-sm tabular-nums font-semibold text-deposit-600 dark:text-deposit-400">{formatCurrency(setting.limit).replace(/\s?[₽|RUB]$/i, '')} ₽</span>
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
                  <div className="overflow-hidden transform-gpu origin-top">
                    <div className="p-4 grid grid-cols-1 gap-4 border-t border-slate-200/50 dark:border-slate-800/50">
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0">Лимит</label>
                        <div className="relative w-full xl:w-[140px]">
                          <input
                            type="number"
                            value={setting.limit}
                            onChange={(e) => updateYearSetting(setting.year, 'limit', Number(e.target.value))}
                            className="apple-input w-full px-3 py-2 text-sm tabular-nums text-left xl:text-right !pr-12 bg-slate-50 dark:bg-slate-800"
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
                            className="apple-input w-full px-3 py-2 text-sm tabular-nums text-left xl:text-right !pr-12 bg-slate-50 dark:bg-slate-800"
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

      <AnimatePresence>
        {yearToDelete !== null && (
          <Dialog as="div" className="relative z-[150]" open={true} onClose={() => setYearToDelete(null)} static>
            <motion.div
              key="delete-year-modal-settings"
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
                  className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col pointer-events-auto px-6 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:p-8 text-center"
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
      </AnimatePresence>
    </>
  );
}
