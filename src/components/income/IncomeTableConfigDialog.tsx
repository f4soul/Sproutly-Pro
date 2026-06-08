import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { IncomeColumnDef } from '../../types';
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  columns: IncomeColumnDef[];
  onSave: (columns: IncomeColumnDef[]) => void;
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
      className={`group flex gap-3 items-center bg-slate-50 dark:bg-slate-800/40 border ${isDragging ? 'border-primary-500 shadow-lg' : 'border-slate-200 dark:border-slate-700/50'} rounded-2xl p-3 transition-colors hover:border-primary-500/30 touch-none`}
    >
      <div {...attributes} {...listeners} className="text-slate-400 cursor-grab px-1 active:cursor-grabbing hover:text-slate-600 dark:hover:text-slate-300">
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Название</label>
          <input 
            value={col.name}
            onChange={e => onUpdate(col.id, { name: e.target.value })}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
            placeholder="Например, Северная надбавка"
          />
        </div>
        
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Тип расчета</label>
          <select
            value={col.type}
            onChange={e => onUpdate(col.id, { type: e.target.value as any })}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium cursor-pointer"
          >
            <option value="rub">Сумма (₽)</option>
            <option value="percent_base">% от Оклада</option>
          </select>
        </div>
      </div>

      <button 
        onClick={() => onRemove(col.id)}
        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors ml-1"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}

export function IncomeTableConfigDialog({ isOpen, onClose, columns: initialColumns, onSave }: Props) {
  const [columns, setColumns] = useState<IncomeColumnDef[]>(initialColumns);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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
    onSave(columns);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
           onClick={onClose}
        />
        
        <motion.div
           initial={{ opacity: 0, scale: 0.95, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: 20 }}
           className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Структура доходов</h2>
              <p className="text-sm text-slate-500 mt-1">Определите, какие столбцы вам нужны для расчетов</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {columns.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Нет добавленных столбцов. Базовый оклад включен по умолчанию.
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
                  <div className="space-y-3">
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
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 hover:text-primary-500 hover:border-primary-500 hover:bg-primary-500/5 transition-all font-semibold"
            >
              <Plus className="w-5 h-5" />
              Добавить столбец
            </button>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/20 flex justify-end gap-3 rounded-b-[2rem]">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-lg shadow-primary-500/20"
            >
              <Save className="w-4 h-4" />
              Сохранить
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
