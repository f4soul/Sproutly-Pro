import React from 'react';
import { TableInput } from './TableInput';
import { MonthData } from '../types/index';
import { formatCurrency } from '../lib/taxCalculator';
import { MONTH_NAMES } from '../lib/constants';

interface MonthRowProps {
  key?: React.Key;
  monthIndex: number;
  m: MonthData;
  calcM: any;
  handleMonthChange: (mIndex: number, field: string, value: number) => void;
}

export const MonthRow = ({
  monthIndex,
  m,
  calcM,
  handleMonthChange
}: MonthRowProps) => {
  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
      <td className="px-1 md:px-2 py-1.5 font-medium text-slate-600 dark:text-slate-300 text-left align-middle text-[10px] md:text-xs lg:text-sm whitespace-nowrap">
        {MONTH_NAMES[monthIndex]}
      </td>
      <td className="px-1 md:px-2 py-1.5 align-middle">
        <div className="flex items-center justify-center gap-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md p-0.5 w-20 md:w-24 lg:w-28 mx-auto">
          <TableInput 
            value={m.factDays} 
            onChange={(v) => handleMonthChange(monthIndex, 'factDays', v)} 
            className="w-full bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-[10px] md:text-xs lg:text-sm p-0" 
            isInteger={true} 
          />
          <span className="text-slate-300 dark:text-slate-600 text-[10px] md:text-xs lg:text-sm">/</span>
          <TableInput 
            value={m.normDays} 
            onChange={(v) => handleMonthChange(monthIndex, 'normDays', v)} 
            className="w-full bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-[10px] md:text-xs lg:text-sm p-0 text-slate-500" 
            isInteger={true} 
          />
        </div>
      </td>
      <td className="px-1 md:px-1.5 py-1.5 align-middle">
        <TableInput 
          value={m.salary} 
          onChange={(v) => handleMonthChange(monthIndex, 'salary', v)} 
          className="w-full font-mono font-medium text-right bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md px-1 md:px-1.5 py-1 text-[10px] md:text-xs lg:text-sm" 
        />
      </td>
      <td className="px-1 md:px-1.5 py-1.5 text-right font-mono text-gray-400 dark:text-gray-500 align-middle text-[10px] md:text-xs lg:text-sm whitespace-nowrap">
        {monthIndex % 3 === 2 ? formatCurrency(calcM.bonus) : '-'}
      </td>
      <td className="px-1 md:px-2 py-1.5 text-right font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-900/10 align-middle text-[10px] md:text-xs lg:text-sm whitespace-nowrap">
        {formatCurrency(calcM.gross)}
      </td>
      <td className="px-1 md:px-2 py-1.5 text-right font-mono text-green-700 dark:text-green-300 align-middle text-[10px] md:text-xs lg:text-sm whitespace-nowrap">
        {formatCurrency(calcM.net13)}
      </td>
    </tr>
  );
};
