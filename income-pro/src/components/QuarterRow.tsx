import React from 'react';
import { TableInput } from './TableInput';
import { MonthRow } from './MonthRow';
import { YearData } from '../types/index';
import { formatCurrency } from '../lib/taxCalculator';

interface QuarterRowProps {
  key?: React.Key;
  q: { name: string, months: number[] };
  qIndex: number;
  activeYearData: YearData;
  calculatedMonths: any[];
  handleQuarterChange: (qIndex: number, field: string, value: number) => void;
  handleMonthChange: (mIndex: number, field: string, value: number) => void;
}

export const QuarterRow = ({
  q,
  qIndex,
  activeYearData,
  calculatedMonths,
  handleQuarterChange,
  handleMonthChange
}: QuarterRowProps) => {
  const qMonths = q.months.map(mi => calculatedMonths[mi]);
  const qGross = qMonths.reduce((sum, m) => sum + m.gross, 0);
  const qNet13 = qMonths.reduce((sum, m) => sum + m.net13, 0);

  return (
    <React.Fragment>
      {/* Quarter Header / Summary Row */}
      <tr className="bg-slate-50/50 dark:bg-slate-800/30 font-semibold border-t border-slate-200 dark:border-slate-700/50">
        <td colSpan={3} className="px-1 md:px-2 py-2 text-[10px] md:text-xs lg:text-sm text-slate-700 dark:text-slate-300 uppercase tracking-widest align-middle">
          {q.name}
        </td>
        <td className="px-1 md:px-2 py-2 align-middle">
          <TableInput 
            value={activeYearData.quarters?.[qIndex]?.bonusAmount || 0} 
            onChange={(v) => handleQuarterChange(qIndex, 'bonusAmount', v)} 
            className="font-bold text-blue-700 dark:text-blue-400 text-right w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-1 md:px-2 py-1 text-[10px] md:text-xs lg:text-sm" 
          />
        </td>
        <td className="px-1 md:px-2 py-2 text-right font-mono text-blue-700 dark:text-blue-400 align-middle text-[10px] md:text-xs lg:text-sm">{formatCurrency(qGross)}</td>
        <td className="px-1 md:px-2 py-2 text-right font-mono text-green-700 dark:text-green-400 align-middle text-[10px] md:text-xs lg:text-sm">{formatCurrency(qNet13)}</td>
      </tr>
      
      {/* Months */}
      {q.months.map((monthIndex) => (
        <MonthRow 
          key={monthIndex}
          monthIndex={monthIndex}
          m={activeYearData.months[monthIndex]}
          calcM={calculatedMonths[monthIndex]}
          handleMonthChange={handleMonthChange}
        />
      ))}
    </React.Fragment>
  );
};
