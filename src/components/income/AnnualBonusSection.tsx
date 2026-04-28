import React from 'react';
import { TableInput } from '../ui/TableInput';
import { YearData, YearlyTotals, CalculatedMonth } from '../../types/index';
import { formatCurrency } from '../../lib/taxCalculator';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';

interface AnnualBonusSectionProps {
  activeYearData: YearData;
  handleAnnualBonusChange: (field: any, value: any) => void;
  calculatedMonths: CalculatedMonth[];
  yearlyTotals: YearlyTotals;
  isMobile?: boolean;
  isPrivate?: boolean;
}

export const AnnualBonusSection = ({
  activeYearData,
  handleAnnualBonusChange,
  calculatedMonths,
  yearlyTotals,
  isMobile = false,
  isPrivate = false
}: AnnualBonusSectionProps) => {
  const formatVal = (val: number) => isPrivate ? '••••••' : formatCurrency(val);

  if (isMobile) {
    return (
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-4 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Годовая премия</span>
          <div className="w-32">
            {isPrivate ? (
              <div className="w-full text-right font-mono text-sm font-bold text-blue-600 dark:text-blue-400 py-1.5 px-2">••••••</div>
            ) : (
              <TableInput 
                value={activeYearData.annualBonusAmount || 0} 
                onChange={(v) => handleAnnualBonusChange('annualBonusAmount', v)} 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-right text-sm font-bold text-blue-600 dark:text-blue-400" 
              />
            )}
          </div>
        </div>
        <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/50 pt-3">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Доп. премия</span>
          <div className="w-32">
            {isPrivate ? (
              <div className="w-full text-right font-mono text-sm font-bold text-blue-600 dark:text-blue-400 py-1.5 px-2">••••••</div>
            ) : (
              <TableInput 
                value={activeYearData.extraBonusAmount || 0} 
                onChange={(v) => handleAnnualBonusChange('extraBonusAmount', v)} 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-right text-sm font-bold text-blue-600 dark:text-blue-400" 
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <React.Fragment>
        {/* Annual Bonus Row */}
       <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold border-t-2 border-gray-200 dark:border-gray-700">
        <td colSpan={3} className="px-1.5 md:px-2 py-2 text-gray-700 dark:text-gray-300 text-left align-middle text-[11px] lg:text-xs xl:text-sm uppercase tracking-tight">Годовая премия</td>
        <td className="px-1 md:px-2 py-2 align-middle min-w-[70px] lg:min-w-[90px]">
          {isPrivate ? (
            <div className="text-right text-[11px] lg:text-xs xl:text-sm font-bold text-indigo-700 dark:text-indigo-400 py-1 pr-1.5">••••••</div>
          ) : (
            <TableInput 
              value={activeYearData.annualBonusAmount || 0} 
              onChange={(v) => handleAnnualBonusChange('annualBonusAmount', v)} 
              className="w-full text-right text-[11px] lg:text-xs xl:text-sm font-bold text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 h-7 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 px-1.5"
            />
          )}
        </td>
        <td className="px-1 md:px-2 py-2 text-right font-mono text-blue-700 dark:text-blue-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[110px] lg:min-w-[130px]">{formatVal(activeYearData.annualBonusAmount || 0)}</td>
        <td className="px-1 md:px-2 py-2 text-right font-mono text-green-700 dark:text-green-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[110px] lg:min-w-[130px]">{formatVal((activeYearData.annualBonusAmount || 0) * 0.87)}</td>
       </tr>

       {/* Extra Bonus Row */}
       <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold border-t border-gray-200 dark:border-gray-700">
        <td colSpan={3} className="px-1.5 md:px-2 py-2 text-gray-700 dark:text-gray-300 text-left align-middle text-[11px] lg:text-xs xl:text-sm uppercase tracking-tight">Доп. премия</td>
        <td className="px-1 md:px-2 py-2 align-middle min-w-[70px] lg:min-w-[90px]">
          {isPrivate ? (
            <div className="text-right text-[11px] lg:text-xs xl:text-sm font-bold text-indigo-700 dark:text-indigo-400 py-1 pr-1.5">••••••</div>
          ) : (
            <TableInput 
              value={activeYearData.extraBonusAmount || 0} 
              onChange={(v) => handleAnnualBonusChange('extraBonusAmount', v)} 
              className="w-full text-right text-[11px] lg:text-xs xl:text-sm font-bold text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 h-7 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 px-1.5"
            />
          )}
        </td>
        <td className="px-1 md:px-2 py-2 text-right font-mono text-blue-700 dark:text-blue-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[110px] lg:min-w-[130px]">{formatVal(activeYearData.extraBonusAmount || 0)}</td>
        <td className="px-1 md:px-2 py-2 text-right font-mono text-green-700 dark:text-green-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[110px] lg:min-w-[130px]">{formatVal((activeYearData.extraBonusAmount || 0) * 0.87)}</td>
       </tr>

       {/* Total Year Row */}
       <tr className="bg-white/70 dark:bg-black/70 backdrop-blur-2xl font-bold text-slate-900 dark:text-white align-middle sticky bottom-0 z-10 shadow-[0_-1px_0_0_#e2e8f0] dark:shadow-[0_-1px_0_0_#1e293b] border-t border-slate-200 dark:border-slate-700/50">
        <td className="px-1.5 md:px-2 py-2 lg:py-3 uppercase tracking-tighter whitespace-nowrap text-left text-[11px] lg:text-xs xl:text-sm">Итого за год</td>
        <td className="px-1 md:px-2 py-2 lg:py-3 text-center font-mono text-[10px] lg:text-[11px] xl:text-xs text-slate-500">
          {calculatedMonths.reduce((sum, m) => sum + m.factDays, 0)} / {calculatedMonths.reduce((sum, m) => sum + m.normDays, 0)}
        </td>
        <td className="px-1 md:px-2 py-2 lg:py-3 text-right font-mono text-[11px] lg:text-xs xl:text-sm">{formatVal(calculatedMonths.reduce((sum, m) => sum + m.salary, 0))}</td>
        <td className="px-1 md:px-2 py-2 lg:py-3 text-right font-mono text-indigo-600 dark:text-indigo-400 text-[11px] lg:text-xs xl:text-sm">
          {isPrivate ? '••••••' : (
            <AnimatedCurrency value={
              calculatedMonths.reduce((sum, m) => sum + m.bonus, 0) + 
              (activeYearData.annualBonusAmount || 0) + 
              (activeYearData.extraBonusAmount || 0)
            } />
          )}
        </td>
        <td className="px-1 md:px-2 py-2 lg:py-3 text-right font-mono text-indigo-600 dark:text-indigo-400 text-[11px] lg:text-xs xl:text-sm min-w-[110px] lg:min-w-[130px]">
          {isPrivate ? '••••••' : <AnimatedCurrency value={yearlyTotals.totalGross} />}
        </td>
        <td className="px-1 md:px-2 py-2 lg:py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 text-[11px] lg:text-xs xl:text-sm min-w-[110px] lg:min-w-[130px]">
          {isPrivate ? '••••••' : <AnimatedCurrency value={yearlyTotals.finalNet} />}
        </td>
       </tr>
    </React.Fragment>
  );
};
