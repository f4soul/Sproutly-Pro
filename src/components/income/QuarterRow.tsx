import React from 'react';
import { TableInput } from '../ui/TableInput';
import { CalculatedTableInput } from '../ui/CalculatedTableInput';
import { MonthRow } from './MonthRow';
import { YearData, CalculatedMonth, MonthData, YearDataV2 } from '../../types/index';
import { formatCurrency } from '../../lib/taxCalculator';
import { PrivacyBlur } from '../ui/PrivacyBlur';
import { cn } from '../../lib/utils';

interface QuarterRowProps {
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
  showQuarterlyRow?: boolean;
  hasAnyBonusColumn?: boolean;
}

export const QuarterRow = React.memo(({
  q,
  qIndex,
  activeYearData,
  v2Data,
  calculatedMonths,
  handleQuarterChange,
  handleMonthChange,
  onValueChange,
  isPrivate = false,
  showQuarterlyRow = true,
  hasAnyBonusColumn = false
}: QuarterRowProps) => {
  const qMonths = q.months.map(mi => calculatedMonths[mi]);
  const qGross = qMonths.reduce((sum, m) => sum + m.gross, 0);
  const qNet13 = qMonths.reduce((sum, m) => sum + m.net13, 0);

  const formatVal = (val: number) => <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(val)}</PrivacyBlur>;
  const formatValNoSymbol = (val: number) => <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(val).replace(/\s?[₽|RUB]$/i, '')}</PrivacyBlur>;

  return (
    <React.Fragment>
      {/* Quarter Header / Summary Row */}
      {showQuarterlyRow && (
        <tr className="bg-slate-50/50 dark:bg-slate-800/30 font-semibold border-t border-slate-200 dark:border-slate-700/50">
          <td colSpan={3} className="px-2 lg:px-3 py-1.5 lg:py-2 align-middle">
            <div className="flex items-center gap-2">
              <span className="text-[11px] lg:text-xs xl:text-sm text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                {q.name}
              </span>
              {v2Data.settings?.showQuarterly && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[9px] xl:text-[10px] font-bold bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20 leading-none">
                  {v2Data.settings?.quarterCalcType === 'percent' ? '%' : v2Data.settings?.quarterCalcType === 'coef' ? 'Кф' : '₽'}
                </span>
              )}
            </div>
          </td>
          
          {hasAnyBonusColumn && (
            <td className="px-1 py-1.5 lg:py-2 align-middle min-w-[65px] lg:min-w-[80px]">
              {v2Data.settings?.showQuarterly ? (() => {
                const qType = v2Data.settings?.quarterCalcType || 'rub';
                const val = activeYearData.quarters?.[qIndex]?.bonusAmount || 0;
                let computedVal = val;
                const calcBase = activeYearData.bonusBase || 0;
                if (qType === 'percent') {
                  computedVal = calcBase * (val / 100);
                } else if (qType === 'coef') {
                  computedVal = calcBase * val;
                }

                return (
                  <div className="group/cell relative">
                    {isPrivate ? (
                      <div className="w-full font-mono text-right px-1 py-1 text-[11px] lg:text-xs xl:text-sm text-primary-700 dark:text-primary-400 font-bold"><PrivacyBlur isPrivate={true}>{formatCurrency(computedVal)}</PrivacyBlur></div>
                    ) : (
                      qType === 'rub' ? (
                        <div className="relative flex flex-col items-end justify-center w-full">
                          <TableInput 
                            value={val} 
                            onChange={(v) => handleQuarterChange(qIndex, 'bonusAmount', v)} 
                            className="w-full font-mono font-bold text-right bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md px-1 py-1 text-[11px] lg:text-xs xl:text-sm shrink text-primary-700 dark:text-primary-400" 
                          />
                        </div>
                      ) : (
                        <CalculatedTableInput 
                          value={val} 
                          computedValue={computedVal}
                          baseAmount={calcBase}
                          onChange={(v) => handleQuarterChange(qIndex, 'bonusAmount', v)} 
                          type={qType as any} 
                          label={`Премия за ${q.name}`} 
                          className="px-1.5 py-1 text-[11px] lg:text-xs xl:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md" 
                        />
                      )
                    )}
                  </div>
                );
              })() : (
                <div className="w-full text-right px-1 py-1 text-[11px] lg:text-xs xl:text-sm font-mono font-bold text-slate-300 dark:text-slate-700 select-none pr-4">
                  —
                </div>
              )}
            </td>
          )}
          
          {/* Empty cells for dynamic columns in Quarter summary row */}
          {v2Data.columns.map(col => (
            <td key={col.id} className="px-1 py-1.5 lg:py-2 align-middle border-none">
            </td>
          ))}
          <td className="px-1 py-1.5 lg:py-2 text-right font-mono text-primary-700 dark:text-primary-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[85px] lg:min-w-[95px]">{formatValNoSymbol(qGross)}</td>
          <td className={cn(
            "pl-1 pr-3 lg:pr-4 py-1.5 lg:py-2 text-right font-mono text-deposit-600 dark:text-deposit-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[85px] lg:min-w-[95px]",
            v2Data.columns.length > 0 && "sticky right-0 bg-[#f8fafc]/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)] dark:shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.2)] border-l border-slate-100 dark:border-slate-800"
          )}>{formatValNoSymbol(qNet13)}</td>
        </tr>
      )}
      
      {/* Months */}
      {q.months.map((monthIndex) => (
        <MonthRow
          key={monthIndex}
          monthIndex={monthIndex}
          m={activeYearData.months[monthIndex]}
          v2Month={v2Data.months[monthIndex]}
          columns={v2Data.columns}
          calcM={calculatedMonths[monthIndex]}
          handleMonthChange={handleMonthChange}
          onValueChange={onValueChange}
          isPrivate={isPrivate}
          showMonthlyRow={v2Data.settings?.showMonthly ?? false}
          mainCalcType={v2Data.settings?.mainCalcType}
          hasAnyBonusColumn={hasAnyBonusColumn}
        />
      ))}
    </React.Fragment>
  );
});
