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
      if (deposit.isArchived) continue;
      const yearIncome = calculateIncomeByYears(deposit).find(yi => Number(yi.year) === Number(selectedYear))?.income || 0;
      depositsIncome += yearIncome;
    }
  }

  const currentYearSettings = taxSettings.find(s => Number(s.year) === Number(selectedYear)) || { year: Number(selectedYear), limit: 210000, ndflRate: 13 };
  const taxableDepositIncome = Math.max(0, depositsIncome - currentYearSettings.limit);

  const sim = simulation;
  const isSimActive = sim?.isActive;
  const salaryMult = isSimActive ? (1 + (sim.salaryIncrease || 0) / 100) : 1;
  const bonusMult = isSimActive ? (sim.bonusMultiplier || 1) : 1;
  const extraSimIncome = isSimActive ? (sim.extraIncome || 0) : 0;

  let salaryGross = 0;
  if (isSimActive) {
    const projectionBaseSalary = sim.projectedSalary || (yearData?.bonusBase || 169500);
    const displaySalary = projectionBaseSalary * salaryMult;
    
    let simulatedSalaryGross = 0;
    for (let i = 1; i <= 12; i++) {
      let bonus = 0;
      if (sim.bonusFrequency === 'monthly') {
        bonus = sim.bonusType === 'fixed' ? (sim.bonusValue || 0) : (projectionBaseSalary * (sim.bonusValue || 0));
      } else if (sim.bonusFrequency === 'quarterly' && i % 3 === 0) {
        bonus = sim.bonusType === 'fixed' ? (sim.bonusValue || 0) : (projectionBaseSalary * (sim.bonusValue || 0));
      } else if (sim.bonusFrequency === 'annual' && i === 12) {
        bonus = sim.bonusType === 'fixed' ? (sim.bonusValue || 0) : (projectionBaseSalary * (sim.bonusValue || 0));
      }
      
      simulatedSalaryGross += displaySalary + (bonus * bonusMult);
    }
    salaryGross = simulatedSalaryGross + extraSimIncome;
  } else if (yearData) {
    const calcMonths = yearData.months.map((m, index) => {
      // Logic for Option A: Actuals + Projections
      // If month has salary entered, use it as Actual. 
      // If it's 0, it's a Projected month.
      const isActual = m.salary > 0;
      
      let base: number;
      if (isActual) {
        // For actual months, we don't apply the projection increase, 
        // as they have real values entered.
        base = m.factDays < m.normDays ? m.salary * (m.factDays / m.normDays) : m.salary;
      } else if (isSimActive) {
        // For projected months, use bonusBase (standard salary) and apply salaryIncrease
        const projectedSalary = yearData.bonusBase * salaryMult;
        // Assume full attendance for projected months (1.0 KRD)
        base = projectedSalary;
      } else {
        // If not actual and not simulating, salary is 0
        base = 0;
      }

      let bonus = 0;
      if (index % 3 === 2) {
        const qIndex = Math.floor(index / 3);
        const qData = yearData.quarters?.[qIndex];
        const hasActualBonus = (qData?.bonusAmount || 0) > 0;

        if (hasActualBonus) {
          // If bonus is entered, apply the multiplier to it
          bonus = qData.bonusAmount * bonusMult;
        } else if (isSimActive && (qData?.bonusCoef || 0) > 0) {
          // If bonus is not entered but simulation is active and a coef exists, project it
          // For the projection, we use the bonusBase and bonusMult
          // We also need to decide on KRD for projection. Let's use 1.0.
          bonus = yearData.bonusBase * qData.bonusCoef * bonusMult;
        }
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
