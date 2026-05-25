import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDepositDensity, calculateIncome, calculateIncomeByYears } from './depositCalculations';
import { Deposit } from '../types';

const mockDeposit = (overrides: Partial<Deposit> = {}): Deposit => ({
  bank: 'Test Bank',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-12-31'),
  amount: 1_000_000,
  currency: '₽',
  rate: 10,
  formula: 'simple_days',
  isClosed: false,
  isArchived: false,
  splitIncome: false,
  ...overrides
});

test('calculateDepositDensity: correctly calculates amount and counters', () => {
  const deposits = [
    mockDeposit({ 
      startDate: new Date('2026-06-01'), 
      endDate: new Date('2026-06-05'),
      amount: 500_000 
    })
  ];
  
  const result = calculateDepositDensity(deposits, 2026);
  
  // Test max amount
  assert.equal(result.maxAmount, 500_000);
  
  // Test specific days
  const day1 = result.days['2026-06-01'];
  assert.equal(day1.amount, 500_000);
  assert.equal(day1.openingCount, 1);
  assert.equal(day1.maturingCount, 0);
  
  const day5 = result.days['2026-06-05'];
  assert.equal(day5.amount, 500_000);
  assert.equal(day5.openingCount, 0);
  assert.equal(day5.maturingCount, 1);
  
  const dayOut = result.days['2026-05-31'];
  assert.equal(dayOut.amount, 0);
});

test('calculateIncome: simple interest', () => {
  const deposit = mockDeposit({
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-31'), // 30 days
    amount: 100_000,
    rate: 10,
    formula: 'simple_days'
  });
  
  const income = calculateIncome(deposit);
  const expected = (100_000 * (10 / 100) * 30) / 365;
  assert.equal(income, expected);
});

test('calculateIncome: compound interest', () => {
  const deposit = mockDeposit({
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-02-01'), // 31 days
    amount: 100_000,
    rate: 10,
    formula: 'compound_monthly'
  });
  
  const income = calculateIncome(deposit);
  
  // New exact logic: it iterates monthly. 
  // Jan 1 to Feb 1 is exactly 1 month. 
  // Days difference = 31.
  // Period interest = (100000 * (10 / 100) * 31) / 365
  const periodInterest = (100_000 * (10 / 100) * 31) / 365;
  const expected = periodInterest; // only 1 period since we end exactly on the 1st next month
  
  assert.ok(Math.abs(income - expected) < 0.001);
});

test('calculateIncomeByYears: handles splitIncome correctly', () => {
  const deposit = mockDeposit({
    startDate: new Date('2025-12-01'),
    endDate: new Date('2026-01-31'),
    amount: 100_000,
    rate: 12,
    splitIncome: true
  });
  
  const results = calculateIncomeByYears(deposit);
  assert.equal(results.length, 2);
  assert.equal(results[0].year, 2025);
  assert.equal(results[1].year, 2026);
  
  const total = results[0].income + results[1].income;
  assert.ok(Math.abs(total - calculateIncome(deposit)) < 0.01);
});
