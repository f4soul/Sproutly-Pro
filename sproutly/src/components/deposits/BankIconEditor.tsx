import React, { useState, useRef } from 'react';
import { Bank } from '../../types';
import { DEFAULT_BANK_ICON } from '../../lib/banks';
import { Move, Maximize, RotateCcw, Upload, Grid } from 'lucide-react';

interface BankIconEditorProps {
  bank: Partial<Bank>;
  onChange: (updates: Partial<Bank>) => void;
}

export const BankIconEditor: React.FC<BankIconEditorProps> = ({ bank, onChange }) => {
  const [showGrid, setShowGrid] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateScale = (delta: number) => {
    const currentScale = bank.iconScale || 1;
    onChange({ iconScale: Math.max(0.1, Math.min(5, currentScale + delta)) });
  };

  const updateOffset = (x: number, y: number) => {
    onChange({
      iconOffsetX: (bank.iconOffsetX || 0) + x,
      iconOffsetY: (bank.iconOffsetY || 0) + y,
    });
  };

  const reset = () => {
    onChange({
      iconScale: 1,
      iconOffsetX: 0,
      iconOffsetY: 0,
    });
  };

  return (
    <div className="space-y-4 p-5 bg-[#F5F5F7] dark:bg-white/5 rounded-2xl border border-light-border dark:border-dark-border">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest">Редактор иконки</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${showGrid ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'text-light-text-secondary hover:bg-white dark:hover:bg-white/10'}`}
            title="Сетка"
          >
            <Grid size={16} />
          </button>
          <button
            type="button"
            onClick={reset}
            className="p-1.5 text-light-text-secondary hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Сбросить"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center">
        {/* Preview Area */}
        <div className="relative w-32 h-32 shrink-0 bg-white dark:bg-dark-card rounded-2xl border border-light-border dark:border-dark-border overflow-hidden flex items-center justify-center group shadow-sm">
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none opacity-10 dark:opacity-20 text-black dark:text-white">
              <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-px bg-current" />
                <div className="h-full w-px bg-current absolute" />
              </div>
            </div>
          )}
          
          <div 
            className="w-24 h-24 flex items-center justify-center transition-transform duration-200"
            style={{
              transform: `scale(${bank.iconScale || 1}) translate(${(bank.iconOffsetX || 0)}px, ${(bank.iconOffsetY || 0)}px)`
            }}
          >
            <img 
              src={bank.logoUrl || DEFAULT_BANK_ICON} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer backdrop-blur-[2px]"
          >
            <Upload size={24} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
          />
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col gap-4 w-full">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest flex items-center gap-1">
              <Maximize size={10} /> Масштаб
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => updateScale(-0.1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg text-light-text-primary dark:text-dark-text-primary hover:bg-[#F5F5F7] dark:hover:bg-white/5 transition-colors cursor-pointer">-</button>
              <input 
                type="range" 
                min="0.1" 
                max="3" 
                step="0.1" 
                value={bank.iconScale || 1} 
                onChange={(e) => onChange({ iconScale: parseFloat(e.target.value) })}
                className="flex-1 h-1 bg-light-border dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <button type="button" onClick={() => updateScale(0.1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg text-light-text-primary dark:text-dark-text-primary hover:bg-[#F5F5F7] dark:hover:bg-white/5 transition-colors cursor-pointer">+</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest flex items-center gap-1">
              <Move size={10} /> Позиция
            </label>
            <div className="flex justify-center">
              <div className="grid grid-cols-3 gap-1 w-24">
                <div />
                <button type="button" onClick={() => updateOffset(0, -2)} className="p-1 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded hover:bg-[#F5F5F7] dark:hover:bg-white/5 transition-colors cursor-pointer">↑</button>
                <div />
                <button type="button" onClick={() => updateOffset(-2, 0)} className="p-1 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded hover:bg-[#F5F5F7] dark:hover:bg-white/5 transition-colors cursor-pointer">←</button>
                <button type="button" onClick={() => onChange({ iconOffsetX: 0, iconOffsetY: 0 })} className="p-1 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors cursor-pointer">⊙</button>
                <button type="button" onClick={() => updateOffset(2, 0)} className="p-1 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded hover:bg-[#F5F5F7] dark:hover:bg-white/5 transition-colors cursor-pointer">→</button>
                <div />
                <button type="button" onClick={() => updateOffset(0, 2)} className="p-1 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded hover:bg-[#F5F5F7] dark:hover:bg-white/5 transition-colors cursor-pointer">↓</button>
                <div />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary italic text-center opacity-60">
        Рекомендуемый размер: 512x512px. Формат: PNG или SVG.
      </div>
    </div>
  );
};
