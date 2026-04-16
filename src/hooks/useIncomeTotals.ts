import { useMemo } from 'react';
import { Deposit, SimulationState, TaxBracket, TaxYearSettings, YearData, YearlyTotals } from '../types';
import { calculateUnifiedFinance, UnifiedFinanceResult } from '../lib/unifiedFinance';
import { IncomeCalculationMode } from './useIncomeCalculationMode';

interface UseIncomeTotalsInput {
  activeYear: number;
  activeYearData: YearData;
  prevYearData?: YearData;
  deposits: Deposit[];
  taxSettings: TaxYearSettings[];
  taxBrackets: Record<number, TaxBracket[]>;
  simulation?: SimulationState;
  calculationMode: IncomeCalculationMode;
}

export interface IncomeTotalsResult {
  yearlyTotals: YearlyTotals;
  prevYearTotals: UnifiedFinanceResult | null;
  grossDiff: number | null;
  netDiff: number | null;
}

export function calculateIncomeTotals({
  activeYear,
  activeYearData,
  prevYearData,
  deposits,
  taxSettings,
  taxBrackets,
  simulation,
  calculationMode
}: UseIncomeTotalsInput): IncomeTotalsResult {
  const yearlyFinance = calculateUnifiedFinance({
    selectedYear: activeYear,
    yearData: activeYearData,
    deposits,
    taxSettings,
    taxBrackets,
    simulation,
    includeDeposits: calculationMode === 'combined'
  });

  const { totalGross, totalTax: progressiveTax, totalNet: finalNet, totalDeductions } = yearlyFinance;
  const flatTax = Math.max(0, totalGross - totalDeductions) * 0.13;
  const flatNet = totalGross - flatTax;
  const effectiveRate = totalGross > 0 ? (progressiveTax / totalGross) * 100 : 0;
  const taxDifference = progressiveTax - flatTax;

  const yearlyTotals: YearlyTotals = {
    totalGross,
    progressiveTax,
    flatTax,
    finalNet,
    flatNet,
    effectiveRate,
    taxDifference,
    brackets: yearlyFinance.brackets
  };

  const prevYearTotals = prevYearData
    ? calculateUnifiedFinance({
        selectedYear: activeYear - 1,
        yearData: prevYearData,
        deposits,
        taxSettings,
        taxBrackets,
        includeDeposits: calculationMode === 'combined'
      })
    : null;

  const grossDiff = prevYearTotals ? yearlyTotals.totalGross - prevYearTotals.totalGross : null;
  const netDiff = prevYearTotals ? yearlyTotals.finalNet - prevYearTotals.totalNet : null;

  return { yearlyTotals, prevYearTotals, grossDiff, netDiff };
}

export function useIncomeTotals(input: UseIncomeTotalsInput) {
  return useMemo(
    () => calculateIncomeTotals(input),
    [
      input.activeYear,
      input.activeYearData,
      input.prevYearData,
      input.deposits,
      input.taxSettings,
      input.taxBrackets,
      input.simulation,
      input.calculationMode
    ]
  );
}
