import { differenceInDays, startOfYear, endOfYear, getYear, min, max } from 'date-fns';
import { Deposit } from '../types';

export function calculateIncome(deposit: Deposit): number {
  if (!deposit.endDate || !deposit.startDate) return 0;
  
  const startDate = new Date(deposit.startDate);
  const endDate = new Date(deposit.endDate);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
  
  const days = differenceInDays(endDate, startDate);
  if (days <= 0) return 0;
  
  switch (deposit.formula) {
    case 'simple_days':
    case 'simple_months':
    case 'daily_balance':
    case 'min_balance':
      // Simple interest: (Amount * Rate * Days) / (365 * 100)
      return (deposit.amount * deposit.rate * days) / (365 * 100);
    case 'compound_monthly': {
      // Compound monthly: Amount * (1 + Rate/100/12)^(Days/30.4166) - Amount
      const monthsCompound = days / 30.4166;
      const monthlyRate = deposit.rate / 100 / 12;
      return deposit.amount * (Math.pow(1 + monthlyRate, monthsCompound) - 1);
    }
    case '':
    default:
      return 0;
  }
}

export interface YearIncome {
  year: number;
  income: number;
}

export function calculateIncomeByYears(deposit: Deposit): YearIncome[] {
  if (!deposit.endDate || !deposit.startDate) return [];
  
  const startDate = new Date(deposit.startDate);
  const endDate = new Date(deposit.endDate);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
  
  const totalIncome = calculateIncome(deposit);
  if (!deposit.splitIncome) {
    // All income belongs to the year of closing
    return [{ year: getYear(endDate), income: totalIncome }];
  }

  const startYear = getYear(startDate);
  const endYear = getYear(endDate);
  const totalDays = differenceInDays(endDate, startDate);
  
  if (totalDays === 0) return [];

  const results: YearIncome[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));
    
    const overlapStart = max([startDate, yearStart]);
    const overlapEnd = min([endDate, yearEnd]);
    
    if (overlapStart < overlapEnd) {
      const overlapDays = differenceInDays(overlapEnd, overlapStart) + (year === endYear ? 0 : 1);
      const yearIncome = (overlapDays / totalDays) * totalIncome;
      results.push({ year, income: yearIncome });
    }
  }
  
  return results;
}

export function calculateTax(totalIncome: number, limit: number, rate: number): number {
  const taxableBase = Math.max(0, totalIncome - limit);
  // Progressive rate logic (if income > 5M, but here we use the provided rate)
  return taxableBase * (rate / 100);
}
