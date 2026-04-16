import React from 'react';
import { Play, RotateCcw, Zap, TrendingUp, DollarSign, Gift, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { SimulationState } from '../types';
import { cn } from '../lib/utils';

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
      "apple-card p-6 transition-all duration-500 relative overflow-hidden",
      simulation.isActive 
        ? "bg-indigo-600 text-white border-none shadow-xl shadow-indigo-500/30" 
        : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
    )}>
      {/* Background Glow */}
      {simulation.isActive && (
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              simulation.isActive ? "bg-white/20 text-white" : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
            )}>
              <motion.div
                animate={simulation.isActive ? { 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Zap size={20} fill={simulation.isActive ? "currentColor" : "none"} />
              </motion.div>
            </div>
            <div>
              <h3 className={cn(
                "text-sm font-bold uppercase tracking-wider",
                simulation.isActive ? "text-white" : "text-slate-900 dark:text-white"
              )}>
                What-if Анализ
              </h3>
              <p className={cn(
                "text-[10px] font-medium opacity-70",
                simulation.isActive ? "text-indigo-100" : "text-slate-500"
              )}>
                Симуляция финансовых сценариев
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {simulation.isActive && (
              <button 
                onClick={reset}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                title="Сбросить"
              >
                <RotateCcw size={18} />
              </button>
            )}
            <button
              onClick={() => onUpdate({ ...simulation, isActive: !simulation.isActive })}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                simulation.isActive 
                  ? "bg-white text-indigo-600 hover:bg-indigo-50" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
              )}
            >
              <Play size={14} fill="currentColor" />
              {simulation.isActive ? "Выключить" : "Запустить"}
            </button>
          </div>
        </div>

        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Salary Increase */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, x: -10 },
              show: { opacity: 1, x: 0 }
            }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className={simulation.isActive ? "text-indigo-200" : "text-indigo-500"} />
                <span className="text-xs font-bold">Рост оклада</span>
              </div>
              <span className="text-xs font-mono font-bold">+{simulation.salaryIncrease}%</span>
            </div>
            <input 
              type="range"
              min="0"
              max="100"
              step="5"
              value={simulation.salaryIncrease}
              onChange={(e) => onUpdate({ ...simulation, salaryIncrease: Number(e.target.value), isActive: true })}
              className={cn(
                "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                simulation.isActive ? "bg-white/30 accent-white" : "bg-slate-200 dark:bg-slate-700 accent-indigo-600"
              )}
            />
            <p className={cn("text-[9px] opacity-60", simulation.isActive ? "text-indigo-100" : "text-slate-500")}>
              Увеличение оклада во всех месяцах
            </p>
          </motion.div>

          {/* Bonus Multiplier */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, x: -10 },
              show: { opacity: 1, x: 0 }
            }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift size={14} className={simulation.isActive ? "text-indigo-200" : "text-indigo-500"} />
                <span className="text-xs font-bold">Множитель премий</span>
              </div>
              <span className="text-xs font-mono font-bold">x{simulation.bonusMultiplier.toFixed(1)}</span>
            </div>
            <input 
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={simulation.bonusMultiplier}
              onChange={(e) => onUpdate({ ...simulation, bonusMultiplier: Number(e.target.value), isActive: true })}
              className={cn(
                "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                simulation.isActive ? "bg-white/30 accent-white" : "bg-slate-200 dark:bg-slate-700 accent-indigo-600"
              )}
            />
            <p className={cn("text-[9px] opacity-60", simulation.isActive ? "text-indigo-100" : "text-slate-500")}>
              Влияет на квартальные и годовую премии
            </p>
          </motion.div>

          {/* Extra Income */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, x: -10 },
              show: { opacity: 1, x: 0 }
            }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className={simulation.isActive ? "text-indigo-200" : "text-indigo-500"} />
                <span className="text-xs font-bold">Разовый доход</span>
              </div>
              <span className="text-xs font-mono font-bold">+{simulation.extraIncome.toLocaleString()} ₽</span>
            </div>
            <input 
              type="range"
              min="0"
              max="1000000"
              step="50000"
              value={simulation.extraIncome}
              onChange={(e) => onUpdate({ ...simulation, extraIncome: Number(e.target.value), isActive: true })}
              className={cn(
                "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                simulation.isActive ? "bg-white/30 accent-white" : "bg-slate-200 dark:bg-slate-700 accent-indigo-600"
              )}
            />
            <p className={cn("text-[9px] opacity-60", simulation.isActive ? "text-indigo-100" : "text-slate-500")}>
              Дополнительная сумма к годовому Gross
            </p>
          </motion.div>
        </motion.div>

        {simulation.isActive && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-indigo-100">
              <Info size={14} />
              <span className="text-[10px]">Режим симуляции активен. Данные не сохраняются в базу.</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
