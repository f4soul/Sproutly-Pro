import { Deposit, SimulationState, TaxBracket, TaxBracketDetail, TaxYearSettings, YearData } from '../types';
import { calculateIncomeByYears } from './depositCalculations';
import { calculateProgressiveTaxDetailed } from './taxCalculator';

interface UnifiedFinanceInput {
  selectedYear: number;
  yearData?: YearData;
  deposits: Deposit[];
  taxSettings: TaxYearSettings[];
  taxBrackets: Record<number, TaxBracket[]>;
  simulation?: SimulationState;
  includeDeposits?: boolean;
}

export interface UnifiedFinanceResult {
  salaryGross: number;
  salaryTax: number;
  salaryNet: number;
  depositsIncome: number;
  depositsTax: number;
  depositsNet: number;
  taxableDepositIncome: number;
  totalDeductions: number;
  totalGross: number;
  totalTax: number;
  totalNet: number;
  effectiveRate: number;
  depositLimit: number;
  brackets: TaxBracketDetail[];
}

export function calculateUnifiedFinance({
  selectedYear,
  yearData,
  deposits,
  taxSettings,
  taxBrackets,
  simulation,
  includeDeposits = true
}: UnifiedFinanceInput): UnifiedFinanceResult {
  let depositsIncome = 0;
  if (includeDeposits) {
    for (const deposit of deposits) {
      const yearIncome = calculateIncomeByYears(deposit).find(yi => yi.year === selectedYear)?.income || 0;
      depositsIncome += yearIncome;
    }
  }

  const currentYearSettings = taxSettings.find(s => s.year === selectedYear) || { year: selectedYear, limit: 210000, ndflRate: 13 };
  const taxableDepositIncome = Math.max(0, depositsIncome - currentYearSettings.limit);

  const sim = simulation;
  const isSimActive = sim?.isActive;
  const salaryMult = isSimActive ? (1 + (sim.salaryIncrease || 0) / 100) : 1;
  const bonusMult = isSimActive ? (sim.bonusMultiplier || 1) : 1;
  const extraSimIncome = isSimActive ? (sim.extraIncome || 0) : 0;

  let salaryGross = 0;
  if (yearData) {
    const calcMonths = yearData.months.map((m, index) => {
      const baseSalary = m.salary * salaryMult;
      const base = m.factDays < m.normDays ? baseSalary * (m.factDays / m.normDays) : baseSalary;
      let bonus = 0;
      if (index % 3 === 2) {
        const qIndex = Math.floor(index / 3);
        bonus += (yearData.quarters?.[qIndex]?.bonusAmount || 0) * bonusMult;
      }
      return base + bonus;
    });

    salaryGross = calcMonths.reduce((sum, m) => sum + m, 0) +
      ((yearData.annualBonusAmount || 0) * bonusMult) +
      ((yearData.extraBonusAmount || 0) * bonusMult) +
      (yearData.additionalIncome || 0) +
      extraSimIncome;
  }

  const totalDeductions = (yearData?.iisContribution || 0) +
    (yearData?.deductions?.social || 0) +
    (yearData?.deductions?.property || 0) +
    (yearData?.deductions?.standard || 0);

  const totalTaxableIncome = salaryGross + taxableDepositIncome;
  const { tax: totalTax, brackets } = calculateProgressiveTaxDetailed(totalTaxableIncome, selectedYear, taxBrackets, totalDeductions);
  const { tax: salaryTax } = calculateProgressiveTaxDetailed(salaryGross, selectedYear, taxBrackets, totalDeductions);
  const depositsTax = totalTax - salaryTax;

  const salaryNet = salaryGross - salaryTax;
  const depositsNet = depositsIncome - depositsTax;
  const totalGross = salaryGross + depositsIncome;
  const totalNet = salaryNet + depositsNet;
  const effectiveRate = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;

  return {
    salaryGross,
    salaryTax,
    salaryNet,
    depositsIncome,
    depositsTax,
    depositsNet,
    taxableDepositIncome,
    totalDeductions,
    totalGross,
    totalTax,
    totalNet,
    effectiveRate,
    depositLimit: currentYearSettings.limit,
    brackets
  };
}
