import React, { useState, useId, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Columns, CalendarDays, CalendarCheck2, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TableInput } from '../ui/TableInput';
import { formatCurrency } from "../../lib/taxCalculator";

export interface IncomeTableSettings {
  showQuarterly?: boolean;
  showAnnual?: boolean;
  showMonthly?: boolean;
  showExtraAnnual?: boolean;
  annualCalcType?: 'rub' | 'percent' | 'coef' | 'percent_annual';
  extraAnnualCalcType?: 'rub' | 'percent' | 'coef' | 'percent_annual';
  quarterCalcType?: 'rub' | 'percent' | 'coef';
  mainCalcType?: 'rub' | 'percent' | 'coef';
}

function SegmentedControl<T extends string>({ 
  options, 
  value, 
  onChange 
}: { 
  options: { label: string, value: T }[], 
  value: T, 
  onChange: (val: T) => void 
}) {
  const id = useId();
  return (
    <div className="flex bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 w-full relative h-full">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button type="button"
            key={opt.value}
            onClick={(e) => { e.preventDefault(); onChange(opt.value); }}
            className={cn(
              "relative flex-1 flex items-center justify-center text-[8px] sm:text-[9px] font-bold uppercase tracking-wider py-1.5 px-1 sm:px-1.5 rounded-lg transition-colors duration-200 z-20 outline-none leading-none text-center",
              isActive 
                ? "text-slate-900 dark:text-white" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <span className="relative z-20">{opt.label}</span>
            {isActive && (
              <motion.div 
                layoutId={`segmented-pill-${id}`}
                className="absolute inset-0 bg-white dark:bg-slate-800 rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-slate-200/50 dark:border-slate-700 z-10"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function PremiumAccordionItem({
  label, icon, checked, onToggle, calcType, onCalcTypeChange, options
}: {
  label: string; icon: React.ReactNode; checked: boolean; onToggle: (val: boolean) => void;
  calcType: string; onCalcTypeChange: (val: any) => void;
  options?: { label: string, value: string }[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const defaultOptions = [
    { label: 'Сумма (₽)', value: 'rub' },
    { label: '% от оклада', value: 'percent' },
    { label: 'Коэф.', value: 'coef' }
  ];
  
  const currentOptions = options || defaultOptions;
  const currentLabel = currentOptions.find(o => o.value === calcType)?.label || 'Сумма (₽)';

  return (
    <motion.div layout className={cn(
      "border transition-all duration-300 rounded-2xl overflow-hidden group",
      checked 
        ? "border-primary-500/30 bg-primary-500/5 dark:bg-primary-500/10 shadow-[0_2px_8px_rgba(16,185,129,0.05)]" 
        : "border-slate-200 dark:border-white/[0.05] bg-white/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-white/[0.1]"
    )}>
      <motion.div layout="position"
        className="flex items-center justify-between p-2 sm:p-2.5 cursor-pointer select-none relative"
        onClick={() => { 
          if (checked) {
             setIsExpanded(!isExpanded);
          } else {
             onToggle(true);
             setIsExpanded(true);
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (checked) {
               setIsExpanded(!isExpanded);
            } else {
               onToggle(true);
               setIsExpanded(true);
            }
          }
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8.5 h-8.5 ml-0.5 rounded-xl flex items-center justify-center transition-colors shadow-sm",
              checked ? "bg-primary-500 text-white shadow-primary-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
            )}>
              {icon}
            </div>
            <div className="flex flex-col ml-0.5">
              <span className={cn("font-black text-[11px] sm:text-[12px] tracking-wide uppercase leading-tight", checked ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>
                {label}
              </span>
              {checked && (
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-primary-500">
                   {currentLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mr-1">
          {checked && (
            <div className={cn("text-slate-400 transition-transform duration-300 bg-slate-100 dark:bg-slate-800 rounded-full p-1", isExpanded ? "rotate-180" : "")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          )}
          <button type="button"
            role="switch"
            aria-checked={checked}
            onClick={(e) => { e.stopPropagation(); onToggle(!checked); if (checked) setIsExpanded(false); }}
            className={cn(
              "w-10 h-[22px] rounded-full transition-colors duration-200 relative flex items-center p-[2px] outline-none shrink-0 cursor-pointer active:scale-95",
              checked ? "bg-primary-500" : "bg-[#E9E9EA] dark:bg-[#39393D]"
            )}
          >
            <div
              className={cn(
                "absolute left-[8px] top-1/2 -translate-y-1/2 w-[1.5px] h-[7px] bg-white rounded-full transition-opacity duration-200 pointer-events-none",
                checked ? "opacity-100" : "opacity-0"
              )}
            />
            <div className={cn(
              "w-[18px] h-[18px] bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.1)] transition-transform duration-200 ease-out z-10",
              checked ? "translate-x-[18px]" : "translate-x-0"
            )} />
          </button>
        </div>
      </motion.div>
      
      <AnimatePresence>
        {checked && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              <div className="p-1.5 sm:p-2 bg-white/80 dark:bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm">
                <label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-1 px-1">Тип расчета</label>
                <div className="h-[34px] sm:h-[38px] w-full overflow-x-auto no-scrollbar">
                  <div className="min-w-max h-full">
                    <SegmentedControl 
                      options={currentOptions}
                      value={calcType}
                      onChange={onCalcTypeChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface IncomeSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: IncomeTableSettings;
  baseSalary: number;
  onSave: (settings: IncomeTableSettings, baseSalary: number, applyBaseToAll: boolean) => void;
}

export function IncomeSettingsDialog({ 
  isOpen, 
  onClose, 
  settings: initialSettings, 
  baseSalary: initialBaseSalary, 
  onSave 
}: IncomeSettingsDialogProps) {
  const [settings, setSettings] = useState<IncomeTableSettings>(initialSettings || { showQuarterly: true, showAnnual: true });
  const [baseSalary, setBaseSalary] = useState(initialBaseSalary);
  const [applyBaseToAll, setApplyBaseToAll] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings || { showQuarterly: true, showAnnual: true });
      setBaseSalary(initialBaseSalary);
      setApplyBaseToAll(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialSettings, initialBaseSalary]);

  const handleSave = () => {
    onSave(settings, baseSalary, applyBaseToAll);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-y-0 right-0 left-0 md:left-68 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/80 backdrop-blur-sm pointer-events-auto"
            aria-hidden="true"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl w-full max-w-[420px] lg:max-w-[460px] rounded-t-[32px] sm:rounded-[2.5rem] shadow-[0_24px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-white/[0.08] flex flex-col h-auto max-h-[90dvh] sm:max-h-[90vh] pointer-events-auto overflow-hidden"
          >
            {/* Decorative Ambient Lighting */}
            <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary-500/20 dark:bg-primary-500/10 blur-[80px] rounded-full mt-4 ml-4 mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-48 h-48 bg-deposit-500/20 dark:bg-deposit-500/10 blur-[80px] rounded-full pointer-events-none" />
            
            {/* Header - Strictly matching CashForm/DepositForm */}
            <div className="px-6 py-5 sm:px-8 sm:py-6 shrink-0 border-b border-slate-200/50 dark:border-slate-800/50 relative z-10 flex justify-between items-center">
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Настройки</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium">Сконфигурируйте премии под себя</p>
              </div>
              <button type="button"
                onClick={onClose}
                className="p-2 sm:p-2.5 bg-white/60 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shrink-0 shadow-sm border border-slate-200/50 dark:border-white/[0.05]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="shrink min-h-0 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]">
              <div className="px-6 py-5 sm:px-8 sm:py-6 space-y-5">
                
                {/* Base Salary Card (Without layout prop) */}
                <div className={cn(
                  "relative border transition-all duration-300 rounded-3xl shadow-sm overflow-hidden group flex flex-col",
                  applyBaseToAll 
                    ? "border-teal-500/30 dark:border-teal-400/20 bg-teal-500/[0.04] dark:bg-teal-500/[0.06] shadow-[0_4px_24px_rgba(20,184,166,0.1)]" 
                    : "border-slate-200 dark:border-white/[0.05] bg-white/40 dark:bg-slate-950/40 hover:border-slate-300/80 dark:hover:border-white/[0.1]"
                )}>
                  {applyBaseToAll && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 dark:bg-teal-400/5 blur-2xl rounded-full -mr-8 -mt-8 pointer-events-none" />
                  )}
                  <div className="flex px-4 pt-4 pb-2 relative z-10 items-stretch gap-6 md:gap-0">
                    <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-2 md:pr-6">
                      <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 select-none block leading-none">
                        Базовый оклад
                      </span>
                      <div className="flex items-center bg-slate-500/5 dark:bg-slate-950/60 focus-within:bg-white dark:focus-within:bg-slate-950 rounded-2xl border border-slate-200 dark:border-white/[0.08] focus-within:border-teal-500/30 focus-within:shadow-[0_0_12px_rgba(20,184,166,0.08)] px-3 py-2.5 transition-all w-full">
                        <TableInput
                          value={baseSalary}
                          onChange={setBaseSalary}
                          className="w-full bg-transparent border-transparent hover:border-transparent focus:border-transparent focus:ring-transparent p-0 text-right pr-1.5 text-xl font-black text-slate-900 dark:text-white outline-none focus:ring-0 placeholder-slate-300 dark:placeholder-slate-700 h-6 leading-none"
                          hideDecimals={true}
                          isInteger={true}
                        />
                        <span className="text-sm font-bold text-slate-400 dark:text-slate-500 select-none shrink-0 font-sans pb-0.5">₽</span>
                      </div>
                    </div>
                    
                    <div className="hidden md:block w-[1px] bg-slate-250 dark:bg-white/[0.08] self-stretch my-1" />
                    
                    <div className="flex flex-col items-center justify-between md:pl-6 text-center shrink-0 min-w-[120px] gap-2">
                      <span className="text-[10px] md:text-[11px] text-center font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 select-none block leading-none">
                        Все месяцы
                      </span>
                      <div className="flex items-center justify-center flex-1">
                        <button type="button"
                          role="switch"
                          aria-checked={applyBaseToAll}
                          onClick={() => setApplyBaseToAll(!applyBaseToAll)}
                          className={cn(
                            "w-10 h-[22px] rounded-full transition-colors duration-200 relative flex items-center p-[2px] outline-none shrink-0 cursor-pointer active:scale-95",
                            applyBaseToAll ? "bg-teal-500 shadow-[0_4px_12px_rgba(20,184,166,0.35)]" : "bg-[#E9E9EA] dark:bg-[#39393D]"
                          )}
                        >
                          <div
                            className={cn(
                              "absolute left-[8px] top-1/2 -translate-y-1/2 w-[1.5px] h-[7px] bg-white rounded-full transition-opacity duration-200 pointer-events-none",
                              applyBaseToAll ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className={cn(
                            "w-[18px] h-[18px] bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.1)] transition-transform duration-200 ease-out z-10",
                            applyBaseToAll ? "translate-x-[18px]" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Helper Bar */}
                  <div className="overflow-hidden">
                    <div className={cn(
                      "px-4 pt-2 pb-4 border-t text-[11px] font-medium relative z-10 flex items-start gap-2 transition-colors duration-300",
                      applyBaseToAll 
                        ? "bg-teal-500/[0.03] dark:bg-teal-400/[0.01] border-teal-500/10 dark:border-teal-400/5 text-teal-600 dark:text-teal-400" 
                        : "bg-slate-50/20 dark:bg-slate-950/10 border-slate-100 dark:border-white/[0.02] text-slate-500 dark:text-slate-450"
                    )}>
                      <span className="shrink-0 text-sm leading-none mt-0.5">💡</span>
                      <span className="leading-snug min-h-[28px] flex items-center">
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={applyBaseToAll ? 'applied' : 'not_applied'}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="block"
                          >
                            {applyBaseToAll ? (
                              <>
                                Оклады во всех <strong>12 месяцах</strong> года изменятся на <strong className="tabular-nums">{formatCurrency(baseSalary)}</strong> при сохранении.
                              </>
                            ) : (
                              <>
                                Оклады в таблице останутся без изменений. Это значение будет шаблоном только для новых месяцев.
                              </>
                            )}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accordeons */}
                <div className="space-y-1.5">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest ml-1 mb-1">Системные премии</h3>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <PremiumAccordionItem 
                      label="Ежемесячная" 
                      icon={<Columns className="w-4 h-4 stroke-[2.5px]" />}
                      checked={!!settings.showMonthly} 
                      onToggle={(val) => setSettings({...settings, showMonthly: val})} 
                      calcType={settings.mainCalcType || 'rub'}
                      onCalcTypeChange={(val) => setSettings({...settings, mainCalcType: val})}
                    />
                    <PremiumAccordionItem 
                      label="Квартальная" 
                      icon={<CalendarDays className="w-4 h-4 stroke-[2.5px]" />}
                      checked={settings.showQuarterly ?? true} 
                      onToggle={(val) => setSettings({...settings, showQuarterly: val})} 
                      calcType={settings.quarterCalcType || 'rub'}
                      onCalcTypeChange={(val) => setSettings({...settings, quarterCalcType: val})}
                    />
                    <PremiumAccordionItem 
                      label="Годовая" 
                      icon={<CalendarCheck2 className="w-4 h-4 stroke-[2.5px]" />}
                      checked={settings.showAnnual ?? true} 
                      onToggle={(val) => setSettings({...settings, showAnnual: val})} 
                      calcType={settings.annualCalcType || 'rub'}
                      onCalcTypeChange={(val) => setSettings({...settings, annualCalcType: val})}
                      options={[
                        { label: 'Сумма (₽)', value: 'rub' },
                        { label: '% оклада', value: 'percent' },
                        { label: '% годового', value: 'percent_annual' },
                        { label: 'Коэф.', value: 'coef' }
                      ]}
                    />
                    <PremiumAccordionItem 
                      label="Дополнительная" 
                      icon={<Plus className="w-4 h-4 stroke-[2.5px]" />}
                      checked={settings.showExtraAnnual ?? true} 
                      onToggle={(val) => setSettings({...settings, showExtraAnnual: val})} 
                      calcType={settings.extraAnnualCalcType || 'rub'}
                      onCalcTypeChange={(val) => setSettings({...settings, extraAnnualCalcType: val})}
                      options={[
                        { label: 'Сумма (₽)', value: 'rub' },
                        { label: '% оклада', value: 'percent' },
                        { label: '% годового', value: 'percent_annual' },
                        { label: 'Коэф.', value: 'coef' }
                      ]}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-4 sm:px-8 flex gap-3 justify-end border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xl z-20">
              <button type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none sm:w-auto py-3 sm:py-2.5 sm:px-6 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 sm:text-slate-500 sm:dark:text-slate-400 bg-white/50 dark:bg-slate-800/80 sm:bg-transparent sm:dark:bg-transparent hover:bg-white dark:hover:bg-slate-700 sm:hover:bg-slate-200/50 sm:dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 border border-slate-200 dark:border-slate-700/50 sm:border-transparent sm:dark:border-transparent shadow-sm sm:shadow-none"
              >
                Отмена
              </button>
              <button type="button"
                onClick={handleSave}
                className="flex-1 sm:flex-none sm:w-auto py-3 sm:py-2.5 sm:px-8 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide text-white bg-primary-600 hover:bg-primary-500 sm:hover:scale-[1.02] active:scale-95 rounded-xl transition-all shadow-lg shadow-primary-600/20"
              >
                <Save className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5px]" />
                Сохранить
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
