import React from 'react';
import { TableInput } from './TableInput';
import { MonthRow } from './MonthRow';
import { YearData, CalculatedMonth, MonthData } from '../types/index';
import { formatCurrency } from '../lib/taxCalculator';

interface QuarterRowProps {
  key?: React.Key;
  q: { name: string, months: number[] };
  qIndex: number;
  activeYearData: YearData;
  calculatedMonths: CalculatedMonth[];
  handleQuarterChange: (qIndex: number, field: 'bonusCoef' | 'bonusAmount', value: number) => void;
  handleMonthChange: (mIndex: number, field: keyof MonthData, value: number) => void;
  isPrivate?: boolean;
}

export const QuarterRow = ({
  q,
  qIndex,
  activeYearData,
  calculatedMonths,
  handleQuarterChange,
  handleMonthChange,
  isPrivate = false
}: QuarterRowProps) => {
  const qMonths = q.months.map(mi => calculatedMonths[mi]);
  const qGross = qMonths.reduce((sum, m) => sum + m.gross, 0);
  const qNet13 = qMonths.reduce((sum, m) => sum + m.net13, 0);

  const formatVal = (val: number) => isPrivate ? '••••••' : formatCurrency(val);

  return (
    <React.Fragment>
      {/* Quarter Header / Summary Row */}
      <tr className="bg-slate-50/50 dark:bg-slate-800/30 font-semibold border-t border-slate-200 dark:border-slate-700/50">
        <td colSpan={3} className="px-1 md:px-2 py-1.5 lg:py-2 text-[11px] lg:text-xs xl:text-sm text-slate-700 dark:text-slate-300 uppercase tracking-widest align-middle">
          {q.name}
        </td>
        <td className="px-1 md:px-2 py-1.5 lg:py-2 align-middle min-w-[70px] lg:min-w-[90px]">
          <div className="flex items-center justify-end">
            {isPrivate ? (
              <span className="font-bold text-right text-blue-700 dark:text-blue-400 text-[11px] lg:text-xs xl:text-sm">••••••</span>
            ) : (
              <TableInput 
                value={activeYearData.quarters?.[qIndex]?.bonusAmount || 0} 
                onChange={(v) => handleQuarterChange(qIndex, 'bonusAmount', v)} 
                className="w-full font-bold text-right text-blue-700 dark:text-blue-400 text-[11px] lg:text-xs xl:text-sm bg-transparent border-none p-0 outline-none focus:ring-0 shrink" 
              />
            )}
          </div>
        </td>
        <td className="px-1 md:px-2 py-1.5 lg:py-2 text-right font-mono text-blue-700 dark:text-blue-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap">{formatVal(qGross)}</td>
        <td className="px-1 md:px-2 py-1.5 lg:py-2 text-right font-mono text-green-700 dark:text-green-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap">{formatVal(qNet13)}</td>
      </tr>
      
      {/* Months */}
      {q.months.map((monthIndex) => (
        <MonthRow 
          key={monthIndex}
          monthIndex={monthIndex}
          m={activeYearData.months[monthIndex]}
          calcM={calculatedMonths[monthIndex]}
          handleMonthChange={handleMonthChange}
          isPrivate={isPrivate}
        />
      ))}
    </React.Fragment>
  );
};
