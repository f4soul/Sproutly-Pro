import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Deposit } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { calculateIncome } from '../../lib/calculations';
import { getBankDetails } from '../../lib/banks';

interface DepositCardProps {
  deposit: Deposit;
  onEdit: () => void;
  onDelete: () => void;
}

export const DepositCard: React.FC<DepositCardProps> = ({ deposit, onEdit, onDelete }) => {
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

  return (
    <div className={cn(
      "flex flex-col p-3 sm:p-4 bg-white dark:bg-dark-card hover:bg-slate-50 dark:hover:bg-white/5 transition-all border-b border-slate-200 dark:border-slate-700/50 last:border-b-0 relative overflow-hidden",
      isClosed && "opacity-70 grayscale-[0.3]"
    )}>
      {isClosed && (
        <div className="absolute top-0 left-0 bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-br-xl shadow-sm z-10">
          Закрыт
        </div>
      )}
      <div className="flex items-center justify-between mb-2 sm:mb-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] dark:bg-white/5 border border-light-border dark:border-dark-border flex items-center justify-center overflow-hidden shrink-0 p-1.5">
            <img src={bankDetails.logoUrl} alt={deposit.bank} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-light-text-primary dark:text-dark-text-primary flex items-center gap-2 flex-wrap">
              <span className="truncate">{deposit.bank}</span>
            </div>
            <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5 truncate">
              {startDate ? format(startDate, 'dd.MM.yyyy') : ''} - {endDate ? format(endDate, 'dd.MM.yyyy') : ''}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-sm text-light-text-primary dark:text-dark-text-primary">
            {formatCurrency(deposit.amount)}
          </div>
          <div className="text-xs font-bold text-emerald-600 mt-0.5">
            {deposit.rate}%
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800/50">
        <div className="flex flex-col">
          <span className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider font-bold">Доход</span>
          <span className="text-sm font-bold text-emerald-600">+{formatCurrency(income)}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider font-bold">Итого</span>
          <span className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">{formatCurrency(total)}</span>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-light-border/50 dark:border-dark-border/50 flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-light-text-secondary dark:text-dark-text-secondary">Формула:</span>
                <span className="font-medium text-light-text-primary dark:text-dark-text-primary text-right">
                  {deposit.formula === 'simple_days' ? 'В конце срока' : 
                   deposit.formula === 'simple_months' ? 'Ежемесячно' : 
                   deposit.formula === 'compound_monthly' ? 'Капитализация' :
                   deposit.formula === 'daily_balance' ? 'На ежедн. остаток' :
                   deposit.formula === 'min_balance' ? 'На мин. остаток' :
                   'Не указана'}
                </span>
              </div>
              {deposit.sourceNote && (
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Примечание:</span>
                  <span className="font-medium text-light-text-primary dark:text-dark-text-primary text-right">{deposit.sourceNote}</span>
                </div>
              )}
              {deposit.comment && (
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Дополнительно:</span>
                  <span className="font-medium text-light-text-primary dark:text-dark-text-primary text-right">{deposit.comment}</span>
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                  className="px-3 py-1.5 bg-[#F5F5F7] dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg text-light-text-secondary hover:text-blue-600 transition-all font-medium flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Изменить
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                  className="px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg text-rose-600 transition-all font-medium flex items-center gap-1.5"
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
