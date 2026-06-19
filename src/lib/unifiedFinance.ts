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
    const projectionBaseSalary = sim.projectedSalary || (yearData?.bonusBase || 0);
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
      let isActual = m.salary > 0;
      
      let base: number;
      if (isActual) {
        // For actual months, we don't apply the projection increase, 
        base = m.factDays < m.normDays ? m.salary * (m.factDays / m.normDays) : m.salary;
      } else if (isSimActive) {
        // For projected months, use bonusBase (standard salary) and apply salaryIncrease
        const projectedSalary = yearData.bonusBase * salaryMult;
        base = projectedSalary;
      } else {
        base = 0;
      }

      let bonus = 0;
      const showQuarterly = yearData.v2?.settings?.showQuarterly ?? true;
      if (showQuarterly && index % 3 === 2) {
        const qIndex = Math.floor(index / 3);
        const qData = yearData.quarters?.[qIndex];
        const val = qData?.bonusAmount || 0;

        if (val > 0) {
          const type = yearData.v2?.settings?.quarterCalcType || 'rub';
          const calcBase = yearData.bonusBase || 0;
          if (type === 'percent') {
            bonus = calcBase * (val / 100) * bonusMult;
          } else if (type === 'coef') {
            bonus = calcBase * val * bonusMult;
          } else {
            // fallback rub
            bonus = val * bonusMult;
          }
        }
      }
      
      let mGross = base + bonus;
      
      // V2 dynamic columns
      if (yearData.v2) {
        const v2Month = yearData.v2.months[index];
        const mainVal = v2Month?.values?.['system_main_bonus'] || 0;
        const mainType = yearData.v2.settings?.mainCalcType || 'rub';
        if (mainType === 'percent') {
          mGross += base * (mainVal / 100);
        } else if (mainType === 'coef') {
          mGross += base * mainVal;
        } else {
          mGross += mainVal;
        }
        
        yearData.v2.columns.forEach(col => {
          const val = v2Month?.values?.[col.id] || 0;
          if (col.type === 'rub') {
            mGross += val;
          } else if (col.type === 'percent_base') {
            mGross += base * (val / 100);
          }
        });
      }
      
      return mGross;
    });

    const showAnnual = yearData.v2?.settings?.showAnnual ?? true;
    const showExtraAnnual = yearData.v2?.settings?.showExtraAnnual ?? true;
    
    // Calculate total base salary for the year to apply % or coef for annual bonuses
    const totalBaseSalaryForYear = calcMonths.reduce((sum, m, i) => {
      let isActual = yearData.months[i].salary > 0;
      let base = 0;
      if (isActual) {
        base = yearData.months[i].factDays < yearData.months[i].normDays ? yearData.months[i].salary * (yearData.months[i].factDays / yearData.months[i].normDays) : yearData.months[i].salary;
      } else if (isSimActive) {
        base = yearData.bonusBase * salaryMult;
      }
      return sum + base;
    }, 0);

    let annualBonusFinal = 0;
    if (showAnnual && (yearData.annualBonusAmount || 0) > 0) {
      const type = yearData.v2?.settings?.annualCalcType || 'rub';
      const val = yearData.annualBonusAmount || 0;
      if (type === 'percent') {
        annualBonusFinal = totalBaseSalaryForYear * (val / 100) * bonusMult;
      } else if (type === 'percent_annual') {
        annualBonusFinal = calcMonths.reduce((sum, m) => sum + m, 0) * (val / 100) * bonusMult;
      } else if (type === 'coef') {
        annualBonusFinal = totalBaseSalaryForYear * val * bonusMult;
      } else {
        annualBonusFinal = val * bonusMult;
      }
    }

    let extraAnnualBonusFinal = 0;
    if (showExtraAnnual && (yearData.extraBonusAmount || 0) > 0) {
      const type = yearData.v2?.settings?.extraAnnualCalcType || 'rub';
      const val = yearData.extraBonusAmount || 0;
      if (type === 'percent') {
        extraAnnualBonusFinal = totalBaseSalaryForYear * (val / 100) * bonusMult;
      } else if (type === 'percent_annual') {
        extraAnnualBonusFinal = (calcMonths.reduce((sum, m) => sum + m, 0) + annualBonusFinal) * (val / 100) * bonusMult;
      } else if (type === 'coef') {
        extraAnnualBonusFinal = totalBaseSalaryForYear * val * bonusMult;
      } else {
        extraAnnualBonusFinal = val * bonusMult;
      }
    }

    salaryGross = calcMonths.reduce((sum, m) => sum + m, 0) +
      annualBonusFinal +
      extraAnnualBonusFinal +
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
