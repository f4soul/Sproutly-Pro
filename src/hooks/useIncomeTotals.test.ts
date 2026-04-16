import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateIncomeTotals } from './useIncomeTotals';
import { Deposit, TaxBracket, TaxYearSettings, YearData } from '../types';

const makeYearData = (year: number, salary: number): YearData => ({
  year,
  additionalIncome: 0,
  bonusBase: 100_000,
  months: Array.from({ length: 12 }, () => ({
    normDays: 20,
    factDays: 20,
    salary
  })),
  quarters: Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 })),
  annualBonusCoef: 0,
  annualBonusAmount: 0,
  extraBonusAmount: 0,
  deductions: { social: 0, property: 0, standard: 0 },
  iisContribution: 0
});

const deposits: Deposit[] = [
  {
    bank: 'Test Bank',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    amount: 1_000_000,
    currency: '₽',
    rate: 10,
    formula: 'simple_days',
    isClosed: true,
    splitIncome: false
  }
];

const taxBrackets: Record<number, TaxBracket[]> = {
  2025: [
    { limit: 1_000_000, rate: 0.1, label: '10%' },
    { limit: Infinity, rate: 0.2, label: '20%' }
  ],
  2026: [
    { limit: 1_000_000, rate: 0.1, label: '10%' },
    { limit: Infinity, rate: 0.2, label: '20%' }
  ]
};

const taxSettings: TaxYearSettings[] = [
  { year: 2025, limit: 50_000, ndflRate: 13 },
  { year: 2026, limit: 50_000, ndflRate: 13 }
];

test('calculateIncomeTotals: combined mode includes deposits while salary mode excludes them', () => {
  const activeYearData = makeYearData(2026, 100_000);

  const salaryMode = calculateIncomeTotals({
    activeYear: 2026,
    activeYearData,
    deposits,
    taxSettings,
    taxBrackets,
    calculationMode: 'salary'
  });

  const combinedMode = calculateIncomeTotals({
    activeYear: 2026,
    activeYearData,
    deposits,
    taxSettings,
    taxBrackets,
    calculationMode: 'combined'
  });

  assert.equal(salaryMode.yearlyTotals.totalGross, 1_200_000);
  assert.ok(combinedMode.yearlyTotals.totalGross > salaryMode.yearlyTotals.totalGross);
});

test('calculateIncomeTotals: returns grossDiff/netDiff against previous year', () => {
  const result = calculateIncomeTotals({
    activeYear: 2026,
    activeYearData: makeYearData(2026, 120_000),
    prevYearData: makeYearData(2025, 100_000),
    deposits: [],
    taxSettings,
    taxBrackets,
    calculationMode: 'salary'
  });

  assert.ok(result.grossDiff !== null);
  assert.ok(result.netDiff !== null);
  assert.ok((result.grossDiff || 0) > 0);
  assert.ok((result.netDiff || 0) > 0);
});

test('calculateIncomeTotals: returns null diffs when prevYearData is missing', () => {
  const result = calculateIncomeTotals({
    activeYear: 2026,
    activeYearData: makeYearData(2026, 100_000),
    deposits: [],
    taxSettings,
    taxBrackets,
    calculationMode: 'salary'
  });

  assert.equal(result.prevYearTotals, null);
  assert.equal(result.grossDiff, null);
  assert.equal(result.netDiff, null);
});
