import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Deposit } from '../../types';
import { formatCurrency, formatPercent, cn } from '../../lib/utils';
import { calculateIncome } from '../../lib/calculations';
import { getBankDetails } from '../../lib/banks';

interface DepositRowProps {
  deposit: Deposit;
  onEdit: () => void;
  onDelete: () => void;
}

export const DepositRow: React.FC<DepositRowProps> = ({ deposit, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const income = calculateIncome(deposit);
  
  const parseDate = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return null;
    const date = dateVal instanceof Date ? dateVal : new Date(dateVal);
    return isNaN(date.getTime()) ? null : date;
  };

  const startDate = parseDate(deposit.startDate);
  const endDate = parseDate(deposit.endDate);
  const bankDetails = getBankDetails(deposit.bank);

  return (
    <>
      <motion.tr 
        layout
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className={cn(
          "group hover:bg-[#F5F5F7]/50 dark:hover:bg-white/5 transition-all cursor-pointer",
          deposit.isClosed && "opacity-50",
          isExpanded && "bg-[#F5F5F7] dark:bg-white/10"
        )} 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="pl-4 xl:pl-6 pr-4 py-2.5 border-b border-light-border dark:border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-white dark:bg-dark-card border border-light-border dark:border-dark-border flex items-center justify-center p-1 shrink-0 shadow-sm transition-all">
              <img 
                src={bankDetails.logoUrl} 
                alt="" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px] truncate text-light-text-primary dark:text-dark-text-primary">{deposit.bank}</span>
                {deposit.isClosed && (
                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-[#F5F5F7] dark:bg-white/10 text-light-text-secondary dark:text-dark-text-secondary rounded-full">Закрыт</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-2 py-2.5 text-center border-b border-light-border dark:border-dark-border">
          <span className="font-bold text-emerald-500 dark:text-emerald-400 text-[13px]">
            {formatPercent(deposit.rate)}
          </span>
        </td>
        
        <td className="hidden xl:table-cell px-2 py-2.5 text-center border-b border-light-border dark:border-dark-border">
          <span className="text-[13px] font-medium text-light-text-primary dark:text-dark-text-primary">{startDate ? format(startDate, 'dd.MM.yy') : '-'}</span>
        </td>
        <td className="hidden xl:table-cell px-2 py-2.5 text-center border-b border-light-border dark:border-dark-border">
          <span className="text-[13px] font-medium text-light-text-primary dark:text-dark-text-primary">{endDate ? format(endDate, 'dd.MM.yy') : '∞'}</span>
        </td>
        
        <td className="table-cell xl:hidden px-2 py-2.5 text-center border-b border-light-border dark:border-dark-border">
          <div className="flex flex-col items-center justify-center">
            <span className="text-[12px] font-medium text-light-text-primary dark:text-dark-text-primary">{startDate ? format(startDate, 'dd.MM.yy') : '-'}</span>
            <span className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary">{endDate ? format(endDate, 'dd.MM.yy') : '∞'}</span>
          </div>
        </td>

        <td className="px-2 py-2.5 border-b border-light-border dark:border-dark-border">
          <span className="text-[13px] font-bold text-light-text-primary dark:text-dark-text-primary">{formatCurrency(deposit.amount)}</span>
        </td>
        
        <td className="hidden xl:table-cell px-2 py-2.5 border-b border-light-border dark:border-dark-border">
          <span className="text-[13px] font-bold text-emerald-500 dark:text-emerald-400">+{formatCurrency(income)}</span>
        </td>
        <td className="hidden xl:table-cell px-2 py-2.5 border-b border-light-border dark:border-dark-border">
          <span className="text-[13px] font-bold text-light-text-primary dark:text-dark-text-primary">{formatCurrency(deposit.amount + income)}</span>
        </td>

        <td className="table-cell xl:hidden px-2 py-2.5 border-b border-light-border dark:border-dark-border">
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-light-text-primary dark:text-dark-text-primary">{formatCurrency(deposit.amount + income)}</span>
            <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400">+{formatCurrency(income)}</span>
          </div>
        </td>

        <td className="px-2 xl:px-4 py-2.5 text-right border-b border-light-border dark:border-dark-border">
          <div className="flex items-center justify-end gap-1 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              className="p-1.5 hover:bg-[#F5F5F7] dark:hover:bg-white/5 rounded-lg text-light-text-secondary hover:text-blue-600 transition-all cursor-pointer opacity-60 hover:opacity-100"
              title="Редактировать"
            >
              <Edit2 className="w-3.5 h-3.5 stroke-[1.5px]" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-light-text-secondary hover:text-rose-600 transition-all cursor-pointer opacity-60 hover:opacity-100"
              title="В архив"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.5px]" />
            </button>
          </div>
        </td>
      </motion.tr>
      <AnimatePresence>
        {isExpanded && (
          <motion.tr 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-50/30 dark:bg-slate-800/10 overflow-hidden"
          >
            <td colSpan={8} className="hidden xl:table-cell px-4 py-3 border-b border-slate-100 dark:border-slate-800/50">
              <div className="flex flex-row flex-wrap items-center gap-6 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Формула расчета:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {deposit.formula === 'simple_days' ? 'В конце срока' : 
                     deposit.formula === 'simple_months' ? 'Ежемесячно (без капитализации)' : 
                     deposit.formula === 'compound_monthly' ? 'Ежемесячная капитализация' :
                     deposit.formula === 'daily_balance' ? 'На ежедневный остаток' :
                     deposit.formula === 'min_balance' ? 'На минимальный остаток' :
                     'Не указана'}
                  </span>
                </div>
                {deposit.sourceNote && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Примечание:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{deposit.sourceNote}</span>
                  </div>
                )}
                {deposit.comment && (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-slate-500 font-medium shrink-0">Дополнительно:</span>
                    <span className="text-slate-600 dark:text-slate-400 truncate" title={deposit.comment}>
                      {deposit.comment}
                    </span>
                  </div>
                )}
              </div>
            </td>
            <td colSpan={6} className="table-cell xl:hidden px-4 py-3 border-b border-slate-100 dark:border-slate-800/50">
              <div className="flex flex-row flex-wrap items-center gap-6 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Формула расчета:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {deposit.formula === 'simple_days' ? 'В конце срока' : 
                     deposit.formula === 'simple_months' ? 'Ежемесячно (без капитализации)' : 
                     deposit.formula === 'compound_monthly' ? 'Ежемесячная капитализация' :
                     deposit.formula === 'daily_balance' ? 'На ежедневный остаток' :
                     deposit.formula === 'min_balance' ? 'На минимальный остаток' :
                     'Не указана'}
                  </span>
                </div>
                {deposit.sourceNote && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Примечание:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{deposit.sourceNote}</span>
                  </div>
                )}
                {deposit.comment && (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-slate-500 font-medium shrink-0">Дополнительно:</span>
                    <span className="text-slate-600 dark:text-slate-400 truncate" title={deposit.comment}>
                      {deposit.comment}
                    </span>
                  </div>
                )}
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
};
