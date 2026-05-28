import React, { useState, useRef } from 'react';
import { Bank } from '../../types';
import { DEFAULT_BANK_ICON } from '../../lib/banks';
import { Maximize, Upload, Focus } from 'lucide-react';
import { BankLogo } from './BankLogo';

interface BankIconEditorProps {
  bank: Partial<Bank>;
  onChange: (updates: Partial<Bank>) => void;
}

export const BankIconEditor: React.FC<BankIconEditorProps> = ({ bank, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startOffset, setStartOffset] = useState({ x: 0, y: 0 });

  const extractColorFromDataUrl = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 40;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('#0d9488'); // fallback to deposit-600 (teal-600)
            return;
          }
          ctx.drawImage(img, 0, 0, size, size);
          const imageData = ctx.getImageData(0, 0, size, size);
          const pixels = imageData.data;
          
          let bestColor = null;
          let maxSaturation = -1;
          
          let totalR = 0, totalG = 0, totalB = 0, visibleCount = 0;
          
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i+1];
            const b = pixels[i+2];
            const a = pixels[i+3];
            
            if (a < 150) continue; // skip transparent
            
            totalR += r;
            totalG += g;
            totalB += b;
            visibleCount++;
            
            const maxVal = Math.max(r, g, b);
            const minVal = Math.min(r, g, b);
            const chroma = maxVal - minVal; // saturation/vibrancy measure
            
            const isGrey = chroma < 30;
            const isTooDark = (r + g + b) < 60;
            const isTooLight = (r + g + b) > 720;
            
            if (!isGrey && !isTooDark && !isTooLight) {
              if (chroma > maxSaturation) {
                maxSaturation = chroma;
                bestColor = { r, g, b };
              }
            }
          }
          
          if (bestColor) {
            const rgbToHex = (r: number, g: number, b: number) => 
               "#" + [r, g, b].map(x => {
                 const hex = x.toString(16);
                 return hex.length === 1 ? "0" + hex : hex;
               }).join("");
            resolve(rgbToHex(bestColor.r, bestColor.g, bestColor.b));
          } else if (visibleCount > 0) {
            const avgR = Math.round(totalR / visibleCount);
            const avgG = Math.round(totalG / visibleCount);
            const avgB = Math.round(totalB / visibleCount);
            const rgbToHex = (r: number, g: number, b: number) => 
               "#" + [r, g, b].map(x => {
                 const hex = x.toString(16);
                 return hex.length === 1 ? "0" + hex : hex;
               }).join("");
            resolve(rgbToHex(avgR, avgG, avgB));
          } else {
            resolve('#0d9488');
          }
        } catch (e) {
          console.error("Error extracting color from image:", e);
          resolve('#0d9488');
        }
      };
      img.onerror = () => {
        resolve('#0d9488');
      };
      img.src = dataUrl;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const logoUrl = reader.result as string;
          const extractedColor = await extractColorFromDataUrl(logoUrl);
          onChange({ logoUrl, color: extractedColor, iconScale: 1, iconOffsetX: 0, iconOffsetY: 0 });
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = async () => {
             const canvas = document.createElement('canvas');
             const MAX_SIZE = 256;
             let width = img.width;
             let height = img.height;
             
             if (width > height) {
               if (width > MAX_SIZE) {
                 height *= MAX_SIZE / width;
                 width = MAX_SIZE;
               }
             } else {
               if (height > MAX_SIZE) {
                 width *= MAX_SIZE / height;
                 height = MAX_SIZE;
               }
             }
             canvas.width = width;
             canvas.height = height;
             const ctx = canvas.getContext('2d');
             if (ctx) {
               ctx.drawImage(img, 0, 0, width, height);
               const dataUrl = canvas.toDataURL('image/webp', 0.8);
               const extractedColor = await extractColorFromDataUrl(dataUrl);
               onChange({ logoUrl: dataUrl, color: extractedColor, iconScale: 1, iconOffsetX: 0, iconOffsetY: 0 });
             }
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setStartOffset({ x: bank.iconOffsetX || 0, y: bank.iconOffsetY || 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const scale = bank.iconScale || 1;
    onChange({
      iconOffsetX: startOffset.x + dx / scale,
      iconOffsetY: startOffset.y + dy / scale,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const center = () => {
    onChange({
      iconOffsetX: 0,
      iconOffsetY: 0,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full">
      {/* Remove previous header layout to keep it clean like the 3rd screenshot. Focus on editor. */}
      
      <div className="flex flex-col gap-4 items-center w-full">
        {/* Preview Area / Cropper Canvas */}
        <div 
          className="relative w-full h-48 md:h-56 bg-slate-50 dark:bg-[#0c101a] rounded-2xl md:rounded-[2rem] overflow-hidden flex items-center justify-center cursor-move border border-slate-200/50 dark:border-white/[0.04] shadow-inner group"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div 
            className="w-28 h-28 md:w-32 md:h-32 flex items-center justify-center transition-none relative z-10 select-none pointer-events-none"
            style={{
              transform: `scale(${bank.iconScale || 1}) translate(${(bank.iconOffsetX || 0)}px, ${(bank.iconOffsetY || 0)}px)`
            }}
          >
            <BankLogo 
              logoUrl={bank.logoUrl || DEFAULT_BANK_ICON} 
              alt="Preview" 
              className="max-w-full max-h-full w-28 h-28 md:w-32 md:h-32 object-contain select-none pointer-events-none drop-shadow-sm text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Grid overlay fixed in center */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
            <div className="w-28 h-28 md:w-32 md:h-32 border border-white/20 relative mix-blend-difference select-none">
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 select-none">
                <div className="border-b border-r border-white/20" />
                <div className="border-b border-r border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-b border-r border-white/20" />
                <div className="border-b border-r border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>
            </div>
          </div>

          <button 
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { 
               e.preventDefault(); 
               e.stopPropagation(); 
               if (fileInputRef.current) {
                 fileInputRef.current.click();
               }
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-[12px] bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-sm border border-white/10 z-30 active:scale-95 transition-all"
            title="Загрузить новое изображение"
          >
             <Upload size={14} strokeWidth={2.5} />
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
          />
        </div>

        {/* Controls Layout */}
        <div className="w-full space-y-4 px-1 pb-2">
          <div className="flex items-center gap-4 w-full">
            <label className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 font-medium shrink-0">
              Масштаб
            </label>
            <input 
              type="range" 
              min="0.1" 
              max="5" 
              step="0.05"
              value={bank.iconScale || 1} 
              onChange={(e) => onChange({ iconScale: parseFloat(e.target.value) })}
              className="flex-1 min-w-0 h-1 bg-slate-200 dark:bg-slate-700 appearance-none cursor-pointer accent-primary-500 outline-none rounded-full"
            />
          </div>

          <button 
            type="button" 
            onClick={center} 
            className="w-full py-2.5 bg-slate-100 dark:bg-[#1a2133] hover:bg-slate-200 dark:hover:bg-[#1f273d] text-primary-600 dark:text-primary-400 font-medium text-sm rounded-xl transition-colors active:scale-[0.98] border border-transparent dark:border-white/[0.04]"
          >
            Центрировать
          </button>
        </div>
      </div>
      
      <div className="flex justify-center pt-2">
         <span className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center opacity-60">Рекомендуемый размер: 512x512px. Формат: PNG или SVG.</span>
      </div>
    </div>
  );
};

