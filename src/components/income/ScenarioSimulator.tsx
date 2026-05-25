import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Zap, TrendingUp, DollarSign, RussianRuble, Gift, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SimulationState } from '../../types';
import { cn } from '../../lib/utils';

interface ScenarioSimulatorProps {
  simulation: SimulationState;
  onUpdate: (simulation: SimulationState) => void;
  bonusBase?: number;
}

export function ScenarioSimulator({ simulation, onUpdate, bonusBase = 169500 }: ScenarioSimulatorProps) {
  const [showFreqDropdown, setShowFreqDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  
  const freqOptions = [
    { value: 'none', label: 'Нет' },
    { value: 'monthly', label: 'Ежемес.' },
    { value: 'quarterly', label: 'Квартал.' },
    { value: 'annual', label: 'Годовая' },
  ];
  
  const typeOptions = [
    { value: 'coef', label: 'Коэф.' },
    { value: 'fixed', label: '₽' },
  ];

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
    if (val === '') onUpdate({ ...simulation, projectedSalary: undefined });
    else onUpdate({ ...simulation, projectedSalary: Number(val) });
  };

  const handleBonusValueChange = (val: string) => {
    if (val === '') onUpdate({ ...simulation, bonusValue: undefined });
    else onUpdate({ ...simulation, bonusValue: Number(val) });
  };
  
  const handleExtraIncomeChange = (val: string) => {
    if (val === '') onUpdate({ ...simulation, extraIncome: undefined });
    else onUpdate({ ...simulation, extraIncome: Number(val) });
  };

  const startSimulation = () => {
    onUpdate({ ...simulation, isActive: true });
  };

  return (
    <div className={cn(
      "rounded-[2rem] p-5 lg:p-6 transition-all duration-700 relative overflow-hidden",
      simulation.isActive 
        ? "bg-[#0f121b] text-white border border-primary-500/30 shadow-[0_20px_50px_rgba(37,99,235,0.15)]" 
        : "bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10"
    )}>
      {/* Decorative Background Elements for Simulation Mode */}
      {simulation.isActive && (
        <>
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-primary-600/10 blur-[120px] pointer-events-none rounded-full" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[30%] h-[100%] bg-purple-600/10 blur-[100px] pointer-events-none rounded-full" />
        </>
      )}

      <div className="relative z-10 flex flex-col gap-6">
        
        {/* Header Section */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all duration-500 shadow-inner",
              simulation.isActive 
                ? "bg-[#1A1F30] text-primary-400 shadow-primary-500/10 border border-white/5" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            )}>
              <Zap size={24} fill={simulation.isActive ? "currentColor" : "none"} className={simulation.isActive ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "text-lg font-black uppercase tracking-[0.1em]",
                  simulation.isActive ? "text-white" : "text-slate-950 dark:text-white"
                )}>
                  What-if Симуляция
                </h3>
              </div>
              <p className={cn(
                "text-xs mt-1",
                simulation.isActive ? "text-primary-200/60" : "text-slate-500"
              )}>
                Прогноз будущего дохода
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {simulation.isActive ? (
              <button 
                onClick={stopSimulation}
                className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-rose-500/10 text-white hover:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-white/10 hover:border-rose-500/20"
              >
                <RotateCcw size={14} className="group-hover:rotate-[-45deg] transition-transform" />
                Остановить
              </button>
            ) : (
              <button 
                onClick={startSimulation}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(var(--rgb-primary),0.3)] hover:shadow-[0_0_25px_rgba(var(--rgb-primary),0.5)]"
              >
                <Zap size={14} />
                Запустить
              </button>
            )}
          </div>
        </div>

        {/* Responsive layout Flex Grid */}
        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* Left Column: Base Salary & Extra Income */}
          <div className="flex flex-row lg:flex-col gap-4 w-full lg:w-1/3">
            {/* Card 1: Base Salary */}
            <div className={cn(
              "flex-1 group p-4 lg:p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between min-h-[100px] lg:min-h-[120px]",
              simulation.isActive 
                ? "bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg" 
                : "bg-slate-50/80 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200 dark:border-white/5"
            )}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className={simulation.isActive ? "text-primary-400" : "text-slate-400"} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Оклад</span>
            </div>
            <div className={cn("mt-auto flex items-baseline border-b transition-all", simulation.isActive ? "border-white/20 focus-within:border-primary-400 text-white" : "border-slate-200 dark:border-slate-700/50 focus-within:border-primary-500 text-slate-800 dark:text-white")}>
              <input 
                type="number"
                value={simulation.projectedSalary ?? ''}
                placeholder={bonusBase.toString()}
                onChange={(e) => handleProjectedSalaryChange(e.target.value)}
                className="w-full bg-transparent outline-none text-xl sm:text-2xl font-sans tracking-tight font-semibold py-1 transition-all"
              />
              <span className="text-sm font-semibold text-slate-500 shrink-0 ml-1 mb-1 pointer-events-none">₽</span>
            </div>
          </div>

          {/* Card 3: Extra Income */}
            <div className={cn(
              "flex-1 group p-4 lg:p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between min-h-[100px] lg:min-h-[120px]",
              simulation.isActive 
                ? "bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg" 
                : "bg-slate-50/80 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200 dark:border-white/5"
            )}>
               <div className="flex flex-col gap-0.5 mb-2">
                <div className="flex items-center gap-2">
                  <RussianRuble size={14} className={simulation.isActive ? "text-primary-400" : "text-slate-400"} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Доп. доход</span>
                </div>
              </div>
              <div className={cn("mt-auto flex items-baseline border-b transition-all", simulation.isActive ? "border-white/20 focus-within:border-primary-400 text-white" : "border-slate-200 dark:border-slate-700/50 focus-within:border-primary-500 text-slate-800 dark:text-white")}>
                <input 
                  type="number"
                  value={simulation.extraIncome ?? ''}
                  placeholder="0"
                  onChange={(e) => handleExtraIncomeChange(e.target.value)}
                  className="w-full bg-transparent outline-none text-xl sm:text-2xl font-sans tracking-tight font-semibold py-1 transition-all"
                />
                <span className="text-sm font-semibold text-slate-500 shrink-0 ml-1 mb-1 pointer-events-none">₽</span>
              </div>
            </div>
          </div>

          {/* Right Column: Combined Bonus & Salary Increase */}
          <div className={cn(
            "w-full lg:w-2/3 group p-4 lg:p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between min-h-[120px] lg:min-h-[140px]",
            simulation.isActive 
              ? "bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg" 
              : "bg-slate-50/80 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200 dark:border-white/5"
          )}>
            <div className="flex flex-col h-full">
              
              {/* Premium Controls Row */}
              <div className="flex flex-row items-end justify-between gap-4 sm:gap-6 mb-4 lg:mb-6">
                <div className="flex flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Gift size={14} className={simulation.isActive ? "text-primary-400" : "text-slate-400"} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Премия</span>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setShowFreqDropdown(!showFreqDropdown)}
                      className={cn(
                        "text-[10px] font-semibold uppercase flex items-center justify-between gap-2 hover:opacity-80 transition-all border rounded-lg px-2 py-1 outline-none w-[90px]",
                        simulation.isActive 
                          ? "bg-white/10 text-white border-white/20 hover:bg-white/20" 
                          : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400"
                      )}
                    >
                      {freqOptions.find(o => o.value === (simulation.bonusFrequency || 'quarterly'))?.label || 'Квартал.'}
                      <ChevronDown size={12} className={cn("transition-transform", showFreqDropdown && "rotate-180")} />
                    </button>
                    
                    <AnimatePresence>
                      {showFreqDropdown && (
                        <>
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setShowFreqDropdown(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 5 }}
                            className="absolute left-0 top-full mt-1 min-w-[120px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden outline-none p-1 flex flex-col gap-0.5"
                          >
                            {freqOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  onUpdate({ ...simulation, bonusFrequency: opt.value as any });
                                  setShowFreqDropdown(false);
                                }}
                                className={cn(
                                  "w-full px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors",
                                  (simulation.bonusFrequency || 'quarterly') === opt.value
                                    ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className={cn("relative flex-1 w-full max-w-[140px] flex items-baseline border-b transition-all pb-1", simulation.isActive ? "border-white/20 focus-within:border-primary-400 text-white" : "border-slate-300 dark:border-slate-700 focus-within:border-primary-500 text-slate-800 dark:text-white")}>
                  <input 
                    type="number"
                    step={simulation.bonusType === 'coef' ? "0.05" : "1000"}
                    value={simulation.bonusValue ?? ''}
                    placeholder={simulation.bonusType === 'coef' ? "0.3" : "50"}
                    onChange={(e) => handleBonusValueChange(e.target.value)}
                    className="w-full bg-transparent outline-none text-xl sm:text-2xl font-sans tracking-tight font-semibold transition-all text-right mr-2"
                  />
                  <div className="relative z-30 shrink-0">
                    <button 
                      onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                      className={cn(
                        "text-[10px] font-semibold uppercase flex items-center justify-between gap-1 hover:opacity-100 transition-all border rounded-md px-1.5 py-0.5 outline-none opacity-80",
                        simulation.isActive 
                          ? "bg-white/10 text-white border-white/20 hover:bg-white/20" 
                          : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-700"
                      )}
                    >
                      {typeOptions.find(o => o.value === (simulation.bonusType || 'coef'))?.label || 'Коэф.'}
                      <ChevronDown size={10} className={cn("transition-transform opacity-70", showTypeDropdown && "rotate-180")} />
                    </button>
                    
                    <AnimatePresence>
                      {showTypeDropdown && (
                        <>
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setShowTypeDropdown(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 5 }}
                            className="absolute right-0 top-full mt-1 min-w-[80px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden outline-none p-1 flex flex-col gap-0.5"
                          >
                            {typeOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  onUpdate({ ...simulation, bonusType: opt.value as any });
                                  setShowTypeDropdown(false);
                                }}
                                className={cn(
                                  "w-full px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors",
                                  (simulation.bonusType || 'coef') === opt.value
                                    ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Growth Controls Row */}
              <div className="flex flex-col mt-auto">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className={simulation.isActive ? "text-primary-400" : "text-slate-400"} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Индексация</span>
                  </div>
                  <span className="text-[10px] font-bold font-mono text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded">+{simulation.salaryIncrease}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={simulation.salaryIncrease}
                  onChange={(e) => onUpdate({ ...simulation, salaryIncrease: Number(e.target.value) })}
                  className={cn(
                    "w-full h-1.5 rounded-full appearance-none cursor-pointer mt-1",
                    simulation.isActive 
                      ? "bg-white/10 accent-primary-400" 
                      : "bg-slate-200 dark:bg-slate-700 accent-primary-500"
                  )}
                />
                <div className="flex justify-between mt-1 px-1">
                  <span className="text-[9px] font-semibold opacity-40 text-slate-400">0%</span>
                  <span className="text-[9px] font-semibold opacity-40 text-slate-400">100%</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
