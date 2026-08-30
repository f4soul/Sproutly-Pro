import React from 'react';
import { TableInput } from '../ui/TableInput';
import { CalculatedTableInput } from '../ui/CalculatedTableInput';
import { MonthData, CalculatedMonth, MonthDataV2, IncomeColumnDef } from '../../types/index';
import { formatCurrency } from '../../lib/taxCalculator';
import { MONTH_NAMES } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { PrivacyBlur } from '../ui/PrivacyBlur';

import { DaysCellPopover } from './DaysCellPopover';

interface MonthRowProps {
  key?: React.Key;
  monthIndex: number;
  m: MonthData;
  v2Month: MonthDataV2;
  columns: IncomeColumnDef[];
  calcM: CalculatedMonth;
  handleMonthChange: (mIndex: number, field: keyof MonthData, value: number) => void;
  onValueChange: (monthIndex: number, colId: string, value: number) => void;
  isPrivate?: boolean;
  showMonthlyRow?: boolean;
  mainCalcType?: 'rub' | 'percent' | 'coef';
  hasAnyBonusColumn?: boolean;
}

export const MonthRow = React.memo(({
  monthIndex,
  m,
  v2Month,
  columns,
  calcM,
  handleMonthChange,
  onValueChange,
  isPrivate = false,
  showMonthlyRow = false,
  mainCalcType = 'rub',
  hasAnyBonusColumn = false
}: MonthRowProps) => {
  const formatVal = (val: number) => <span className="tabular-nums"><PrivacyBlur isPrivate={isPrivate}>{formatCurrency(val)}</PrivacyBlur></span>;
  const formatValNoSymbol = (val: number) => <span className="tabular-nums"><PrivacyBlur isPrivate={isPrivate}>{formatCurrency(val).replace(/\s?[₽|RUB]$/i, '')}</PrivacyBlur></span>;
  const isProjected = (calcM as any).isProjected;

  const mainBonusVal = v2Month?.values?.['system_main_bonus'] || 0;

  return (
    <tr className={cn(
      "hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group",
      isProjected && "bg-primary-500/5 dark:bg-primary-400/5 italic"
    )}>
      <td className="px-2 lg:px-3 py-1.5 text-slate-600 dark:text-slate-300 text-left align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[55px] lg:min-w-[70px]">
        {MONTH_NAMES[monthIndex]}
      </td>
      <td className="px-1 py-1.5 align-middle min-w-[45px] lg:min-w-[55px]">
        <DaysCellPopover m={m} monthIndex={monthIndex} handleMonthChange={handleMonthChange} isPrivate={isPrivate} />
      </td>
      <td className="px-1 py-1.5 align-middle min-w-[65px] lg:min-w-[80px]">
        {isPrivate ? (
          <div className="w-full text-right px-1 py-1 text-[11px] lg:text-xs xl:text-sm tabular-nums"><PrivacyBlur isPrivate={true}>{formatCurrency(calcM.salary)}</PrivacyBlur></div>
        ) : (
          <TableInput 
            value={m.salary} 
            onChange={(v) => handleMonthChange(monthIndex, 'salary', v)} 
            className="w-full text-right bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md px-1 py-1 text-[11px] lg:text-xs xl:text-sm shrink" 
          />
        )}
      </td>
      
      {hasAnyBonusColumn && (
        showMonthlyRow ? (() => {
          let actualMainVal = mainBonusVal;
          const mainType = mainCalcType;
          let baseForTooltip = calcM.salary; // Simplified base value
          if (mainType === 'percent') {
            actualMainVal = baseForTooltip * (mainBonusVal / 100);
          } else if (mainType === 'coef') {
            actualMainVal = baseForTooltip * mainBonusVal;
          }

          return (
            <td className="px-1 py-1.5 align-middle min-w-[65px] lg:min-w-[80px] group/cell relative">
              {isPrivate ? (
                <div className="w-full text-right px-1 py-1 text-[11px] lg:text-xs xl:text-sm text-primary-600 dark:text-primary-400 font-semibold tabular-nums"><PrivacyBlur isPrivate={true}>{formatCurrency(actualMainVal)}</PrivacyBlur></div>
              ) : (
                mainType === 'rub' ? (
                  <div className="relative flex flex-col items-end justify-center w-full">
                    <TableInput 
                      value={mainBonusVal} 
                      onChange={(v) => onValueChange(monthIndex, 'system_main_bonus', v)} 
                      className="w-full font-semibold text-right bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md px-1 py-1 text-[11px] lg:text-xs xl:text-sm shrink text-primary-600 dark:text-primary-400" 
                    />
                  </div>
                ) : (
                  <CalculatedTableInput 
                    value={mainBonusVal} 
                    computedValue={actualMainVal} 
                    baseAmount={baseForTooltip}
                    onChange={(v) => onValueChange(monthIndex, 'system_main_bonus', v)} 
                    type={mainType as any} 
                    label="Ежемесячная премия" 
                    className="px-1.5 py-1 text-[11px] lg:text-xs xl:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md" 
                  />
                )
              )}
            </td>
          );
        })() : (
          <td className="px-1 py-1.5 align-middle text-right text-[11px] lg:text-xs xl:text-sm font-bold text-slate-300 dark:text-slate-700 select-none pr-4">
            —
          </td>
        )
      )}

      {/* Dynamic columns */}
      {columns.map(col => {
        const val = v2Month?.values?.[col.id] || 0;
        let amount = val;
        // Approximation visual
        let baseForCol = m.salary > 0 ? (m.factDays < m.normDays ? m.salary * (m.factDays / m.normDays) : m.salary) : 0;
        if (col.type === 'percent_base') {
           amount = baseForCol * (val / 100);
        }
        return (
          <td key={col.id} className="px-1 py-1.5 align-middle min-w-[65px] lg:min-w-[80px] group/cell relative">
            {isPrivate ? (
              <div className="w-full text-right px-1 py-1 text-[11px] lg:text-xs xl:text-sm tabular-nums"><PrivacyBlur isPrivate={true}>{formatCurrency(val)}</PrivacyBlur></div>
            ) : (
              col.type === 'rub' ? (
                <div className="relative flex flex-col items-end justify-center w-full">
                  <TableInput 
                    value={val} 
                    onChange={(v) => onValueChange(monthIndex, col.id, v)} 
                    className="w-full text-right bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md px-1 py-1 text-[11px] lg:text-xs xl:text-sm shrink text-primary-600 dark:text-primary-400" 
                  />
                </div>
              ) : (
                <CalculatedTableInput 
                  value={val} 
                  computedValue={amount} 
                  baseAmount={baseForCol}
                  onChange={(v) => onValueChange(monthIndex, col.id, v)} 
                  type={col.type as any} 
                  label={col.name} 
                  className="px-1.5 py-1 text-[11px] lg:text-xs xl:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md font-semibold" 
                />
              )
            )}
          </td>
        );
      })}

      <td className={cn(
        "px-1 py-1.5 text-right font-semibold text-primary-700 dark:text-primary-300 bg-primary-50/30 dark:bg-primary-900/10 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[85px] lg:min-w-[95px]"
      )}>
        {formatValNoSymbol(calcM.gross)}
      </td>
      <td className={cn(
        "pl-1 pr-3 lg:pr-4 py-1.5 text-right text-deposit-600 dark:text-deposit-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[85px] lg:min-w-[95px]",
        columns.length > 0 && "sticky right-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm z-10 shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)] dark:shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.2)] border-l border-slate-100 dark:border-slate-800"
      )}>
        {formatValNoSymbol(calcM.net13)}
      </td>
    </tr>
  );
});
