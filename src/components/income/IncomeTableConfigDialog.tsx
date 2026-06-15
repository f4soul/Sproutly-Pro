import React, { useState, Fragment, useId } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Save, GripVertical, Columns, CalendarDays, CalendarCheck2, Cog } from 'lucide-react';
import { IncomeColumnDef } from '../../types';
import { cn } from '../../lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableInput } from '../ui/TableInput';

export interface IncomeTableSettings {
  showQuarterly?: boolean;
  showAnnual?: boolean;
  showMonthly?: boolean;
  showExtraAnnual?: boolean;
  annualCalcType?: 'rub' | 'percent' | 'coef';
  extraAnnualCalcType?: 'rub' | 'percent' | 'coef';
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
          <button
            key={opt.value}
            onClick={(e) => { e.preventDefault(); onChange(opt.value); }}
            className={cn(
              "relative flex-1 flex items-center justify-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider py-1.5 px-1 sm:px-2 rounded-lg transition-colors duration-200 z-20 outline-none leading-none text-center",
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
  label, icon, checked, onToggle, calcType, onCalcTypeChange
}: {
  label: string; icon: React.ReactNode; checked: boolean; onToggle: (val: boolean) => void;
  calcType: 'rub' | 'percent' | 'coef'; onCalcTypeChange: (val: 'rub' | 'percent' | 'coef') => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn(
      "border transition-all duration-300 rounded-2xl overflow-hidden group",
      checked 
        ? "border-primary-500/30 bg-primary-500/5 dark:bg-primary-500/10 shadow-[0_2px_8px_rgba(16,185,129,0.05)]" 
        : "border-slate-200 dark:border-white/[0.05] bg-white/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-white/[0.1]"
    )}>
      <div 
        className="flex items-center justify-between p-2.5 sm:p-3 cursor-pointer select-none relative"
        onClick={() => {
           if (checked) {
              setIsExpanded(!isExpanded);
           } else {
              onToggle(true);
              setIsExpanded(true);
           }
        }}
      >
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); onToggle(!checked); if (checked) setIsExpanded(false); }}
            className={cn(
              "w-5 h-5 ml-1 rounded-[6px] border-2 transition-colors flex items-center justify-center shadow-sm shrink-0",
              checked ? "bg-primary-500 border-primary-500" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            )}
           >
            <AnimatePresence>
              {checked && (
                 <motion.svg 
                   initial={{ scale: 0 }}
                   animate={{ scale: 1 }}
                   exit={{ scale: 0 }}
                   className="w-3.5 h-3.5 text-white" 
                   fill="none" 
                   viewBox="0 0 24 24" 
                   stroke="currentColor"
                 >
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                 </motion.svg>
              )}
            </AnimatePresence>
          </button>
          <div className="flex items-center gap-2.5">
             <div className={cn(
               "w-8 h-8 rounded-xl flex items-center justify-center transition-colors shadow-sm",
               checked ? "bg-primary-500/20 text-primary-600 dark:text-primary-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
             )}>
               {icon}
             </div>
             <div className="flex flex-col">
               <span className={cn("font-bold text-[13px] tracking-wide uppercase leading-tight", checked ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>
                 {label}
               </span>
               {checked && (
                 <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {calcType === 'rub' ? 'Сумма (₽)' : calcType === 'percent' ? '% от Оклада' : 'Коэфф'}
                 </span>
               )}
             </div>
          </div>
        </div>
        
        {checked && (
          <div className={cn("text-slate-400 transition-transform duration-300 mr-2", isExpanded ? "rotate-180" : "")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        )}
      </div>
      
      <AnimatePresence>
        {checked && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1">
              <div className="p-2 sm:p-3 bg-white/80 dark:bg-slate-950/60 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm ml-8">
                <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-2 px-1">Тип расчета</label>
                <div className="h-[34px] sm:h-[38px]">
                  <SegmentedControl 
                    options={[
                      { label: 'Сумма (₽)', value: 'rub' },
                      { label: '% от оклада', value: 'percent' },
                      { label: 'Коэфф', value: 'coef' }
                    ]}
                    value={calcType}
                    onChange={onCalcTypeChange}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  columns: IncomeColumnDef[];
  settings?: IncomeTableSettings;
  baseSalary: number;
  onSave: (columns: IncomeColumnDef[], settings: IncomeTableSettings, baseSalary: number, applyBaseToAll: boolean) => void;
}

interface SortableColumnProps {
  col: IncomeColumnDef;
  onUpdate: (id: string, updates: Partial<IncomeColumnDef>) => void;
  onRemove: (id: string) => void;
}

function SortableColumn({ col, onUpdate, onRemove }: SortableColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group flex gap-2 sm:gap-3 items-end bg-white/60 dark:bg-[#111315]/60 backdrop-blur-md border ${isDragging ? 'border-primary-500 shadow-xl' : 'border-slate-200 dark:border-white/[0.05]'} rounded-[1.25rem] p-3 sm:p-4 transition-colors hover:border-primary-500/30 touch-none w-full max-w-full overflow-hidden`}
    >
      <div {...attributes} {...listeners} className="text-slate-400 cursor-grab px-0.5 sm:px-1 active:cursor-grabbing hover:text-slate-600 dark:hover:text-slate-300 pb-[9px] lg:pb-[10px] shrink-0">
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 flex flex-col sm:flex-row gap-3 min-w-0">
        <div className="flex-[3] min-w-0">
          <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5 ml-1 truncate">Название</label>
          <input 
            value={col.name}
            onChange={e => onUpdate(col.id, { name: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 h-[38px] lg:h-[40px] text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
            placeholder="Столбец"
          />
        </div>
        
        <div className="flex-[4] min-w-0">
          <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5 ml-1 truncate">Тип расчета</label>
          <div className="h-[38px] lg:h-[40px]">
            <SegmentedControl 
              options={[
                { label: 'Сумма (₽)', value: 'rub' },
                { label: '% от оклада', value: 'percent_base' }
              ]}
              value={col.type as 'rub' | 'percent_base'}
              onChange={(val) => onUpdate(col.id, { type: val })}
            />
          </div>
        </div>
      </div>

      <button 
        onClick={() => onRemove(col.id)}
        className="w-[38px] lg:w-[40px] h-[38px] lg:h-[40px] text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors shrink-0 flex items-center justify-center"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}

export function IncomeTableConfigDialog({ isOpen, onClose, columns: initialColumns, settings: initialSettings, baseSalary: initialBaseSalary, onSave }: Props) {
  const [columns, setColumns] = useState<IncomeColumnDef[]>(initialColumns);
  const [settings, setSettings] = useState<IncomeTableSettings>(initialSettings || { showQuarterly: true, showAnnual: true });
  const [baseSalary, setBaseSalary] = useState(initialBaseSalary);
  const [applyBaseToAll, setApplyBaseToAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'columns'>('main');

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab('main');
    }
  }, [isOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAdd = () => {
    setColumns([...columns, {
      id: 'col_' + Date.now(),
      name: 'Новый столбец',
      type: 'rub',
      group: 'other'
    }]);
  };

  const handleRemove = (id: string) => {
    setColumns(columns.filter(c => c.id !== id));
  };

  const handleUpdate = (id: string, updates: Partial<IncomeColumnDef>) => {
    setColumns(columns.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleSave = () => {
    onSave(columns, settings, baseSalary, applyBaseToAll);
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
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm pointer-events-auto"
            aria-hidden="true"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl w-full max-w-[420px] lg:max-w-[460px] rounded-t-[32px] sm:rounded-[2.5rem] shadow-[0_24px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-white/[0.08] flex flex-col max-h-[94dvh] sm:max-h-[85vh] pointer-events-auto overflow-hidden"
          >
                {/* Decorative Ambient Lighting */}
                <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-primary-500/20 dark:bg-primary-500/10 blur-[80px] rounded-full mt-4 ml-4 mix-blend-screen pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-48 h-48 bg-deposit-500/20 dark:bg-deposit-500/10 blur-[80px] rounded-full pointer-events-none" />

                {/* Header */}
                <div className="px-5 sm:px-6 top-0 bg-transparent z-20 pt-6 pb-3 shrink-0 relative">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Настройки</h2>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium">Сконфигурируйте премии под себя</p>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 sm:p-2.5 bg-white/60 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shrink-0 shadow-sm border border-slate-200/50 dark:border-white/[0.05] -mt-2 -mr-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

            {/* Tabs */}
            <div className="flex items-center bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl gap-1 w-full p-1 border border-slate-200/50 dark:border-white/[0.05]">
              <button 
                onClick={() => setActiveTab('main')}
                className={cn(
                  "flex-1 relative flex items-center justify-center gap-2 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold rounded-[10px] transition-all h-6 sm:h-7 z-10 outline-none",
                  activeTab === 'main'
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 dark:hover:bg-white/5"
                )}
              >
                <span className="relative z-20 flex items-center gap-2">
                  <Cog size={14} className={cn("transition-colors", activeTab === 'main' ? "opacity-100" : "opacity-60")} />
                  <span className="uppercase tracking-widest truncate">Системные</span>
                </span>
                {activeTab === 'main' && (
                  <motion.div 
                    layoutId="modal-tab-indicator"
                    className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl z-10 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('columns')}
                className={cn(
                  "flex-1 relative flex items-center justify-center gap-2 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold rounded-[10px] transition-all h-6 sm:h-7 z-10 outline-none",
                  activeTab === 'columns'
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 dark:hover:bg-white/5"
                )}
              >
                <span className="relative z-20 flex items-center gap-2">
                  <Columns size={14} className={cn("transition-colors", activeTab === 'columns' ? "opacity-100" : "opacity-60")} />
                  <span className="uppercase tracking-widest truncate">Доп. столбцы</span>
                </span>
                {activeTab === 'columns' && (
                  <motion.div 
                    layoutId="modal-tab-indicator"
                    className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl z-10 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="relative w-full flex-1 shrink min-h-[300px] sm:min-h-[400px] h-[78vh] sm:h-[60vh] max-h-[720px] sm:max-h-[600px] overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'main' && (
                <motion.div
                  key="tab-main"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute inset-0 overflow-y-auto px-5 sm:px-6 py-1 sm:py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                  <div className="space-y-4">
                    <div className="p-3 sm:p-4 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl sm:rounded-[1.5rem] border border-slate-200/60 dark:border-white/[0.05] shadow-sm flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Базовый оклад</label>
                          <div className="text-[11px] text-slate-400 mt-0.5">Применяется для расчетов премий</div>
                        </div>
                        <TableInput
                          value={baseSalary}
                          onChange={setBaseSalary}
                          className="w-full sm:w-[140px] bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2 text-sm sm:text-base outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-mono font-bold shadow-inner text-right"
                        />
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer group bg-slate-50/50 dark:bg-slate-950/30 p-2.5 sm:p-3 rounded-xl border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/50 transition-colors mt-1">
                        <div className="relative flex items-center justify-center shrink-0">
                          <input 
                            type="checkbox" 
                            checked={applyBaseToAll}
                            onChange={(e) => setApplyBaseToAll(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="w-5 h-5 rounded-[6px] border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-primary-500 peer-checked:border-primary-500 transition-colors flex items-center justify-center shadow-sm bg-white dark:bg-slate-800 peer-checked:dark:bg-primary-500">
                             <motion.svg 
                                initial={{ scale: 0 }}
                                animate={{ scale: applyBaseToAll ? 1 : 0 }}
                                className="w-3.5 h-3.5 text-white" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor" 
                                strokeWidth={3.5}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </motion.svg>
                          </div>
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-tight">
                          Заменить оклад во всех месяцах
                        </span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest ml-1">Видимость системных премий</h3>
                      </div>
                      
                      <div className="flex flex-col gap-2">
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
                        />
                        <PremiumAccordionItem 
                          label="Дополнительная" 
                          icon={<Plus className="w-4 h-4 stroke-[2.5px]" />}
                          checked={settings.showExtraAnnual ?? true} 
                          onToggle={(val) => setSettings({...settings, showExtraAnnual: val})} 
                          calcType={settings.extraAnnualCalcType || 'rub'}
                          onCalcTypeChange={(val) => setSettings({...settings, extraAnnualCalcType: val})}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'columns' && (
                <motion.div
                  key="tab-columns"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute inset-0 overflow-y-auto px-5 sm:px-6 py-5 sm:py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                  <div className="space-y-4">
                    <div className="mb-2 ml-1">
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Пользовательские столбцы</h3>
                      <p className="text-[11px] font-medium text-slate-500 mt-1">Добавьте столбцы, которые расширяют возможности основной таблицы по каждому месяцу.</p>
                    </div>
                    {columns.length === 0 ? (
                      <div className="text-center py-10 text-slate-500 bg-white/40 dark:bg-slate-900/30 rounded-[1.5rem] border border-dashed border-slate-300 dark:border-white/[0.05] font-medium text-sm">
                        Нет добавленных столбцов
                      </div>
                    ) : (
                      <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext 
                          items={columns.map(c => c.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3 pb-2">
                            {columns.map((col) => (
                              <SortableColumn 
                                key={col.id} 
                                col={col} 
                                onUpdate={handleUpdate} 
                                onRemove={handleRemove} 
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                    
                    <button
                      onClick={handleAdd}
                      className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-300 dark:border-white/[0.05] bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-500 dark:hover:border-primary-500/50 active:bg-primary-500/5 transition-all font-bold text-sm uppercase tracking-widest"
                    >
                      <Plus className="w-4 h-4 stroke-[3px]" />
                      Добавить столбец
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 pt-4 pb-6 sm:pb-4 border-t border-slate-200/50 dark:border-white/[0.05] bg-white/40 dark:bg-slate-950/40 backdrop-blur-3xl flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 sm:rounded-b-[2.5rem] relative">
            <button
              onClick={onClose}
              className="px-5 py-3 sm:py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors w-full sm:w-auto"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wide text-white bg-primary-600 hover:bg-primary-500 hover:scale-[1.02] active:scale-95 rounded-xl transition-all shadow-lg shadow-primary-600/20 w-full sm:w-auto"
            >
              <Save className="w-4 h-4" />
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
