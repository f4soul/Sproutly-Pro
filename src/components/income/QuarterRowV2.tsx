import React from 'react';
import { TableInput } from '../ui/TableInput';
import { MonthRowV2 } from './MonthRowV2';
import { YearData, CalculatedMonth, MonthData, YearDataV2 } from '../../types/index';
import { formatCurrency } from '../../lib/taxCalculator';
import { PrivacyBlur } from '../ui/PrivacyBlur';

interface QuarterRowV2Props {
  key?: React.Key;
  q: { name: string, months: number[] };
  qIndex: number;
  activeYearData: YearData;
  v2Data: YearDataV2;
  calculatedMonths: CalculatedMonth[];
  handleQuarterChange: (qIndex: number, field: 'bonusCoef' | 'bonusAmount', value: number) => void;
  handleMonthChange: (mIndex: number, field: keyof MonthData, value: number) => void;
  onValueChange: (monthIndex: number, colId: string, value: number) => void;
  isPrivate?: boolean;
}

export const QuarterRowV2 = ({
  q,
  qIndex,
  activeYearData,
  v2Data,
  calculatedMonths,
  handleQuarterChange,
  handleMonthChange,
  onValueChange,
  isPrivate = false
}: QuarterRowV2Props) => {
  const qMonths = q.months.map(mi => calculatedMonths[mi]);
  const qGross = qMonths.reduce((sum, m) => sum + m.gross, 0);
  const qNet13 = qMonths.reduce((sum, m) => sum + m.net13, 0);

  const formatVal = (val: number) => <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(val)}</PrivacyBlur>;

  return (
    <React.Fragment>
      {/* Quarter Header / Summary Row */}
      <tr className="bg-slate-50/50 dark:bg-slate-800/30 font-semibold border-t border-slate-200 dark:border-slate-700/50">
        <td colSpan={3} className="px-1 py-1.5 lg:py-2 text-[11px] lg:text-xs xl:text-sm text-slate-700 dark:text-slate-300 uppercase tracking-widest align-middle">
          {q.name}
        </td>
        <td className="px-1 py-1.5 lg:py-2 align-middle min-w-[65px] lg:min-w-[80px]">
          <div className="flex items-center justify-end">
            {isPrivate ? (
              <span className="font-bold text-right text-primary-700 dark:text-primary-400 text-[11px] lg:text-xs xl:text-sm"><PrivacyBlur isPrivate={true}>{formatCurrency(activeYearData.quarters?.[qIndex]?.bonusAmount || 0)}</PrivacyBlur></span>
            ) : (
              <TableInput 
                value={activeYearData.quarters?.[qIndex]?.bonusAmount || 0} 
                onChange={(v) => handleQuarterChange(qIndex, 'bonusAmount', v)} 
                className="w-full font-bold text-right text-primary-700 dark:text-primary-400 text-[11px] lg:text-xs xl:text-sm bg-transparent border-none p-0 outline-none focus:ring-0 shrink" 
              />
            )}
          </div>
        </td>
        {/* Empty cells for dynamic columns in Quarter summary row */}
        {v2Data.columns.map(col => (
          <td key={col.id} className="px-1 py-1.5 lg:py-2 align-middle border-none">
          </td>
        ))}
        <td className="px-1 py-1.5 lg:py-2 text-right font-mono text-primary-700 dark:text-primary-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[100px] lg:min-w-[120px]">{formatVal(qGross)}</td>
        <td className="pl-1 pr-2 md:pr-3 lg:pr-4 py-1.5 lg:py-2 text-right font-mono text-emerald-600 dark:text-emerald-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[100px] lg:min-w-[120px]">{formatVal(qNet13)}</td>
      </tr>
      
      {/* Months */}
      {q.months.map((monthIndex) => (
        <MonthRowV2 
          key={monthIndex}
          monthIndex={monthIndex}
          m={activeYearData.months[monthIndex]}
          v2Month={v2Data.months[monthIndex]}
          columns={v2Data.columns}
          calcM={calculatedMonths[monthIndex]}
          handleMonthChange={handleMonthChange}
          onValueChange={onValueChange}
          isPrivate={isPrivate}
        />
      ))}
    </React.Fragment>
  );
};
