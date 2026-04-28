import React from 'react';
import { TableInput } from '../ui/TableInput';
import { MonthData, CalculatedMonth } from '../../types/index';
import { formatCurrency } from '../../lib/taxCalculator';
import { MONTH_NAMES } from '../../lib/constants';
import { Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MonthRowProps {
  key?: React.Key;
  monthIndex: number;
  m: MonthData;
  calcM: CalculatedMonth;
  handleMonthChange: (mIndex: number, field: keyof MonthData, value: number) => void;
  isPrivate?: boolean;
}

export const MonthRow = ({
  monthIndex,
  m,
  calcM,
  handleMonthChange,
  isPrivate = false
}: MonthRowProps) => {
  const formatVal = (val: number) => isPrivate ? '••••••' : formatCurrency(val);
  const isProjected = (calcM as any).isProjected;

  return (
    <tr className={cn(
      "hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group",
      isProjected && "bg-blue-500/5 dark:bg-blue-400/5 italic"
    )}>
      <td className="px-1.5 md:px-2 py-1.5 text-slate-600 dark:text-slate-300 text-left align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[60px] lg:min-w-[80px]">
        <div className="flex items-center gap-1.5">
          {isProjected && (
            <span title="Прогноз">
              <Zap size={10} className="text-amber-500 fill-amber-500 animate-pulse" />
            </span>
          )}
          {MONTH_NAMES[monthIndex]}
        </div>
      </td>
      <td className="px-1 md:px-2 py-1.5 align-middle min-w-[70px] lg:min-w-[100px]">
        <div className="flex items-center justify-center gap-0.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md py-1 mx-auto w-full lg:w-[80px]">
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
      <td className="px-1 md:px-2 py-1.5 align-middle min-w-[80px] lg:min-w-[100px]">
        {isPrivate ? (
          <div className="w-full font-mono text-right px-1 py-1 text-[11px] lg:text-xs xl:text-sm">••••••</div>
        ) : (
          <TableInput 
            value={m.salary} 
            onChange={(v) => handleMonthChange(monthIndex, 'salary', v)} 
            className="w-full font-mono text-right bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md px-1 py-1 text-[11px] lg:text-xs xl:text-sm shrink" 
          />
        )}
      </td>
      <td className="px-1 md:px-2 py-1.5 text-right font-mono text-slate-400 dark:text-slate-500 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap">
        -
      </td>
      <td className="px-1 md:px-2 py-1.5 text-right font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-900/10 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[110px] lg:min-w-[130px]">
        {formatVal(calcM.gross)}
      </td>
      <td className="px-1 md:px-2 py-1.5 text-right font-mono text-green-700 dark:text-green-300 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[110px] lg:min-w-[130px]">
        {formatVal(calcM.net13)}
      </td>
    </tr>
  );
};
