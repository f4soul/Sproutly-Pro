import React from 'react';
import { TableInput } from '../ui/TableInput';
import { CalculatedTableInput } from '../ui/CalculatedTableInput';
import { YearData, YearlyTotals, CalculatedMonth } from '../../types/index';
import { formatCurrency } from '../../lib/taxCalculator';
import { AnimatedCurrency } from '../ui/AnimatedCurrency';
import { PrivacyBlur } from '../ui/PrivacyBlur';
import { cn } from '../../lib/utils';

interface AnnualBonusSectionProps {
  activeYearData: YearData;
  handleAnnualBonusChange: (field: any, value: any) => void;
  calculatedMonths: CalculatedMonth[];
  yearlyTotals: YearlyTotals;
  isMobile?: boolean;
  isPrivate?: boolean;
  hasAnyBonusColumn?: boolean;
  showAnnual?: boolean;
  showExtraAnnual?: boolean;
}

export const AnnualBonusSection = ({
  activeYearData,
  handleAnnualBonusChange,
  calculatedMonths,
  yearlyTotals,
  isMobile = false,
  isPrivate = false,
  hasAnyBonusColumn = false,
  showAnnual = true,
  showExtraAnnual = true
}: AnnualBonusSectionProps) => {
  const formatVal = (val: number) => <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(val)}</PrivacyBlur>;
  const formatValNoSymbol = (val: number) => <PrivacyBlur isPrivate={isPrivate}>{formatCurrency(val).replace(/\s?[₽|RUB]$/i, '')}</PrivacyBlur>;

  if (isMobile) {
    return (
      <div className="bg-white dark:bg-slate-950/50 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-4 space-y-4">
        {showAnnual && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Годовая премия</span>
            <div className="w-32">
              {isPrivate ? (
                <div className="w-full text-right font-mono text-sm font-bold text-primary-600 dark:text-primary-400 py-1.5 px-2"><PrivacyBlur isPrivate={true}>{formatCurrency(activeYearData.annualBonusAmount || 0)}</PrivacyBlur></div>
              ) : (
                activeYearData.v2?.settings?.annualCalcType === 'rub' || !activeYearData.v2?.settings?.annualCalcType ? (
                  <TableInput 
                    value={activeYearData.annualBonusAmount || 0} 
                    onChange={(v) => handleAnnualBonusChange('annualBonusAmount', v)} 
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none font-mono text-right text-sm font-bold text-primary-600 dark:text-primary-400" 
                  />
                ) : (
                  <CalculatedTableInput 
                    value={activeYearData.annualBonusAmount || 0} 
                    computedValue={(() => {
                      const type = activeYearData.v2?.settings?.annualCalcType;
                      const val = activeYearData.annualBonusAmount || 0;
                      const base = type === 'percent_annual' ? calculatedMonths.reduce((sum, m) => sum + m.gross, 0) : (activeYearData.bonusBase || 0);
                      return type === 'coef' ? base * val : base * (val / 100);
                    })()} 
                    baseAmount={activeYearData.v2?.settings?.annualCalcType === 'percent_annual' ? calculatedMonths.reduce((sum, m) => sum + m.gross, 0) : (activeYearData.bonusBase || 0)}
                    onChange={(v) => handleAnnualBonusChange('annualBonusAmount', v)} 
                    type={activeYearData.v2?.settings?.annualCalcType as any} 
                    label="Годовая премия" 
                    className="px-2 py-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" 
                  />
                )
              )}
            </div>
          </div>
        )}
        {showExtraAnnual && (
          <div className={cn("flex justify-between items-center", showAnnual && "border-t border-slate-100 dark:border-slate-800/50 pt-3")}>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Доп. премия</span>
            <div className="w-32">
              {isPrivate ? (
                <div className="w-full text-right font-mono text-sm font-bold text-primary-600 dark:text-primary-400 py-1.5 px-2"><PrivacyBlur isPrivate={true}>{formatCurrency(activeYearData.extraBonusAmount || 0)}</PrivacyBlur></div>
              ) : (
                activeYearData.v2?.settings?.extraAnnualCalcType === 'rub' || !activeYearData.v2?.settings?.extraAnnualCalcType ? (
                  <TableInput 
                    value={activeYearData.extraBonusAmount || 0} 
                    onChange={(v) => handleAnnualBonusChange('extraBonusAmount', v)} 
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none font-mono text-right text-sm font-bold text-primary-600 dark:text-primary-400" 
                  />
                ) : (
                  <CalculatedTableInput 
                    value={activeYearData.extraBonusAmount || 0} 
                    computedValue={(() => {
                      const type = activeYearData.v2?.settings?.extraAnnualCalcType;
                      const val = activeYearData.extraBonusAmount || 0;
                      const typeAnnual = activeYearData.v2?.settings?.annualCalcType || 'rub';
                      const valAnnual = activeYearData.annualBonusAmount || 0;
                      const tbs = activeYearData.bonusBase || 0;
                      let computedAnnualVal = valAnnual;
                      if (typeAnnual === 'percent') computedAnnualVal = tbs * (valAnnual / 100);
                      else if (typeAnnual === 'percent_annual') computedAnnualVal = calculatedMonths.reduce((sum, m) => sum + m.gross, 0) * (valAnnual / 100);
                      else if (typeAnnual === 'coef') computedAnnualVal = tbs * valAnnual;
                      
                      const base = type === 'percent_annual' ? calculatedMonths.reduce((sum, m) => sum + m.gross, 0) + computedAnnualVal : tbs;
                      return type === 'coef' ? base * val : base * (val / 100);
                    })()}
                    baseAmount={(() => {
                      const typeAnnual = activeYearData.v2?.settings?.annualCalcType || 'rub';
                      const valAnnual = activeYearData.annualBonusAmount || 0;
                      const tbs = activeYearData.bonusBase || 0;
                      let computedAnnualVal = valAnnual;
                      if (typeAnnual === 'percent') computedAnnualVal = tbs * (valAnnual / 100);
                      else if (typeAnnual === 'percent_annual') computedAnnualVal = calculatedMonths.reduce((sum, m) => sum + m.gross, 0) * (valAnnual / 100);
                      else if (typeAnnual === 'coef') computedAnnualVal = tbs * valAnnual;
                      
                      return activeYearData.v2?.settings?.extraAnnualCalcType === 'percent_annual' ? calculatedMonths.reduce((sum, m) => sum + m.gross, 0) + computedAnnualVal : tbs;
                    })()} 
                    onChange={(v) => handleAnnualBonusChange('extraBonusAmount', v)} 
                    type={activeYearData.v2?.settings?.extraAnnualCalcType as any} 
                    label="Доп. премия" 
                    className="px-2 py-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm" 
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const totalBaseSalaryForYear = activeYearData.bonusBase || 0; // Simplified base for tooltip

  return (
    <React.Fragment>
        {/* Annual Bonus Row */}
        {showAnnual && (() => {
          const type = activeYearData.v2?.settings?.annualCalcType || 'rub';
          const val = activeYearData.annualBonusAmount || 0;
          let computedVal = val;
          if (type === 'percent') {
            computedVal = totalBaseSalaryForYear * (val / 100);
          } else if (type === 'percent_annual') {
            computedVal = calculatedMonths.reduce((sum, m) => sum + m.gross, 0) * (val / 100);
          } else if (type === 'coef') {
            computedVal = totalBaseSalaryForYear * val;
          }

          return (
            <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold border-t-2 border-gray-200 dark:border-gray-700">
            <td colSpan={3} className="px-2 lg:px-3 py-2 text-left align-middle">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-gray-300 text-[11px] lg:text-xs xl:text-sm uppercase tracking-tight">Годовая премия</span>
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[9px] xl:text-[10px] font-bold bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20 leading-none">
                  {type === 'percent' ? '%' : type === 'percent_annual' ? '% Годового' : type === 'coef' ? 'Кф' : '₽'}
                </span>
              </div>
            </td>
            
            {hasAnyBonusColumn && (
              <td className="px-1 py-1.5 lg:py-2 align-middle min-w-[65px] lg:min-w-[80px] group/cell relative">
                {isPrivate ? (
                  <div className="w-full font-mono text-right px-1 py-1 text-[11px] lg:text-xs xl:text-sm text-primary-700 dark:text-primary-400 font-bold"><PrivacyBlur isPrivate={true}>{formatCurrency(computedVal)}</PrivacyBlur></div>
                ) : (
                  type === 'rub' ? (
                    <div className="relative flex flex-col items-end justify-center w-full">
                      <TableInput 
                        value={val} 
                        onChange={(v) => handleAnnualBonusChange('annualBonusAmount', v)} 
                        className="w-full font-mono font-bold text-right bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md px-1 py-1 text-[11px] lg:text-xs xl:text-sm shrink text-primary-700 dark:text-primary-400"
                      />
                    </div>
                  ) : (
                    <CalculatedTableInput 
                      value={val} 
                      computedValue={computedVal} 
                      baseAmount={type === 'percent_annual' ? calculatedMonths.reduce((sum, m) => sum + m.gross, 0) : totalBaseSalaryForYear}
                      onChange={(v) => handleAnnualBonusChange('annualBonusAmount', v)} 
                      type={type as any} 
                      label="Годовая премия" 
                      className="px-1.5 py-1 text-[11px] lg:text-xs xl:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md" 
                    />
                  )
                )}
              </td>
            )}

            {activeYearData.v2?.columns.map(col => (
              <td key={col.id} className="px-1 md:px-1.5 py-2 align-middle border-none"></td>
            ))}

            <td className="px-1 py-2 text-right font-mono text-primary-700 dark:text-primary-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[85px] lg:min-w-[95px]">{formatValNoSymbol(computedVal)}</td>
            <td className={cn(
              "pl-1 pr-3 lg:pr-4 py-2 text-right font-mono text-deposit-600 dark:text-deposit-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[85px] lg:min-w-[95px]",
              activeYearData.v2?.columns && activeYearData.v2.columns.length > 0 && "sticky right-0 bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-sm z-20 shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)] dark:shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.2)] border-l border-slate-100 dark:border-slate-800"
            )}>{formatValNoSymbol(computedVal * 0.87)}</td>
          </tr>
          );
        })()}

        {/* Extra Bonus Row */}
       {showExtraAnnual && (() => {
          const typeAnnual = activeYearData.v2?.settings?.annualCalcType || 'rub';
          const valAnnual = activeYearData.annualBonusAmount || 0;
          let computedAnnualVal = valAnnual;
          if (typeAnnual === 'percent') {
            computedAnnualVal = totalBaseSalaryForYear * (valAnnual / 100);
          } else if (typeAnnual === 'percent_annual') {
            computedAnnualVal = calculatedMonths.reduce((sum, m) => sum + m.gross, 0) * (valAnnual / 100);
          } else if (typeAnnual === 'coef') {
            computedAnnualVal = totalBaseSalaryForYear * valAnnual;
          }

          const type = activeYearData.v2?.settings?.extraAnnualCalcType || 'rub';
          const val = activeYearData.extraBonusAmount || 0;
          let computedVal = val;
          if (type === 'percent') {
            computedVal = totalBaseSalaryForYear * (val / 100);
          } else if (type === 'percent_annual') {
            computedVal = (calculatedMonths.reduce((sum, m) => sum + m.gross, 0) + computedAnnualVal) * (val / 100);
          } else if (type === 'coef') {
            computedVal = totalBaseSalaryForYear * val;
          }

          return (
           <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold border-t border-gray-200 dark:border-gray-700">
            <td colSpan={3} className="px-2 lg:px-3 py-2 text-left align-middle">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-gray-300 text-[11px] lg:text-xs xl:text-sm uppercase tracking-tight">Доп. премия</span>
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[9px] xl:text-[10px] font-bold bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20 leading-none">
                  {type === 'percent' ? '%' : type === 'percent_annual' ? '% Годового' : type === 'coef' ? 'Кф' : '₽'}
                </span>
              </div>
            </td>
            
            {hasAnyBonusColumn && (
              <td className="px-1 py-1.5 lg:py-2 align-middle min-w-[65px] lg:min-w-[80px] group/cell relative">
                {isPrivate ? (
                  <div className="w-full font-mono text-right px-1 py-1 text-[11px] lg:text-xs xl:text-sm text-primary-700 dark:text-primary-400 font-bold"><PrivacyBlur isPrivate={true}>{formatCurrency(computedVal)}</PrivacyBlur></div>
                ) : (
                  type === 'rub' ? (
                    <div className="relative flex flex-col items-end justify-center w-full">
                      <TableInput 
                        value={val} 
                        onChange={(v) => handleAnnualBonusChange('extraBonusAmount', v)} 
                        className="w-full font-mono font-bold text-right bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md px-1 py-1 text-[11px] lg:text-xs xl:text-sm shrink text-primary-700 dark:text-primary-400"
                      />
                    </div>
                  ) : (
                    <CalculatedTableInput 
                      value={val} 
                      computedValue={computedVal} 
                      baseAmount={type === 'percent_annual' ? (calculatedMonths.reduce((sum, m) => sum + m.gross, 0) + computedAnnualVal) : totalBaseSalaryForYear}
                      onChange={(v) => handleAnnualBonusChange('extraBonusAmount', v)} 
                      type={type as any} 
                      label="Доп. премия" 
                      className="px-1.5 py-1 text-[11px] lg:text-xs xl:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md" 
                    />
                  )
                )}
              </td>
            )}

            {activeYearData.v2?.columns.map(col => (
              <td key={col.id} className="px-1 md:px-1.5 py-2 align-middle border-none"></td>
            ))}

            <td className="px-1 py-2 text-right font-mono text-primary-700 dark:text-primary-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[85px] lg:min-w-[95px]">{formatValNoSymbol(computedVal)}</td>
            <td className={cn(
              "pl-1 pr-3 lg:pr-4 py-2 text-right font-mono text-deposit-600 dark:text-deposit-400 align-middle text-[11px] lg:text-xs xl:text-sm whitespace-nowrap min-w-[85px] lg:min-w-[95px]",
              activeYearData.v2?.columns && activeYearData.v2.columns.length > 0 && "sticky right-0 bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-sm z-20 shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)] dark:shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.2)] border-l border-slate-100 dark:border-slate-800"
            )}>{formatValNoSymbol(computedVal * 0.87)}</td>
           </tr>
          );
       })()}

       {/* Total Year Row */}
       <tr className="bg-white/70 dark:bg-black/70 backdrop-blur-2xl font-bold text-slate-950 dark:text-white align-middle sticky bottom-0 z-10 shadow-[0_-1px_0_0_#e2e8f0] dark:shadow-[0_-1px_0_0_#1e293b] border-t border-slate-200 dark:border-slate-700/50">
        <td className="px-2 lg:px-3 py-2 lg:py-3 uppercase tracking-tighter whitespace-nowrap text-left text-[11px] lg:text-xs xl:text-sm">Итого за год</td>
        <td className="px-2 md:px-4 py-2 lg:py-3 text-center align-middle">
          {(() => {
            const totalFactDays = calculatedMonths.reduce((sum, m) => sum + m.factDays, 0);
            const totalNormDays = calculatedMonths.reduce((sum, m) => sum + m.normDays, 0);
            const isDefault = totalFactDays === totalNormDays;
            return (
              <div
                className={cn(
                  "inline-flex items-center justify-center px-1.5 md:px-2 py-1 rounded-md text-[11px] lg:text-xs xl:text-sm font-mono font-bold mx-auto border transition-all min-w-[40px] md:min-w-[45px]",
                  isDefault
                    ? "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-400"
                    : "bg-amber-50/50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30 text-amber-700 dark:text-amber-400"
                )}
                title={isDefault ? "Фактически отработано / Норма" : `Отработано ${totalFactDays} из ${totalNormDays} по норме`}
              >
                {isDefault ? totalFactDays : `${totalFactDays}/${totalNormDays}`}
              </div>
            );
          })()}
        </td>
        <td className="px-2 md:px-4 py-2 lg:py-3 text-right font-mono text-[11px] lg:text-xs xl:text-sm">{formatVal(calculatedMonths.reduce((sum, m) => sum + m.salary, 0))}</td>
        
        {hasAnyBonusColumn && (
          <td className="px-1 py-2 lg:py-3 text-right font-mono text-primary-600 dark:text-primary-400 text-[11px] lg:text-xs xl:text-sm min-w-[65px] lg:min-w-[80px] pr-2">
            <PrivacyBlur isPrivate={isPrivate}>
              <AnimatedCurrency value={
                calculatedMonths.reduce((sum, m) => sum + m.bonus, 0) + 
                (showAnnual ? (activeYearData.annualBonusAmount || 0) : 0) + 
                (showExtraAnnual ? (activeYearData.extraBonusAmount || 0) : 0)
              } />
            </PrivacyBlur>
          </td>
        )}

        {activeYearData.v2?.columns.map(col => (
          <td key={col.id} className="px-2 md:px-4 py-2 lg:py-3 align-middle border-none"></td>
        ))}

        <td className="px-1 py-2 lg:py-3 text-right font-mono text-primary-600 dark:text-primary-400 text-[11px] lg:text-xs xl:text-sm min-w-[85px] lg:min-w-[95px]">
          {<PrivacyBlur isPrivate={isPrivate}><AnimatedCurrency value={yearlyTotals.totalGross} /></PrivacyBlur>}
        </td>
        <td className={cn(
          "pl-1 pr-3 lg:pr-4 py-2 lg:py-3 text-right font-mono text-deposit-600 dark:text-deposit-400 text-[11px] lg:text-xs xl:text-sm min-w-[85px] lg:min-w-[95px]",
          activeYearData.v2?.columns && activeYearData.v2.columns.length > 0 && "sticky right-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm z-20 shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)] dark:shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.2)] border-l border-slate-100 dark:border-slate-800"
        )}>
          {<PrivacyBlur isPrivate={isPrivate}><AnimatedCurrency value={yearlyTotals.finalNet} /></PrivacyBlur>}
        </td>
       </tr>
    </React.Fragment>
  );
};
