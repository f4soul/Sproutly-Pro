import React, { useState, useId, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { X, Save, Plus, Trash2, GripVertical, Columns } from 'lucide-react';
import { IncomeColumnDef } from '../../types';
import { cn } from '../../lib/utils';

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

interface SortableColumnProps {
  col: IncomeColumnDef;
  onUpdate: (id: string, updates: Partial<IncomeColumnDef>) => void;
  onRemove: (id: string) => void;
}

function SortableColumn({ col, onUpdate, onRemove }: SortableColumnProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item 
      value={col}
      dragListener={false}
      dragControls={controls}
      className="group flex gap-2 sm:gap-3 items-end bg-white/60 dark:bg-[#111315]/60 backdrop-blur-md border border-slate-200 dark:border-white/[0.05] rounded-[1.25rem] p-3 sm:p-4 transition-colors hover:border-primary-500/30 touch-none w-full max-w-full overflow-hidden"
    >
      <div 
        onPointerDown={(e) => {
          e.preventDefault();
          controls.start(e);
        }}
        className="text-slate-400 cursor-grab px-0.5 sm:px-1 active:cursor-grabbing hover:text-slate-600 dark:hover:text-slate-300 pb-[9px] lg:pb-[10px] shrink-0 select-none touch-none"
      >
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

      <button type="button" 
        onClick={() => onRemove(col.id)}
        className="w-[38px] lg:w-[40px] h-[38px] lg:h-[40px] text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors shrink-0 flex items-center justify-center"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </Reorder.Item>
  );
}

interface IncomeColumnsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  columns: IncomeColumnDef[];
  onSave: (columns: IncomeColumnDef[]) => void;
}

export function IncomeColumnsDialog({ isOpen, onClose, columns: initialColumns, onSave }: IncomeColumnsDialogProps) {
  const [columns, setColumns] = useState<IncomeColumnDef[]>(initialColumns);

  useEffect(() => {
    if (isOpen) {
      setColumns(initialColumns);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialColumns]);

  const handleAdd = () => {
    setColumns([...columns, {
      id: 'col_' + Date.now(),
      name: 'Бонус',
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
    onSave(columns);
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
            
            {/* Header */}
            <div className="px-6 py-5 sm:px-8 sm:py-6 shrink-0 border-b border-slate-200/50 dark:border-slate-800/50 relative z-10 flex justify-between items-center">
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Столбцы</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium">Пользовательские столбцы</p>
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
              <div className="px-6 py-5 sm:px-8 sm:py-6 space-y-4">
                
                {columns.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 bg-white/40 dark:bg-slate-900/30 rounded-[1.5rem] border border-dashed border-slate-300 dark:border-white/[0.05] font-medium text-sm">
                    Нет добавленных столбцов
                  </div>
                ) : (
                  <Reorder.Group 
                    axis="y" 
                    values={columns} 
                    onReorder={setColumns} 
                    className="space-y-3 pb-2"
                  >
                    {columns.map((col) => (
                      <SortableColumn 
                        key={col.id} 
                        col={col} 
                        onUpdate={handleUpdate} 
                        onRemove={handleRemove} 
                      />
                    ))}
                  </Reorder.Group>
                )}
                
                <button type="button"
                  onClick={handleAdd}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-300 dark:border-white/[0.05] bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-500 dark:hover:border-primary-500/50 active:bg-primary-500/5 transition-all font-bold text-sm uppercase tracking-widest"
                >
                  <Plus className="w-4 h-4 stroke-[3px]" />
                  Добавить столбец
                </button>

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
