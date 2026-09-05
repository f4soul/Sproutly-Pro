import React, { useState, Fragment } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2 as Settings2Icon, Plus, ChevronDown, Trash2 } from 'lucide-react';
import { useIncome } from '../../../context/IncomeContext';
import { DEFAULT_TAX_BRACKETS } from '../../../lib/constants';
import { cn } from '../../../lib/utils';
import { getPlural } from '../../../lib/helpers';
import { showToast } from '../../../lib/toast';

export function TaxBracketsSettings() {
  const { state, setState } = useIncome();

  const [expandedBracketYear, setExpandedBracketYear] = useState<number | null>(null);
  const [expandedBracketIndex, setExpandedBracketIndex] = useState<number | null>(null);
  const [bracketYearToDelete, setBracketYearToDelete] = useState<number | null>(null);
  const [bracketToDelete, setBracketToDelete] = useState<{ year: number, index: number } | null>(null);

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
    showToast(`Период ${nextYear} добавлен в шкалу НДФЛ`);
  };

  const removeBracketYear = (year: number) => {
    if (availableBracketYears.length <= 1) {
      showToast('Должен остаться хотя бы один период', 'info');
      return;
    }
    setState(prev => {
      const newBrackets = { ...prev.taxBrackets };
      delete newBrackets[year];
      return { ...prev, taxBrackets: newBrackets };
    });
    showToast(`Период ${year} удален из шкалы НДФЛ`);
    if (expandedBracketYear === year) {
      setExpandedBracketYear(null);
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

  return (
    <>
      <section className="apple-card p-4 sm:p-5 xl:p-6 space-y-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 h-12">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center shrink-0">
              <Settings2Icon className="w-6 h-6 text-primary-500 stroke-[1.5px]" />
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
                  className="h-16 px-4 flex items-center justify-between cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors active:scale-100"
                  onClick={() => setExpandedBracketYear(isYearExpanded ? null : year)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedBracketYear(isYearExpanded ? null : year);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <motion.div animate={{ rotate: isYearExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
                      <ChevronDown size={20} className="text-slate-500" />
                    </motion.div>
                    <span className="text-base font-bold text-slate-950 dark:text-white tabular-nums">{year}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isYearExpanded && (
                      <div className="text-right">
                        <span className="block text-[9px] uppercase text-slate-500 font-bold tracking-wider">Структура</span>
                        <span className="text-sm font-bold text-primary-600 dark:text-primary-400 tabular-nums whitespace-nowrap">
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
                  <div className="overflow-hidden transform-gpu origin-top">
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
                              className="p-3 flex items-center justify-between cursor-pointer active:scale-100"
                              onClick={() => setExpandedBracketIndex(isBracketExpanded ? null : index)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setExpandedBracketIndex(isBracketExpanded ? null : index);
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <motion.div animate={{ rotate: isBracketExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
                                  <ChevronDown size={16} className="text-slate-500 opacity-50 shrink-0" />
                                </motion.div>
                                <span className="text-sm font-bold text-slate-950 dark:text-white truncate">{bracket.label || `Ступень ${index + 1}`}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {!isBracketExpanded && (
                                  <span className="text-xs font-bold text-primary-600 tabular-nums">
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
                              <div className="overflow-hidden transform-gpu origin-top">
                                <div className="p-3 pt-0 grid gap-3">
                                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
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
                                      {((index === yearBrackets.length - 1) && (bracket.limit === Infinity || bracket.limit === null || bracket.limit === 0)) ? (
                                        <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5 text-lg leading-[18px] font-black text-slate-400 text-center border border-transparent">∞</div>
                                      ) : (
                                        <input
                                          type="number"
                                          value={bracket.limit ?? 0}
                                          onChange={(e) => handleBracketChange(year, index, 'limit', Number(e.target.value))}
                                          className="apple-input w-full px-2.5 py-1.5 text-xs tabular-nums font-semibold"
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
                                          className="apple-input w-full px-2.5 py-1.5 text-xs tabular-nums font-semibold"
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

      <AnimatePresence>
        {bracketYearToDelete !== null && (
          <Dialog as="div" className="relative z-[150]" open={true} onClose={() => setBracketYearToDelete(null)} static>
            <motion.div
              key="delete-bracket-year-modal-settings"
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
    </>
  );
}
