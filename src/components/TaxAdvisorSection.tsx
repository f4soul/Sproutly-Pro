import React from 'react';
import { Shield, TrendingUp, Info, Plus, Trash2, Calculator } from 'lucide-react';
import { motion } from 'motion/react';
import { YearData } from '../types';
import { TableInput } from './TableInput';
import { formatCurrency, cn } from '../lib/utils';

interface TaxAdvisorSectionProps {
  activeYearData: YearData;
  onUpdate: (field: string, value: any) => void;
}

export function TaxAdvisorSection({ activeYearData, onUpdate }: TaxAdvisorSectionProps) {
  const deductions = activeYearData.deductions || { social: 0, property: 0, standard: 0 };
  const iisContribution = activeYearData.iisContribution || 0;

  const handleDeductionChange = (type: keyof NonNullable<YearData['deductions']>, value: number) => {
    onUpdate('deductions', { ...deductions, [type]: value });
  };

  // Calculate potential returns
  // Simplified: 13% of deductions (actual depends on brackets)
  const potentialReturn = (iisContribution + deductions.social + deductions.standard) * 0.13;

  return (
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
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="text-indigo-500" /> Налоговый Советник
        </h2>
        <div className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
          Beta
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* IIS Section */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -2 }}
          className="apple-card p-6 border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.02] to-transparent"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">ИИС (Тип А)</h3>
                <p className="text-[10px] text-slate-500 font-medium">Вычет на взнос</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Возврат (эст.)</p>
              <p className="text-sm font-black text-emerald-500">+{formatCurrency(iisContribution * 0.13)}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">Сумма взноса за год</label>
              <div className="relative">
                <TableInput 
                  value={iisContribution}
                  onChange={(v) => onUpdate('iisContribution', v)}
                  className="w-full apple-input pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">₽</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10">
              <div className="flex gap-2">
                <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-600 dark:text-blue-400 leading-relaxed">
                  Максимальная сумма взноса для вычета — 400 000 ₽ в год. Ваш лимит: 
                  <span className="font-bold ml-1">{formatCurrency(Math.max(0, 400000 - iisContribution))}</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Other Deductions */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          whileHover={{ y: -2 }}
          className="apple-card p-6 border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.02] to-transparent"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Calculator size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Налоговые вычеты</h3>
                <p className="text-[10px] text-slate-500 font-medium">Социальные и имущественные</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Всего вычетов</p>
              <p className="text-sm font-black text-indigo-500">
                {formatCurrency(deductions.social + deductions.property + deductions.standard)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Социальный (лечение, обучение)</span>
              <div className="relative w-32">
                <TableInput 
                  value={deductions.social || 0}
                  onChange={(v) => handleDeductionChange('social', v)}
                  className="w-full apple-input py-1 text-xs pr-6 text-right"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">₽</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Имущественный (покупка жилья)</span>
              <div className="relative w-32">
                <TableInput 
                  value={deductions.property || 0}
                  onChange={(v) => handleDeductionChange('property', v)}
                  className="w-full apple-input py-1 text-xs pr-6 text-right"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">₽</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Стандартный (на детей и др.)</span>
              <div className="relative w-32">
                <TableInput 
                  value={deductions.standard || 0}
                  onChange={(v) => handleDeductionChange('standard', v)}
                  className="w-full apple-input py-1 text-xs pr-6 text-right"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">₽</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Smart Insights */}
      <motion.div 
        variants={{
          hidden: { opacity: 0, y: 20 },
          show: { opacity: 1, y: 0 }
        }}
        className="apple-card p-6 bg-slate-900 text-white border-none overflow-hidden relative"
      >
        <div className="relative z-10">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Умные инсайты</h3>
          <div className="space-y-4">
            {iisContribution < 400000 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Plus size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold">Возможность сэкономить на налогах</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Пополнив ИИС еще на <span className="text-white font-bold">{formatCurrency(400000 - iisContribution)}</span>, 
                    вы получите дополнительный возврат <span className="text-emerald-400 font-bold">{formatCurrency((400000 - iisContribution) * 0.13)}</span> в следующем году.
                  </p>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Calculator size={16} />
              </div>
              <div>
                <p className="text-sm font-bold">Ваша эффективная ставка</p>
                <p className="text-xs text-slate-400 mt-1">
                  Благодаря вычетам, ваша реальная налоговая нагрузка снижена на <span className="text-emerald-400 font-bold">1.4%</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Abstract background element */}
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl" />
      </motion.div>
    </motion.div>
  );
}
