import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateUnifiedFinance } from './unifiedFinance';
import { Deposit, TaxBracket, TaxYearSettings, YearData } from '../types';

const buildYearData = (): YearData => ({
  year: 2026,
  additionalIncome: 0,
  bonusBase: 100000,
  months: Array.from({ length: 12 }, () => ({
    normDays: 20,
    factDays: 20,
    salary: 100000
  })),
  quarters: Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 })),
  annualBonusCoef: 0,
  annualBonusAmount: 0,
  extraBonusAmount: 0,
  deductions: { social: 0, property: 0, standard: 0 },
  iisContribution: 0
});

const deposit: Deposit = {
  bank: 'Test Bank',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-12-31'),
  amount: 1_000_000,
  currency: '₽',
  rate: 10,
  formula: 'simple_days',
  isClosed: true,
  splitIncome: false
};

const taxBrackets: Record<number, TaxBracket[]> = {
  2026: [
    { limit: 1_000_000, rate: 0.1, label: '10%' },
    { limit: Infinity, rate: 0.2, label: '20%' }
  ]
};

const taxSettings: TaxYearSettings[] = [{ year: 2026, limit: 50_000, ndflRate: 13 }];

test('calculateUnifiedFinance: salary mode excludes deposits from totalGross', () => {
  const result = calculateUnifiedFinance({
    selectedYear: 2026,
    yearData: buildYearData(),
    deposits: [deposit],
    taxSettings,
    taxBrackets,
    includeDeposits: false
  });

  assert.equal(result.salaryGross, 1_200_000);
  assert.equal(result.depositsIncome, 0);
  assert.equal(result.totalGross, 1_200_000);
  assert.equal(result.taxableDepositIncome, 0);
});

test('calculateUnifiedFinance: combined mode includes deposit income and taxable base', () => {
  const result = calculateUnifiedFinance({
    selectedYear: 2026,
    yearData: buildYearData(),
    deposits: [deposit],
    taxSettings,
    taxBrackets,
    includeDeposits: true
  });

  assert.ok(result.depositsIncome > 0);
  assert.ok(result.totalGross > result.salaryGross);
  assert.ok(result.taxableDepositIncome > 0);
  assert.equal(result.depositLimit, 50_000);
});

test('calculateUnifiedFinance: deductions reduce total tax', () => {
  const base = calculateUnifiedFinance({
    selectedYear: 2026,
    yearData: buildYearData(),
    deposits: [],
    taxSettings,
    taxBrackets,
    includeDeposits: false
  });

  const withDeductions = calculateUnifiedFinance({
    selectedYear: 2026,
    yearData: {
      ...buildYearData(),
      iisContribution: 100_000,
      deductions: { social: 50_000, property: 0, standard: 0 }
    },
    deposits: [],
    taxSettings,
    taxBrackets,
    includeDeposits: false
  });

  assert.ok(withDeductions.totalTax < base.totalTax);
  assert.ok(withDeductions.totalNet > base.totalNet);
});

test('calculateUnifiedFinance: works safely when yearData is missing', () => {
  const result = calculateUnifiedFinance({
    selectedYear: 2026,
    yearData: undefined,
    deposits: [],
    taxSettings,
    taxBrackets,
    includeDeposits: false
  });

  assert.equal(result.salaryGross, 0);
  assert.equal(result.totalGross, 0);
  assert.equal(result.totalTax, 0);
  assert.equal(result.totalNet, 0);
});

test('calculateUnifiedFinance: splitIncome deposit allocates income by selected year', () => {
  const splitDeposit: Deposit = {
    ...deposit,
    startDate: new Date('2026-10-01'),
    endDate: new Date('2027-04-01'),
    splitIncome: true
  };

  const result2026 = calculateUnifiedFinance({
    selectedYear: 2026,
    yearData: buildYearData(),
    deposits: [splitDeposit],
    taxSettings,
    taxBrackets,
    includeDeposits: true
  });

  const result2027 = calculateUnifiedFinance({
    selectedYear: 2027,
    yearData: {
      ...buildYearData(),
      year: 2027
    },
    deposits: [splitDeposit],
    taxSettings: [{ year: 2027, limit: 50_000, ndflRate: 13 }],
    taxBrackets: {
      ...taxBrackets,
      2027: taxBrackets[2026]
    },
    includeDeposits: true
  });

  assert.ok(result2026.depositsIncome > 0);
  assert.ok(result2027.depositsIncome > 0);
  assert.ok(Math.abs((result2026.depositsIncome + result2027.depositsIncome) - (calculateUnifiedFinance({
    selectedYear: 2027,
    yearData: undefined,
    deposits: [{ ...splitDeposit, splitIncome: false }],
    taxSettings: [{ year: 2027, limit: 50_000, ndflRate: 13 }],
    taxBrackets: { 2027: taxBrackets[2026] },
    includeDeposits: true
  }).depositsIncome)) < 2);
});
