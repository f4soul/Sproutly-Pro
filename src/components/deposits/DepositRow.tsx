import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Deposit } from '../../types';
import { formatCurrency, formatPercent, cn } from '../../lib/utils';
import { calculateIncome, isDepositClosed } from '../../lib/depositCalculations';
import { getBankDetails } from '../../lib/banks';
import { BankLogo } from './BankLogo';

interface DepositRowProps {
  deposit: Deposit;
  onEdit: () => void;
  onDelete: () => void;
  isPrivate?: boolean;
  isLast?: boolean;
}

export const DepositRow: React.FC<DepositRowProps> = ({ deposit, onEdit, onDelete, isPrivate = false, isLast = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const income = calculateIncome(deposit);

  const formatVal = (val: number) => isPrivate ? '••••••' : formatCurrency(val);
  
  const parseDate = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return null;
    const date = dateVal instanceof Date ? dateVal : new Date(dateVal);
    return isNaN(date.getTime()) ? null : date;
  };

  const startDate = parseDate(deposit.startDate);
  const endDate = parseDate(deposit.endDate);
  const isClosed = isDepositClosed(deposit);
  const bankDetails = getBankDetails(deposit.bank);
  const [imgError, setImgError] = useState(false);

  return (
    <>
      <tr 
        className={cn(
          "group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all cursor-pointer",
          isClosed ? "opacity-60 bg-slate-50/80 dark:bg-slate-950/50 grayscale-[0.5]" : "",
          isExpanded && "bg-slate-50 dark:bg-white/10"
        )} 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className={cn("pl-4 xl:pl-6 pr-4 py-2.5 border-slate-200 dark:border-slate-800", !(isLast && !isExpanded) && "border-b")}>
          <div className="flex items-center gap-3">
            <div 
              className="w-7 h-7 rounded-lg overflow-hidden bg-transparent border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1 shrink-0 shadow-sm transition-all"
            >
              {bankDetails.logoUrl && !imgError ? (
                <BankLogo
                  logoUrl={bankDetails.logoUrl} 
                  alt="" 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <span className="font-black text-[10px]" style={{ color: bankDetails.color }}>
                  {bankDetails.logoText}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px] truncate text-slate-950 dark:text-white">{deposit.bank}</span>
                {isClosed && (
                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-slate-50 dark:bg-white/10 text-slate-500 dark:text-slate-400 rounded-full shrink-0">Закрыт</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className={cn("px-2 py-2.5 text-center border-slate-200 dark:border-slate-800", !(isLast && !isExpanded) && "border-b")}>
          <span className="font-bold text-deposit-500 dark:text-deposit-400 text-[13px]">
            {formatPercent(deposit.rate)}
          </span>
        </td>
        
        <td className={cn("hidden xl:table-cell px-2 py-2.5 text-center border-slate-200 dark:border-slate-800", !(isLast && !isExpanded) && "border-b")}>
          <span className="text-[13px] font-medium text-slate-950 dark:text-white">{startDate ? format(startDate, 'dd.MM.yy') : '-'}</span>
        </td>
        <td className={cn("hidden xl:table-cell px-2 py-2.5 text-center border-slate-200 dark:border-slate-800", !(isLast && !isExpanded) && "border-b")}>
          <span className="text-[13px] font-medium text-slate-950 dark:text-white">{endDate ? format(endDate, 'dd.MM.yy') : '∞'}</span>
        </td>
        
        <td className={cn("table-cell xl:hidden px-2 py-2.5 text-center border-slate-200 dark:border-slate-800", !(isLast && !isExpanded) && "border-b")}>
          <div className="flex flex-col items-center justify-center">
            <span className="text-[12px] font-medium text-slate-950 dark:text-white">{startDate ? format(startDate, 'dd.MM.yy') : '-'}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">{endDate ? format(endDate, 'dd.MM.yy') : '∞'}</span>
          </div>
        </td>

        <td className={cn("px-2 py-2.5 border-slate-200 dark:border-slate-800", !(isLast && !isExpanded) && "border-b")}>
          <span className="text-[13px] font-bold text-slate-950 dark:text-white">{formatVal(deposit.amount)}</span>
        </td>
        
        <td className={cn("hidden xl:table-cell px-2 py-2.5 border-slate-200 dark:border-slate-800", !(isLast && !isExpanded) && "border-b")}>
          <span className="text-[13px] font-bold text-deposit-500 dark:text-deposit-400">+{formatVal(income)}</span>
        </td>
        <td className={cn("hidden xl:table-cell px-2 py-2.5 border-slate-200 dark:border-slate-800", !(isLast && !isExpanded) && "border-b")}>
          <span className="text-[13px] font-bold text-slate-950 dark:text-white">{formatVal(deposit.amount + income)}</span>
        </td>

        <td className={cn("table-cell xl:hidden px-2 py-2.5 border-slate-200 dark:border-slate-800", !(isLast && !isExpanded) && "border-b")}>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-slate-950 dark:text-white">{formatVal(deposit.amount + income)}</span>
            <span className="text-[10px] font-bold text-deposit-500 dark:text-deposit-400">+{formatVal(income)}</span>
          </div>
        </td>

        <td className={cn("px-2 xl:px-4 py-2.5 text-right border-slate-200 dark:border-slate-800", !(isLast && !isExpanded) && "border-b")}>
          <div className="flex items-center justify-end gap-1 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-slate-500 hover:text-primary-600 transition-all cursor-pointer opacity-60 hover:opacity-100"
              title="Редактировать"
            >
              <Edit2 className="w-3.5 h-3.5 stroke-[1.5px]" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-600 transition-all cursor-pointer opacity-60 hover:opacity-100"
              title="В архив"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[1.5px]" />
            </button>
          </div>
        </td>
      </tr>
      <tr className="bg-slate-50/30 dark:bg-white/5 border-b border-transparent">
        <td colSpan={9} className="p-0">
          <div 
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
              isExpanded ? "grid-rows-[1fr] opacity-100 pointer-events-auto" : "grid-rows-[0fr] opacity-0 pointer-events-none"
            )}
          >
            <div className="overflow-hidden">
              <div className={cn("border-slate-200 dark:border-slate-800", !isLast && "border-b")}>
                {/* Desktop/Tablet Horizontal Content */}
                <div className="hidden lg:flex flex-row flex-wrap items-center gap-6 text-[11px] px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium font-bold uppercase tracking-widest text-[8px]">Формула расчета:</span>
                    <span className="font-bold text-slate-950 dark:text-white">
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
                      <span className="text-slate-500 dark:text-slate-400 font-medium font-bold uppercase tracking-widest text-[8px]">Вывод:</span>
                      <span className="font-bold text-slate-950 dark:text-white">{deposit.sourceNote}</span>
                    </div>
                  )}
                  {deposit.comment && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0 font-bold uppercase tracking-widest text-[8px]">Заметка:</span>
                      <span className="text-slate-950 dark:text-white truncate" title={deposit.comment}>
                        {deposit.comment}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mobile Content */}
                <div className="lg:hidden flex flex-col gap-4 p-4 text-[11px]">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[8px]">Формула расчета</span>
                      <span className="font-bold text-slate-950 dark:text-white">
                        {deposit.formula === 'simple_days' ? 'В конце срока' : 
                         deposit.formula === 'simple_months' ? 'Ежемесячно' : 
                         deposit.formula === 'compound_monthly' ? 'Капитализация' :
                         deposit.formula === 'daily_balance' ? 'Ежедн. остаток' :
                         deposit.formula === 'min_balance' ? 'Мин. остаток' :
                         'Не указана'}
                      </span>
                    </div>
                    {deposit.sourceNote && (
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[8px]">Счет вывода</span>
                        <span className="font-bold text-slate-950 dark:text-white">{deposit.sourceNote}</span>
                      </div>
                    )}
                  </div>
                  {deposit.comment && (
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[8px]">Дополнительно</span>
                      <span className="text-slate-950 dark:text-white break-words">
                        {deposit.comment}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
};
