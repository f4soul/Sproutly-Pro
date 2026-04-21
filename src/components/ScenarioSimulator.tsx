import React from 'react';
import { RotateCcw, Zap, TrendingUp, DollarSign, Gift, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { SimulationState } from '../types';
import { cn, formatCurrency } from '../lib/utils';

interface ScenarioSimulatorProps {
  simulation: SimulationState;
  onUpdate: (simulation: SimulationState) => void;
}

export function ScenarioSimulator({ simulation, onUpdate }: ScenarioSimulatorProps) {
  const reset = () => {
    onUpdate({
      isActive: false,
      salaryIncrease: 0,
      bonusMultiplier: 1,
      extraIncome: 0
    });
  };

  return (
    <div className={cn(
      "rounded-2xl p-4 transition-all duration-500 relative overflow-hidden border",
      simulation.isActive 
        ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" 
        : "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800"
    )}>
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          <div className="flex items-center gap-3 shrink-0">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              simulation.isActive ? "bg-white/20 text-white" : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
            )}>
              <Zap size={16} fill={simulation.isActive ? "currentColor" : "none"} />
            </div>
            <div>
              <h3 className={cn(
                "text-xs font-bold uppercase tracking-wider",
                simulation.isActive ? "text-white" : "text-slate-900 dark:text-white"
              )}>
                What-if Симуляция
              </h3>
              {simulation.isActive && (
                <button 
                  onClick={reset}
                  className="text-[10px] font-bold text-indigo-100 hover:text-white flex items-center gap-1 mt-0.5 transition-colors"
                >
                  <RotateCcw size={10} /> Сбросить
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 gap-6 w-full">
            {/* Salary Increase */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={12} className={simulation.isActive ? "text-indigo-200" : "text-indigo-500"} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Рост оклада</span>
                </div>
                <span className="text-[10px] font-mono font-bold">+{simulation.salaryIncrease}%</span>
              </div>
              <input 
                type="range"
                min="0"
                max="100"
                step="5"
                value={simulation.salaryIncrease}
                onChange={(e) => onUpdate({ ...simulation, salaryIncrease: Number(e.target.value), isActive: true })}
                className={cn(
                  "w-full h-1 rounded-lg appearance-none cursor-pointer",
                  simulation.isActive ? "bg-white/30 accent-white" : "bg-slate-200 dark:bg-slate-700 accent-indigo-600"
                )}
              />
            </div>

            {/* Bonus Multiplier */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift size={12} className={simulation.isActive ? "text-indigo-200" : "text-indigo-500"} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Премии</span>
                </div>
                <span className="text-[10px] font-mono font-bold">x{simulation.bonusMultiplier.toFixed(1)}</span>
              </div>
              <input 
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={simulation.bonusMultiplier}
                onChange={(e) => onUpdate({ ...simulation, bonusMultiplier: Number(e.target.value), isActive: true })}
                className={cn(
                  "w-full h-1 rounded-lg appearance-none cursor-pointer",
                  simulation.isActive ? "bg-white/30 accent-white" : "bg-slate-200 dark:bg-slate-700 accent-indigo-600"
                )}
              />
            </div>

            {/* Extra Income */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={12} className={simulation.isActive ? "text-indigo-200" : "text-indigo-500"} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Разовый доход</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    value={simulation.extraIncome}
                    onChange={(e) => onUpdate({ ...simulation, extraIncome: Number(e.target.value), isActive: true })}
                    className={cn(
                      "w-20 bg-transparent border-b border-white/20 focus:border-white outline-none text-[10px] font-mono font-bold text-right",
                      !simulation.isActive && "text-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
                    )}
                  />
                  <span className="text-[10px] font-mono font-bold">₽</span>
                </div>
              </div>
              <input 
                type="range"
                min="0"
                max="2000000"
                step="10000"
                value={simulation.extraIncome}
                onChange={(e) => onUpdate({ ...simulation, extraIncome: Number(e.target.value), isActive: true })}
                className={cn(
                  "w-full h-1 rounded-lg appearance-none cursor-pointer",
                  simulation.isActive ? "bg-white/30 accent-white" : "bg-slate-200 dark:bg-slate-700 accent-indigo-600"
                )}
              />
            </div>
          </div>

          {simulation.isActive && (
            <div className="absolute top-0 left-0 flex items-center gap-2 px-3 py-2 bg-indigo-600 dark:bg-indigo-500 rounded-tl-2xl rounded-br-2xl text-white border-r border-b border-indigo-500/50 shadow-[4px_4px_15px_rgba(79,70,229,0.3)] z-20 cursor-default select-none group/sticker">
              <Zap size={14} fill="currentColor" className="animate-pulse text-indigo-200" />
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-80">Режим</span>
                <span className="text-[10px] font-black uppercase tracking-wider">Симуляция</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
