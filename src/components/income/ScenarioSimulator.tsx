import React, { useState, useRef, useEffect } from 'react';
import { SquareStop, Zap, TrendingUp, DollarSign, RussianRuble, Gift, Info, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SimulationState } from '../../types';
import { cn } from '../../lib/utils';

interface ScenarioSimulatorProps {
  simulation: SimulationState;
  onUpdate: (simulation: SimulationState) => void;
  bonusBase?: number;
  averageMonthlyNet?: number;
}

export function ScenarioSimulator({ simulation, onUpdate, bonusBase = 0, averageMonthlyNet }: ScenarioSimulatorProps) {
  const [showFreqDropdown, setShowFreqDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  
  const freqOptions = [
    { value: 'none', label: 'Нет' },
    { value: 'monthly', label: 'Месяц' },
    { value: 'quarterly', label: 'Квартал' },
    { value: 'annual', label: 'Год' },
  ];
  
  const typeOptions = [
    { value: 'coef', label: 'Кф.' },
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
      "rounded-3xl p-5 lg:p-6 transition-all duration-700 relative",
      simulation.isActive 
        ? "bg-slate-100/50 dark:bg-[#0f121b] text-slate-900 dark:text-white border border-primary-500/25 dark:border-primary-500/30 shadow-[0_20px_50px_rgba(37,99,235,0.08)] dark:shadow-[0_20px_50px_rgba(37,99,235,0.15)]" 
        : "bg-white bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10"
    )}>
      {/* Decorative Background Elements for Simulation Mode */}
      {simulation.isActive && (
        <div className="absolute inset-0 pointer-events-none rounded-[2rem] overflow-hidden z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-primary-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[30%] h-[100%] bg-purple-600/10 blur-[100px] rounded-full" />
        </div>
      )}

      <div className="relative z-10 flex flex-col gap-6">
        
        {/* Header Section */}
        <div className="flex sm:flex-row sm:items-center justify-between gap-4 w-full relative">
          <div className="flex items-center gap-3 flex-row min-w-0">
            <div className={cn(
              "w-9 h-9 sm:w-10 sm:h-10 rounded-[0.875rem] sm:rounded-xl flex items-center justify-center transition-all duration-500 shadow-inner shrink-0",
              simulation.isActive 
                ? "bg-primary-50 dark:bg-[#1A1F30] text-primary-600 dark:text-primary-400 shadow-primary-500/10 border border-primary-100/30 dark:border-white/5" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            )}>
              <Zap size={18} fill={simulation.isActive ? "currentColor" : "none"} className={simulation.isActive ? "animate-pulse" : ""} />
            </div>
            <div className="min-w-0 relative">
              <div className="flex items-center">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-[0.1em] whitespace-nowrap leading-none text-slate-950 dark:text-white">
                  What-if
                </h3>
              </div>
              
              <div className="relative h-4 sm:h-5 mt-1">
                <AnimatePresence mode="wait">
                  {!simulation.isActive ? (
                    <motion.p 
                       key="promo-text"
                       initial={{ opacity: 0, y: -2 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -2 }}
                       className="absolute inset-0 text-[10px] sm:text-xs text-slate-500 truncate select-none leading-none"
                    >
                      Прогноз дохода
                    </motion.p>
                  ) : (
                    averageMonthlyNet !== undefined && (
                      <motion.div 
                        key="average-badge"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute left-0 top-0 whitespace-nowrap flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-full bg-deposit-500/10 border border-deposit-500/20 text-[9px] sm:text-[10px] font-bold text-deposit-600 dark:text-deposit-400 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.25)] select-none"
                      >
                        <span className="opacity-75 uppercase tracking-wide text-[8px] sm:text-[9px]">Средний Net:</span>
                        <span className="font-extrabold font-mono text-[9px] sm:text-[10px]">~{Math.round(averageMonthlyNet).toLocaleString('ru-RU')} ₽/мес.</span>
                      </motion.div>
                    )
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-center sm:self-auto shrink-0">
            {simulation.isActive ? (
              <button 
                onClick={stopSimulation}
                className="group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 dark:bg-white/5 hover:bg-rose-500/10 text-slate-700 dark:text-white hover:text-rose-500 dark:hover:text-rose-400 rounded-xl transition-all border border-slate-200 dark:border-white/10 hover:border-rose-500/20 active:scale-95"
                title="Остановить симуляцию"
              >
                <SquareStop size={16} fill="currentColor" className="transition-transform group-hover:scale-110" />
              </button>
            ) : (
              <button 
                onClick={startSimulation}
                className="group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-all shadow-[0_0_20px_rgba(var(--rgb-primary),0.3)] hover:shadow-[0_0_25px_rgba(var(--rgb-primary),0.5)] active:scale-95"
                title="Запустить симуляцию"
              >
                <Zap size={16} fill="currentColor" className="transition-transform group-hover:scale-110" />
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
              "relative flex-1 group p-4 lg:p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between min-h-[100px]",
              simulation.isActive 
                ? "bg-white dark:bg-white/5 backdrop-blur-xl border border-deposit-500/30 dark:border-deposit-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.06)] dark:shadow-[0_4px_20px_rgba(16,185,129,0.15)] hover:border-deposit-500/40" 
                : "bg-slate-50/80 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200 dark:border-white/5"
            )}>
              <div className="flex items-start justify-between gap-1.5 flex-nowrap w-full">
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  <TrendingUp size={14} className={cn("shrink-0", simulation.isActive ? "text-deposit-550 dark:text-deposit-400" : "text-slate-400")} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                    {simulation.isActive ? "Новый оклад" : "Оклад"}
                  </span>
                </div>
                {simulation.isActive && (simulation.salaryIncrease ?? 0) > 0 && (
                  <span className="text-[8px] font-black uppercase tracking-widest text-deposit-600 dark:text-deposit-400 bg-deposit-500/10 px-1.5 py-0.5 rounded-md border border-deposit-500/20 shrink-0 select-none">
                    +{simulation.salaryIncrease}%
                  </span>
                )}
              </div>

              {simulation.isActive ? (
                <div className="mt-auto flex flex-col gap-0.5">
                  <div className="flex items-baseline text-deposit-600 dark:text-deposit-400 filter drop-shadow-[0_0_10px_rgba(16,185,129,0.15)] dark:drop-shadow-[0_0_10px_rgba(16,185,129,0.4)] select-all font-sans font-semibold text-xl sm:text-2xl tracking-tight leading-none">
                    <span>{Math.round((simulation.projectedSalary ?? bonusBase) * (1 + (simulation.salaryIncrease || 0) / 100)).toLocaleString('ru-RU')}</span>
                    <span className="text-sm font-semibold opacity-85 ml-1">₽</span>
                  </div>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    Базовый: {(simulation.projectedSalary ?? bonusBase).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ) : (
                <div className={cn("mt-auto flex items-baseline border-b transition-all border-slate-200 dark:border-slate-700/50 focus-within:border-primary-500 text-slate-800 dark:text-white")}>
                  <input 
                    type="number"
                    value={simulation.projectedSalary === 0 ? '' : (simulation.projectedSalary ?? '')}
                    placeholder={bonusBase.toString()}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleProjectedSalaryChange(e.target.value)}
                    className="w-full bg-transparent outline-none text-xl sm:text-2xl font-sans tracking-tight font-semibold py-1 transition-all"
                  />
                  <span className="text-sm font-semibold text-slate-500 shrink-0 ml-1 mb-1 pointer-events-none">₽</span>
                </div>
              )}
            </div>

          {/* Card 3: Extra Income */}
            <div className={cn(
              "flex-1 group p-4 lg:p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between min-h-[100px]",
              simulation.isActive 
                ? "bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg hover:border-slate-300 dark:hover:border-white/20" 
                : "bg-slate-50/80 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200 dark:border-white/5"
            )}>
            <div className="flex items-center gap-2">
              <RussianRuble size={14} className={simulation.isActive ? "text-primary-600 dark:text-primary-400" : "text-slate-400"} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Доп. доход</span>
            </div>
              <div className={cn("flex items-baseline border-b transition-all", simulation.isActive ? "border-slate-200 dark:border-white/20 focus-within:border-primary-500 dark:focus-within:border-primary-400 text-slate-800 dark:text-white" : "border-slate-200 dark:border-slate-700/50 focus-within:border-primary-500 text-slate-800 dark:text-white")}>
                <input 
                  type="number"
                  value={simulation.extraIncome === 0 ? '' : (simulation.extraIncome ?? '')}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleExtraIncomeChange(e.target.value)}
                  className="w-full bg-transparent outline-none text-xl sm:text-2xl font-sans tracking-tight font-semibold py-1 transition-all"
                />
                <span className="text-sm font-semibold text-slate-500 shrink-0 ml-1 mb-1 pointer-events-none">₽</span>
              </div>
            </div>
          </div>

          {/* Right Column: Combined Bonus & Salary Increase */}
          <div className={cn(
            "w-full lg:w-2/3 group p-4 lg:p-5 rounded-2xl transition-all duration-300 flex flex-col justify-between min-h-[100px]",
            simulation.isActive 
              ? "bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg hover:border-slate-300 dark:hover:border-white/20" 
              : "bg-slate-50/80 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-200 dark:border-white/5"
          )}>
              
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
                          ? "bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white border-slate-200 dark:border-white/20 hover:bg-slate-200 dark:hover:bg-white/20" 
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
                            className="absolute left-0 top-full mt-1.5 min-w-[130px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/60 dark:border-white/[0.08] rounded-2xl shadow-2xl z-50 outline-none p-1.5 flex flex-col gap-0.5"
                          >
                            {freqOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  onUpdate({ ...simulation, bonusFrequency: opt.value as any });
                                  setShowFreqDropdown(false);
                                }}
                                className={cn(
                                  "w-full px-3 py-2 text-left text-[10px] rounded-xl font-bold uppercase tracking-wider transition-all duration-200 border border-transparent flex items-center justify-between gap-1.5",
                                  (simulation.bonusFrequency || 'quarterly') === opt.value
                                    ? "bg-slate-100/80 dark:bg-slate-800/70 text-slate-900 dark:text-white border-slate-200/50 dark:border-white/[0.05] shadow-sm font-black"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:border-slate-200/40 dark:hover:border-white/[0.04] hover:shadow-sm"
                                )}
                              >
                                <span>{opt.label}</span>
                                {(simulation.bonusFrequency || 'quarterly') === opt.value && (
                                  <Check size={10} className="text-deposit-500 shrink-0 stroke-[2.5px]" />
                                )}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className={cn("relative flex-1 w-full max-w-[140px] flex items-baseline border-b transition-all pb-1", simulation.isActive ? "border-slate-200 dark:border-white/20 focus-within:border-primary-500 dark:focus-within:border-primary-400 text-slate-800 dark:text-white" : "border-slate-300 dark:border-slate-700 focus-within:border-primary-500 text-slate-800 dark:text-white")}>
                  <input 
                    type="number"
                    step={simulation.bonusType === 'coef' ? "0.05" : "1000"}
                    value={simulation.bonusValue === 0 ? '' : (simulation.bonusValue ?? '')}
                    placeholder={simulation.bonusType === 'coef' ? "0.3" : "50"}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleBonusValueChange(e.target.value)}
                    className="w-full bg-transparent outline-none text-xl sm:text-2xl font-sans tracking-tight font-semibold transition-all text-right mr-2"
                  />
                  <div className="relative z-30 shrink-0">
                    <button 
                      onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                      className={cn(
                        "text-[10px] font-semibold uppercase flex items-center justify-between gap-1 hover:opacity-100 transition-all border rounded-md px-1.5 py-0.5 outline-none opacity-80",
                        simulation.isActive 
                          ? "bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white border-slate-200 dark:border-white/20 hover:bg-slate-200 dark:hover:bg-white/20" 
                          : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-700"
                      )}
                    >
                      {typeOptions.find(o => o.value === (simulation.bonusType || 'coef'))?.label || 'Кф.'}
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
                            className="absolute right-0 top-full mt-1.5 min-w-[100px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/60 dark:border-white/[0.08] rounded-2xl shadow-2xl z-50 outline-none p-1.5 flex flex-col gap-0.5"
                          >
                            {typeOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  onUpdate({ ...simulation, bonusType: opt.value as any });
                                  setShowTypeDropdown(false);
                                }}
                                className={cn(
                                  "w-full px-2.5 py-1.5 text-left text-[10px] rounded-xl font-bold uppercase tracking-wider transition-all duration-200 border border-transparent flex items-center justify-between gap-1.5",
                                  (simulation.bonusType || 'coef') === opt.value
                                    ? "bg-slate-100/80 dark:bg-slate-800/70 text-slate-900 dark:text-white border-slate-200/50 dark:border-white/[0.05] shadow-sm font-black"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white hover:border-slate-200/40 dark:hover:border-white/[0.04] hover:shadow-sm"
                                )}
                              >
                                <span>{opt.label}</span>
                                {(simulation.bonusType || 'coef') === opt.value && (
                                  <Check size={10} className="text-deposit-500 shrink-0 stroke-[2.5px]" />
                                )}
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
                    <TrendingUp size={14} className={simulation.isActive ? "text-primary-600 dark:text-primary-400" : "text-slate-400"} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Индексация</span>
                  </div>
                  <span className="text-[10px] font-bold font-mono text-primary-600 dark:text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded">+{simulation.salaryIncrease}%</span>
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
                      ? "bg-slate-200 dark:bg-white/10 accent-primary-500 dark:accent-primary-400" 
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
  );
}
