import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Deposit } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { calculateIncome } from '../../lib/depositCalculations';
import { getBankDetails } from '../../lib/banks';

interface DepositCardProps {
  deposit: Deposit;
  onEdit: () => void;
  onDelete: () => void;
  isPrivate?: boolean;
}

export const DepositCard: React.FC<DepositCardProps> = ({ deposit, onEdit, onDelete, isPrivate = false }) => {
  const parseDate = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return null;
    const date = dateVal instanceof Date ? dateVal : new Date(dateVal);
    return isNaN(date.getTime()) ? null : date;
  };

  const startDate = parseDate(deposit.startDate);
  const endDate = parseDate(deposit.endDate);
  const isClosed = deposit.isClosed || (endDate && endDate < new Date());
  const income = calculateIncome(deposit);
  const total = deposit.amount + income;
  const [isExpanded, setIsExpanded] = useState(false);
  const bankDetails = getBankDetails(deposit.bank);
  const [imgError, setImgError] = useState(false);

  // Time progress calculation
  const now = new Date().getTime();
  const start = startDate ? startDate.getTime() : now;
  const end = endDate ? endDate.getTime() : now;
  const totalDuration = end - start;
  const elapsed = now - start;
  const progressPercent = totalDuration > 0 ? Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100) : 100;

  const getDaysRemaining = () => {
    if (isClosed || progressPercent === 100) return 'Завершён';
    const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return `Осталось дней: ${days}`;
  };

  const formatVal = (val: number) => isPrivate ? '••••••' : formatCurrency(val);

  return (
    <div 
      className={cn(
        "flex flex-col p-4 mb-4 apple-card overflow-hidden relative cursor-pointer group",
        isClosed ? "opacity-70 grayscale-[0.3]" : "hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Dynamic Background Tint */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.08] pointer-events-none transition-opacity group-hover:opacity-[0.06] dark:group-hover:opacity-[0.12]"
        style={{ background: `linear-gradient(135deg, ${bankDetails.color}80 0%, transparent 100%)` }}
      />
      
      {isClosed && (
        <div className="absolute top-0 right-0 bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-sm z-10">
          Закрыт
        </div>
      )}

      {/* Top Row: Logo & Rate */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1 shadow-sm"
            style={{ backgroundColor: (imgError || !bankDetails.logoUrl) ? `${bankDetails.color}15` : undefined }}
          >
            {bankDetails.logoUrl && !imgError ? (
              <img 
                src={bankDetails.logoUrl} 
                alt={deposit.bank} 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="font-black text-xs" style={{ color: bankDetails.color }}>
                {bankDetails.logoText}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {deposit.bank}
            </h3>
          </div>
        </div>
        
        {!isClosed && (
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black tracking-tighter" style={{ color: bankDetails.color }}>
              {deposit.rate}%
            </span>
          </div>
        )}
      </div>

      {/* Center: Progress Bar */}
      <div className="mb-3 relative z-10">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Срок вклада
          </span>
          <span className="text-[10px] font-bold" style={{ color: bankDetails.color }}>
            {getDaysRemaining()}
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#E5E5EA] dark:bg-slate-700/50 rounded-full overflow-hidden flex">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full relative"
            style={{ backgroundColor: bankDetails.color }}
          >
            <div className="absolute inset-0 bg-white/20" />
          </motion.div>
        </div>
        <div className="flex justify-between mt-1 text-[9px] font-bold text-slate-500 dark:text-slate-400">
          <span>{startDate ? format(startDate, 'dd.MM.yyyy') : ''}</span>
          <span>{endDate ? format(endDate, 'dd.MM.yyyy') : ''}</span>
        </div>
      </div>

      {/* Bottom Row: Amount & Income */}
      <div className="flex items-end justify-between pt-3 border-t border-slate-200/50 dark:border-slate-800/50 relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-0.5">Сумма</span>
          <span className="text-base font-black text-slate-900 dark:text-white tracking-tight">
            {formatVal(deposit.amount)}
          </span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-0.5">Ожидаемый доход</span>
          <span className="text-sm font-black text-emerald-600">
            +{formatVal(income)}
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden relative z-10"
          >
            <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Формула:</span>
                <span className="font-medium text-slate-900 dark:text-white text-right">
                  {deposit.formula === 'simple_days' ? 'В конце срока' : 
                   deposit.formula === 'simple_months' ? 'Ежемесячно' : 
                   deposit.formula === 'compound_monthly' ? 'Капитализация' :
                   deposit.formula === 'daily_balance' ? 'На ежедн. остаток' :
                   deposit.formula === 'min_balance' ? 'На мин. остаток' :
                   'Не указана'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Итоговая сумма:</span>
                <span className="font-bold text-slate-900 dark:text-white text-right">{formatVal(total)}</span>
              </div>

              {deposit.sourceNote && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Счет вывода:</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right">{deposit.sourceNote}</span>
                </div>
              )}
              
              {deposit.comment && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">Заметка:</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right break-words">{deposit.comment}</span>
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                  className="apple-button bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-500 hover:text-blue-600 flex items-center gap-1.5 px-3 py-1.5 text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Изменить
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                  className="apple-button bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 flex items-center gap-1.5 px-3 py-1.5 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  В архив
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
