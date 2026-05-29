import React from 'react';
import { YearData } from '../../types';
import { CoefInput } from '../ui/CoefInput';
import { TableInput } from '../ui/TableInput';
import { Wand2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BonusConfigControlsProps {
  activeYearData: YearData;
  onBonusBaseChange: (value: number) => void;
  onQuarterCoefChange: (quarterIndex: number, value: number) => void;
  onAnnualCoefChange: (value: number) => void;
  onApplyBaseToAll?: () => void;
  compact?: boolean;
}

export function BonusConfigControls({
  activeYearData,
  onBonusBaseChange,
  onQuarterCoefChange,
  onAnnualCoefChange,
  onApplyBaseToAll,
  compact = false
}: BonusConfigControlsProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between w-full h-full gap-3 md:gap-4 overflow-x-auto custom-scrollbar no-scrollbar min-w-0">
        <div className="flex items-end gap-1 grow-0 shrink-0 min-w-0">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400 dark:text-slate-500 whitespace-nowrap">База</span>
            <div className="relative w-20">
              <TableInput
                value={activeYearData.bonusBase ?? 0}
                onChange={onBonusBaseChange}
                hideDecimals={true}
                className="w-full text-center text-[11px] md:text-[11px] lg:text-xs font-bold text-primary-700 dark:text-primary-400 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 h-7 md:h-8 px-1 pr-4 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] md:text-[10px] lg:text-[11px] pointer-events-none">₽</span>
            </div>
          </div>
          {onApplyBaseToAll && (
            <button
              onClick={onApplyBaseToAll}
              title="Применить базу ко всем месяцам"
              className="p-1 rounded-md hover:bg-primary-50 dark:hover:bg-primary-500/10 text-primary-400 hover:text-primary-600 transition-colors h-7 md:h-8 flex items-center justify-center shrink-0"
            >
              <Wand2 size={12} />
            </button>
          )}
        </div>

        <div className="flex gap-1 sm:gap-1.5 grow-0 shrink-0 justify-end ml-auto min-w-0">
          {[0, 1, 2, 3].map(qIndex => (
            <div key={qIndex} className="flex flex-col items-center gap-0.5 shrink-0">
              <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400 dark:text-slate-500 whitespace-nowrap">{qIndex + 1} КВ</span>
              <div className="w-8 sm:w-9 lg:w-10">
                <TableInput
                  value={activeYearData.quarters?.[qIndex]?.bonusCoef ?? 0}
                  onChange={(value) => onQuarterCoefChange(qIndex, value)}
                  className="w-full text-center text-[10px] sm:text-[11px] lg:text-xs font-bold text-primary-700 dark:text-primary-400 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 h-7 md:h-8 rounded-lg focus:ring-2 focus:ring-primary-500/50 p-0"
                />
              </div>
            </div>
          ))}
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <span className="text-[8px] font-black uppercase tracking-tighter text-primary-500 dark:text-primary-500 whitespace-nowrap">Год</span>
            <div className="w-8 sm:w-9 lg:w-10">
              <TableInput
                value={activeYearData.annualBonusCoef ?? 0}
                onChange={onAnnualCoefChange}
                className="w-full text-center text-[10px] sm:text-[11px] lg:text-xs font-bold text-primary-700 dark:text-primary-400 bg-white dark:bg-slate-950 border border-primary-300 dark:border-primary-700/50 h-7 md:h-8 rounded-lg focus:ring-2 focus:ring-primary-500/50 p-0"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-6">
        <div className="flex items-end gap-2">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400 dark:text-slate-500">База</span>
            <div className="relative w-24 md:w-32">
              <TableInput
                value={activeYearData.bonusBase ?? 0}
                onChange={onBonusBaseChange}
                hideDecimals={true}
                className="w-full text-center text-xs pr-6"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">₽</span>
            </div>
          </div>
          {onApplyBaseToAll && (
            <button
              onClick={onApplyBaseToAll}
              title="Применить базу ко всем месяцам"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-all text-[10px] font-bold uppercase tracking-wider h-[30px] shrink-0"
            >
              <Wand2 size={12} />
              <span className="hidden sm:inline">Применить к месяцам</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 overflow-x-auto custom-scrollbar pb-1">
        <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden sm:inline">Премии (КФ):</span>
        <div className="flex gap-1 md:gap-2">
          {[0, 1, 2, 3].map(qIndex => (
            <div key={qIndex} className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] text-slate-400 uppercase font-black tracking-tighter">{qIndex + 1} КВ</span>
              <div className="flex items-center">
                <CoefInput
                  value={activeYearData.quarters?.[qIndex]?.bonusCoef ?? 0}
                  onChange={(value) => onQuarterCoefChange(qIndex, value)}
                  className="w-8 md:w-10 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded outline-none font-mono text-center text-[10px] p-0.5 transition-all"
                />
              </div>
            </div>
          ))}
          <div className="flex flex-col items-center gap-0.5 ml-1">
            <span className="text-[8px] text-primary-500 uppercase font-black tracking-tighter">Год</span>
            <div className="flex items-center">
              <CoefInput
                value={activeYearData.annualBonusCoef ?? 0}
                onChange={onAnnualCoefChange}
                className="w-8 md:w-10 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded outline-none font-mono text-center text-[10px] p-0.5 transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
