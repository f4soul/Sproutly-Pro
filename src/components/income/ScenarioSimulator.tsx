import React from 'react';
import { RotateCcw, Zap, TrendingUp, DollarSign, Gift, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SimulationState } from '../../types';
import { cn } from '../../lib/utils';

interface ScenarioSimulatorProps {
  simulation: SimulationState;
  onUpdate: (simulation: SimulationState) => void;
  bonusBase?: number;
}

export function ScenarioSimulator({ simulation, onUpdate, bonusBase = 169500 }: ScenarioSimulatorProps) {
  const stopSimulation = () => {
    onUpdate({
      isActive: false,
      salaryIncrease: 0,
      bonusMultiplier: 1,
      extraIncome: 0,
      projectedSalary: undefined,
      projectedBonusCoef: undefined,
      bonusType: 'coef',
      bonusFrequency: 'quarterly',
      bonusValue: 0
    });
  };

  const handleProjectedSalaryChange = (val: string) => {
    const num = Number(val);
    onUpdate({ ...simulation, projectedSalary: isNaN(num) ? 0 : num, isActive: true });
  };

  const handleBonusValueChange = (val: string) => {
    const num = Number(val);
    onUpdate({ ...simulation, bonusValue: isNaN(num) ? 0 : num, isActive: true });
  };

  return (
    <div className={cn(
      "rounded-3xl p-6 sm:p-8 transition-all duration-700 relative border overflow-hidden",
      simulation.isActive 
        ? "bg-slate-900 text-white border-indigo-500/50 shadow-[0_20px_50px_rgba(79,70,229,0.15)]" 
        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
    )}>
      {/* Decorative Background Elements for Simulation Mode */}
      {simulation.isActive && (
        <>
          <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[120%] bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[30%] h-[100%] bg-purple-600/10 blur-[80px] pointer-events-none rounded-full" />
        </>
      )}

      <div className="relative z-10">
        <div className="flex flex-col gap-8">
          
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner",
                simulation.isActive 
                  ? "bg-indigo-500 text-white shadow-indigo-400/20" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              )}>
                <Zap size={24} fill={simulation.isActive ? "currentColor" : "none"} className={simulation.isActive ? "animate-pulse" : ""} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={cn(
                    "text-lg font-black uppercase tracking-[0.1em]",
                    simulation.isActive ? "text-white" : "text-slate-900 dark:text-white"
                  )}>
                    What-if Симуляция
                  </h3>
                  {simulation.isActive && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[9px] font-black uppercase tracking-widest text-indigo-400">
                      Active
                    </span>
                  )}
                </div>
                <p className={cn(
                  "text-xs mt-1",
                  simulation.isActive ? "text-slate-400" : "text-slate-500"
                )}>
                  Прогноз будущего дохода на основе гипотетических данных
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {simulation.isActive && (
                <button 
                  onClick={stopSimulation}
                  className="group flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-rose-500/20"
                >
                  <RotateCcw size={14} className="group-hover:rotate-[-45deg] transition-transform" />
                  Остановить симуляцию
                </button>
              )}
            </div>
          </div>

          {/* Main Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Base Salary Input Card */}
            <div className={cn(
              "group p-5 rounded-2xl border transition-all duration-300",
              simulation.isActive 
                ? "bg-white/5 border-white/10 hover:border-indigo-500/50" 
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <TrendingUp size={16} className={simulation.isActive ? "text-indigo-400" : "text-indigo-500"} />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Базовый оклад</span>
                </div>
              </div>
              <div className="relative">
                <input 
                  type="number"
                  value={simulation.projectedSalary ?? (simulation.isActive ? bonusBase : '')}
                  placeholder={bonusBase.toString()}
                  onChange={(e) => handleProjectedSalaryChange(e.target.value)}
                  className={cn(
                    "w-full bg-transparent border-b-2 outline-none text-xl font-mono font-black py-2 pr-10 transition-all",
                    simulation.isActive 
                      ? "border-white/10 focus:border-indigo-500 text-white" 
                      : "border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-white"
                  )}
                />
                <span className="absolute right-0 bottom-3 text-sm font-bold opacity-40">₽</span>
              </div>
            </div>

            {/* Bonus Configuration Card */}
            <div className={cn(
              "group p-5 rounded-2xl border transition-all duration-300",
              simulation.isActive 
                ? "bg-white/5 border-white/10 hover:border-indigo-500/50" 
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Gift size={16} className={simulation.isActive ? "text-indigo-400" : "text-indigo-500"} />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Премия</span>
                </div>
                <select 
                  value={simulation.bonusFrequency || 'quarterly'}
                  onChange={(e) => onUpdate({ ...simulation, bonusFrequency: e.target.value as any, isActive: true })}
                  className={cn(
                    "text-[10px] font-black uppercase bg-transparent outline-none cursor-pointer hover:opacity-80 transition-opacity",
                    simulation.isActive ? "text-indigo-400" : "text-indigo-600"
                  )}
                >
                  <option value="none" className="text-slate-900">Нет</option>
                  <option value="monthly" className="text-slate-900">Ежемесячно</option>
                  <option value="quarterly" className="text-slate-900">Квартально</option>
                  <option value="annual" className="text-slate-900">Годовая</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                   <div className="relative">
                    <input 
                      type="number"
                      step={simulation.bonusType === 'coef' ? "0.05" : "1000"}
                      value={simulation.bonusValue ?? ''}
                      placeholder={simulation.bonusType === 'coef' ? "0.3" : "50k"}
                      onChange={(e) => handleBonusValueChange(e.target.value)}
                      className={cn(
                        "w-full bg-transparent border-b-2 outline-none text-xl font-mono font-black py-2 pr-10 transition-all",
                        simulation.isActive 
                          ? "border-white/10 focus:border-indigo-500 text-white" 
                          : "border-slate-300 dark:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-white"
                      )}
                    />
                    <select 
                      value={simulation.bonusType || 'coef'}
                      onChange={(e) => onUpdate({ ...simulation, bonusType: e.target.value as any, isActive: true })}
                      className="absolute right-0 bottom-3 text-[10px] font-black uppercase bg-transparent outline-none opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      <option value="coef" className="text-slate-900">C.</option>
                      <option value="fixed" className="text-slate-900">₽</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Growth Slider Card */}
            <div className={cn(
              "group p-5 rounded-2xl border transition-all duration-300",
              simulation.isActive 
                ? "bg-white/5 border-white/10 hover:border-indigo-500/50" 
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
            )}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2.5">
                  <TrendingUp size={16} className={simulation.isActive ? "text-indigo-400" : "text-indigo-500"} />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Прибавка</span>
                </div>
                <span className="text-sm font-black font-mono text-indigo-500">+{simulation.salaryIncrease}%</span>
              </div>
              <input 
                type="range"
                min="0"
                max="100"
                step="5"
                value={simulation.salaryIncrease}
                onChange={(e) => onUpdate({ ...simulation, salaryIncrease: Number(e.target.value), isActive: true })}
                className={cn(
                  "w-full h-1.5 rounded-full appearance-none cursor-pointer",
                  simulation.isActive 
                    ? "bg-white/10 accent-indigo-500" 
                    : "bg-slate-200 dark:bg-slate-700 accent-indigo-600"
                )}
              />
              <div className="flex justify-between mt-2 px-1">
                <span className="text-[8px] font-bold opacity-30">0%</span>
                <span className="text-[8px] font-bold opacity-30">100%</span>
              </div>
            </div>

            {/* Extra Income Card */}
            <div className={cn(
              "group p-5 rounded-2xl border transition-all duration-300",
              simulation.isActive 
                ? "bg-white/5 border-white/10 hover:border-indigo-500/50" 
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <DollarSign size={16} className={simulation.isActive ? "text-indigo-400" : "text-indigo-500"} />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Доп. доход (год)</span>
                </div>
              </div>
              <div className="relative">
                <input 
                  type="number"
                  value={simulation.extraIncome || ''}
                  placeholder="0"
                  onChange={(e) => onUpdate({ ...simulation, extraIncome: Number(e.target.value), isActive: true })}
                  className={cn(
                    "w-full bg-transparent border-b-2 outline-none text-xl font-mono font-black py-2 pr-10 transition-all",
                    simulation.isActive 
                      ? "border-white/10 focus:border-indigo-500 text-white" 
                      : "border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-white"
                  )}
                />
                <span className="absolute right-0 bottom-3 text-sm font-bold opacity-40">₽</span>
              </div>
            </div>

          </div>

          <AnimatePresence>
            {simulation.isActive && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
                  <Info size={16} className="text-white" />
                </div>
                <p className="text-[11px] font-medium leading-relaxed text-indigo-200/80">
                  Симуляция рассчитывает годовой доход полностью автономно. <br className="hidden sm:block" />
                  Больше не нужно вводить данные в таблицу — просто настройте параметры выше.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
