import { differenceInDays, startOfYear, endOfYear, getYear, min, max, eachDayOfInterval, format, isWithinInterval, isSameDay } from 'date-fns';
import { Deposit, HeatmapData, DayDensity } from '../types';

export function calculateDepositDensity(deposits: Deposit[], year: number): HeatmapData {
  const startDate = startOfYear(new Date(year, 0, 1));
  const endDate = endOfYear(new Date(year, 0, 1));
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const heatmap: Record<string, DayDensity> = {};
  
  let globalMax = 0;
  let globalMin = Infinity;

  // Filter deposits that are active or relative to this year
  const relevantDeposits = deposits.filter(d => {
    if (d.isArchived) return false;
    const dStart = new Date(d.startDate);
    const dEnd = d.endDate ? new Date(d.endDate) : new Date(year + 10, 0, 1);
    
    return dStart <= endDate && dEnd >= startDate;
  });

  days.forEach(day => {
    const dateKey = format(day, 'yyyy-MM-dd');
    let totalAmount = 0;
    let activeCount = 0;
    let maturingCount = 0;
    let openingCount = 0;
    const maturingNames: { bank: string; amount: number }[] = [];
    const openingNames: { bank: string; amount: number }[] = [];

    relevantDeposits.forEach(d => {
      const dStart = new Date(d.startDate);
      const dEnd = d.endDate ? new Date(d.endDate) : null;

      // Opening today
      if (isSameDay(day, dStart)) {
        openingCount++;
        openingNames.push({ bank: d.bank, amount: d.amount });
      }

      // Maturing today
      if (dEnd && isSameDay(day, dEnd)) {
        maturingCount++;
        maturingNames.push({ bank: d.bank, amount: d.amount });
      }

      // Is deposit active today?
      const isActive = dEnd 
        ? isWithinInterval(day, { start: dStart, end: dEnd })
        : day >= dStart;

      if (isActive) {
        totalAmount += d.amount;
        activeCount++;
      }
    });

    heatmap[dateKey] = {
      date: dateKey,
      amount: totalAmount,
      count: activeCount,
      maturingCount,
      openingCount,
      maturingNames,
      openingNames
    };

    if (totalAmount > globalMax) globalMax = totalAmount;
    if (totalAmount > 0 && totalAmount < globalMin) globalMin = totalAmount;
  });

  return {
    days: heatmap,
    maxAmount: globalMax,
    minAmount: globalMin === Infinity ? 0 : globalMin
  };
}

export function isDepositClosed(deposit: Deposit): boolean {
  if (deposit.isClosed) return true;
  if (!deposit.endDate) return false;
  
  const end = new Date(deposit.endDate);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return today >= end;
}

function getDaysInYear(year: number) {
  return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
}

function calculateExactSimpleInterest(amount: number, rate: number, startDate: Date, endDate: Date): number {
  let interest = 0;
  let current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current < end) {
    const year = current.getFullYear();
    const daysInYr = getDaysInYear(year);
    
    const nextYear = new Date(year + 1, 0, 1);
    const next = nextYear < end ? nextYear : end;
    
    const daysOverlapping = differenceInDays(next, current);
    interest += (amount * (rate / 100) * daysOverlapping) / daysInYr;
    
    current = next;
  }
  
  return interest;
}

function calculateExactCompoundInterest(amount: number, rate: number, startDate: Date, endDate: Date): number {
  let balance = amount;
  let current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  // Capitalization is usually scheduled monthly.
  while (current < end) {
    let nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
    
    // Some months don't have the same day (e.g. going from Jan 31 to Feb 31 -> auto rolls over to Mar 2 or 3 in JS)
    // To handle this strictly, usually banks cap at the last day of the target month.
    // But `new Date(year, month + 1, 0)` is the last day of that month.
    const expectedMonth = (current.getMonth() + 1) % 12;
    if (nextMonth.getMonth() !== expectedMonth) {
      nextMonth = new Date(current.getFullYear(), current.getMonth() + 2, 0); // last day of next month
    }
    
    if (nextMonth > end) {
      nextMonth = end;
    }

    const year = current.getFullYear();
    const nextYear = nextMonth.getFullYear();

    let periodInterest = 0;
    if (year === nextYear) {
      const days = differenceInDays(nextMonth, current);
      periodInterest = (balance * (rate / 100) * days) / getDaysInYear(year);
    } else {
      const nextYearStart = new Date(nextYear, 0, 1);
      const daysY1 = differenceInDays(nextYearStart, current);
      const daysY2 = differenceInDays(nextMonth, nextYearStart);
      periodInterest = (balance * (rate / 100) * daysY1) / getDaysInYear(year) +
                       (balance * (rate / 100) * daysY2) / getDaysInYear(nextYear);
    }

    balance += periodInterest;
    current = nextMonth;
  }

  return balance - amount;
}

export function calculateIncome(deposit: Deposit): number {
  if (deposit.factIncome !== undefined && deposit.factIncome !== null) {
    return deposit.factIncome;
  }
  
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
      return calculateExactSimpleInterest(deposit.amount, deposit.rate, startDate, endDate);
    case 'compound_monthly':
      return calculateExactCompoundInterest(deposit.amount, deposit.rate, startDate, endDate);
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
