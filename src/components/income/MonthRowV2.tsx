import React from 'react';
import { TableInput } from '../ui/TableInput';
import { MonthData, CalculatedMonth, MonthDataV2, IncomeColumnDef } from '../../types/index';
import { formatCurrency } from '../../lib/taxCalculator';
import { MONTH_NAMES } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { PrivacyBlur } from '../ui/PrivacyBlur';

interface MonthRowV2Props {
  key?: React.Key;
  monthIndex: number;
  m: MonthData;
  v2Month: MonthDataV2;
  columns: IncomeColumnDef[];
  calcM: CalculatedMonth;
  handleMonthChange: (mIndex: number, field: keyof MonthData, value: number) => void;
  onValueChange: (monthIndex: number, colId: string, value: number) => void;
  isPrivate?: boolean;
}

export const MonthRowV2 = ({
  monthIndex,
  m,
  v2Month,
  columns,
  calcM,
  handleMonthChange,
  onValueChange,
  isPrivate = false
}: MonthRowV2Props) => {
  const formatVal = (val: number) => <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(val)}</PrivacyBlur>;
  const isProjected = (calcM as any).isProjected;

  return (
    <tr className={cn(
      "hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group",
      isProjected && "bg-primary-500/5 dark:bg-primary-400/5 italic"
    )}>
      <td className="px-1 md:px-1.5 py-1.5 text-slate-600 dark:text-slate-300 text-left align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[55px] lg:min-w-[70px]">
        {MONTH_NAMES[monthIndex]}
      </td>
      <td className="px-1 py-1.5 align-middle min-w-[65px] lg:min-w-[85px]">
        <div className="flex items-center justify-center gap-0.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700 rounded-md py-1 mx-auto w-full lg:w-[75px]">
          <TableInput 
            value={m.factDays} 
            onChange={(v) => handleMonthChange(monthIndex, 'factDays', v)} 
            className="w-full bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-[11px] lg:text-xs xl:text-sm p-0 shrink" 
            isInteger={true} 
          />
          <span className="text-slate-300 dark:text-slate-600 text-[11px] lg:text-xs xl:text-sm shrink-0">/</span>
          <TableInput 
            value={m.normDays} 
            onChange={(v) => handleMonthChange(monthIndex, 'normDays', v)} 
            className="w-full bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-[11px] lg:text-xs xl:text-sm p-0 text-slate-500 shrink" 
            isInteger={true} 
          />
        </div>
      </td>
      <td className="px-1 py-1.5 align-middle min-w-[75px] lg:min-w-[90px]">
        {isPrivate ? (
          <div className="w-full font-mono text-right px-1 py-1 text-[11px] lg:text-xs xl:text-sm"><PrivacyBlur isPrivate={true}>{formatCurrency(calcM.salary)}</PrivacyBlur></div>
        ) : (
          <TableInput 
            value={m.salary} 
            onChange={(v) => handleMonthChange(monthIndex, 'salary', v)} 
            className="w-full font-mono text-right bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md px-1 py-1 text-[11px] lg:text-xs xl:text-sm shrink" 
          />
        )}
      </td>
      <td className="px-1 py-1.5 text-right font-mono text-slate-400 dark:text-slate-500 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap">
        -
      </td>

      {/* Dynamic columns */}
      {columns.map(col => {
        const val = v2Month?.values?.[col.id] || 0;
        let amount = val;
        // Approximation visual
        if (col.type === 'percent_base') {
           amount = (m.salary > 0 ? (m.factDays < m.normDays ? m.salary * (m.factDays / m.normDays) : m.salary) : 0) * (val / 100);
        }
        return (
          <td key={col.id} className="px-1 py-1.5 align-middle min-w-[75px] lg:min-w-[90px] group/cell relative">
            {isPrivate ? (
              <div className="w-full font-mono text-right px-1 py-1 text-[11px] lg:text-xs xl:text-sm"><PrivacyBlur isPrivate={true}>{formatCurrency(val)}</PrivacyBlur></div>
            ) : (
              <div className="relative flex items-center justify-end">
                <TableInput 
                  value={val} 
                  onChange={(v) => onValueChange(monthIndex, col.id, v)} 
                  className="w-full font-mono text-right bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md px-1 py-1 text-[11px] lg:text-xs xl:text-sm shrink text-primary-600 dark:text-primary-400" 
                />
                {col.type === 'percent_base' && val > 0 && (
                  <div className="absolute right-0 top-full mt-1 opacity-0 group-hover/cell:opacity-100 pointer-events-none text-[9px] text-slate-400 font-mono transition-opacity bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded px-1 z-50">
                    ≈{Math.round(amount)}
                  </div>
                )}
              </div>
            )}
          </td>
        );
      })}

      <td className="px-1 py-1.5 text-right font-mono font-semibold text-primary-700 dark:text-primary-300 bg-primary-50/30 dark:bg-primary-900/10 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[100px] lg:min-w-[120px]">
        {formatVal(calcM.gross)}
      </td>
      <td className="pl-1 pr-2 md:pr-3 lg:pr-4 py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[100px] lg:min-w-[120px]">
        {formatVal(calcM.net13)}
      </td>
    </tr>
  );
};
