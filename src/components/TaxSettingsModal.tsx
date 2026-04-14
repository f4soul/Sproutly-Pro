import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Settings, X, Trash2, Plus, Download, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { TableInput } from './TableInput';
import { TaxBracket } from '../types';
import { DEFAULT_TAX_BRACKETS } from '../lib/constants';

export const TaxSettingsModal = ({ 
  isOpen, 
  onClose, 
  taxBrackets, 
  onSave,
  onExport,
  onImport
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  taxBrackets: Record<number, TaxBracket[]>;
  onSave: (newBrackets: Record<number, TaxBracket[]>) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const [localBrackets, setLocalBrackets] = useState(taxBrackets);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalBrackets(taxBrackets);
  }, [taxBrackets, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBrackets = localBrackets[selectedYear] || localBrackets[2025] || DEFAULT_TAX_BRACKETS[2025];

  const handleBracketChange = (index: number, field: 'limit' | 'rate' | 'label', value: any) => {
    const newBrackets = [...currentBrackets];
    newBrackets[index] = { ...newBrackets[index], [field]: value };
    setLocalBrackets({ ...localBrackets, [selectedYear]: newBrackets });
  };

  const addBracket = () => {
    const newBrackets = [...currentBrackets, { limit: Infinity, rate: 0.13, label: 'Новая ступень' }];
    // Ensure only the last one has Infinity
    if (newBrackets.length > 1 && newBrackets[newBrackets.length - 2].limit === Infinity) {
      newBrackets[newBrackets.length - 2].limit = 5000000;
    }
    setLocalBrackets({ ...localBrackets, [selectedYear]: newBrackets });
  };

  const removeBracket = (index: number) => {
    if (currentBrackets.length <= 1) return;
    const newBrackets = currentBrackets.filter((_, i) => i !== index);
    if (index === currentBrackets.length - 1) {
      newBrackets[newBrackets.length - 1].limit = Infinity;
    }
    setLocalBrackets({ ...localBrackets, [selectedYear]: newBrackets });
  };

  const availableYears = Array.from(new Set([...Object.keys(localBrackets).map(Number), 2024, 2025, 2026, 2027])).sort((a, b) => a - b);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <Settings size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold">Настройки и Данные</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full flex-1">
          <div className="mb-6">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Настройки ставок НДФЛ</h4>
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Выберите год:</label>
              <div className="flex flex-wrap gap-2">
                {availableYears.map(year => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                      selectedYear === year 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-1 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 sm:px-2">
                <div className="col-span-4">Название</div>
                <div className="col-span-4">Лимит (₽)</div>
                <div className="col-span-3">Ставка (%)</div>
                <div className="col-span-1"></div>
              </div>
              
              {currentBrackets.map((bracket, index) => (
                <div key={index} className="grid grid-cols-12 gap-1 sm:gap-2 items-center bg-gray-50 dark:bg-gray-900/50 p-1.5 sm:p-2 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="col-span-4">
                    <input 
                      type="text" 
                      value={bracket.label ?? ''} 
                      onChange={(e) => handleBracketChange(index, 'label', e.target.value)}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl px-1.5 py-1 sm:px-2 sm:py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none"
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
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl px-1.5 py-1 sm:px-2 sm:py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono text-left"
                      />
                    )}
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <input 
                        type="number" 
                        value={bracket.rate != null ? Math.round(bracket.rate * 100) : ''} 
                        onChange={(e) => handleBracketChange(index, 'rate', (parseFloat(e.target.value) || 0) / 100)}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl px-1.5 py-1 sm:px-2 sm:py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono pr-4 sm:pr-6"
                      />
                      <span className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] sm:text-xs">%</span>
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button 
                      onClick={() => removeBracket(index)}
                      disabled={currentBrackets.length <= 1}
                      className="p-1 sm:p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg sm:rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={addBracket}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 cursor-pointer uppercase tracking-wider"
              >
                <Plus size={14} /> Добавить ступень
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Download size={14} /> Экспорт
                </h4>
                <p className="text-[10px] text-gray-500">Сохранить в JSON</p>
              </div>
              <button 
                onClick={onExport}
                className="py-1.5 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Скачать
              </button>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Upload size={14} /> Импорт
                </h4>
                <p className="text-[10px] text-gray-500">Загрузить JSON</p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="py-1.5 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Выбрать
              </button>
              <input type="file" ref={fileInputRef} onChange={onImport} accept=".json" className="hidden" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
          <button 
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-xl transition-colors cursor-pointer text-sm"
          >
            Закрыть
          </button>
          <button 
            onClick={() => {
              onSave(localBrackets);
              onClose();
            }}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 transition-colors cursor-pointer text-sm"
          >
            Сохранить
          </button>
        </div>
      </motion.div>
    </div>
  );
};
