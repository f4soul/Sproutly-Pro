import React from 'react';
import { YearData } from '../types';
import { CoefInput } from './CoefInput';
import { TableInput } from './TableInput';

interface BonusConfigControlsProps {
  activeYearData: YearData;
  onBonusBaseChange: (value: number) => void;
  onQuarterCoefChange: (quarterIndex: number, value: number) => void;
  onAnnualCoefChange: (value: number) => void;
  compact?: boolean;
}

export function BonusConfigControls({
  activeYearData,
  onBonusBaseChange,
  onQuarterCoefChange,
  onAnnualCoefChange,
  compact = false
}: BonusConfigControlsProps) {
  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">База:</span>
          <div className="relative w-32">
            <TableInput
              value={activeYearData.bonusBase ?? 0}
              onChange={onBonusBaseChange}
              hideDecimals={true}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 pr-6 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-right text-sm transition-all shadow-sm"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₽</span>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/50 pt-4">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-3">Премии (КФ):</span>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3].map(qIndex => (
              <div key={qIndex} className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">{qIndex + 1} КВ</span>
                <div className="w-full flex items-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                  <CoefInput
                    value={activeYearData.quarters?.[qIndex]?.bonusCoef ?? 0}
                    onChange={(value) => onQuarterCoefChange(qIndex, value)}
                    className="w-full bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-xs p-0"
                  />
                </div>
              </div>
            ))}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-indigo-500 uppercase font-black tracking-tighter">Год</span>
              <div className="w-full flex items-center bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-lg p-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                <CoefInput
                  value={activeYearData.annualBonusCoef ?? 0}
                  onChange={onAnnualCoefChange}
                  className="w-full bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-xs p-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">База:</span>
        <div className="relative w-18 md:w-24">
          <TableInput
            value={activeYearData.bonusBase ?? 0}
            onChange={onBonusBaseChange}
            hideDecimals={true}
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 pr-6 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-center text-xs transition-all shadow-sm"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">₽</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 overflow-x-auto custom-scrollbar pb-1">
        <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden sm:inline">Премии (КФ):</span>
        <div className="flex gap-1 md:gap-2">
          {[0, 1, 2, 3].map(qIndex => (
            <div key={qIndex} className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] text-slate-400 uppercase font-black tracking-tighter">{qIndex + 1} КВ</span>
              <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-1 py-0.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                <CoefInput
                  value={activeYearData.quarters?.[qIndex]?.bonusCoef ?? 0}
                  onChange={(value) => onQuarterCoefChange(qIndex, value)}
                  className="w-8 md:w-10 bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-[10px] p-0"
                />
              </div>
            </div>
          ))}
          <div className="flex flex-col items-center gap-0.5 ml-1">
            <span className="text-[8px] text-indigo-500 uppercase font-black tracking-tighter">Год</span>
            <div className="flex items-center bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-md px-1 py-0.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
              <CoefInput
                value={activeYearData.annualBonusCoef ?? 0}
                onChange={onAnnualCoefChange}
                className="w-8 md:w-10 bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-[10px] p-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
