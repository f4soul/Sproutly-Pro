import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProgressiveTaxDetailed } from './taxCalculator';
import { TaxBracket } from '../types';

const mockBrackets: Record<number, TaxBracket[]> = {
  2025: [
    { limit: 5_000_000, rate: 0.13, label: '13%' },
    { limit: Infinity, rate: 0.15, label: '15%' }
  ],
  2026: [
    { limit: 2_400_000, rate: 0.13, label: '13%' },
    { limit: 5_000_000, rate: 0.15, label: '15%' },
    { limit: 20_000_000, rate: 0.18, label: '18%' },
    { limit: 50_000_000, rate: 0.20, label: '20%' },
    { limit: Infinity, rate: 0.22, label: '22%' }
  ]
};

test('calculateProgressiveTaxDetailed: simple 13% bracket in 2025', () => {
  const amount = 1_000_000;
  const result = calculateProgressiveTaxDetailed(amount, 2025, mockBrackets);
  
  assert.equal(result.tax, amount * 0.13);
  assert.equal(result.brackets.length, 1);
  assert.equal(result.brackets[0].rate, 13);
});

test('calculateProgressiveTaxDetailed: progressive jump in 2025 (above 5M)', () => {
  const amount = 6_000_000;
  // 5,000,000 * 0.13 = 650,000
  // 1,000,000 * 0.15 = 150,000
  // Total = 800,000
  const result = calculateProgressiveTaxDetailed(amount, 2025, mockBrackets);
  
  assert.equal(result.tax, 800_000);
  assert.equal(result.brackets.length, 2);
  assert.equal(result.brackets[1].rate, 15);
  assert.equal(result.brackets[1].tax, 150_000);
});

test('calculateProgressiveTaxDetailed: progressive scale in 2026', () => {
  const amount = 3_000_000;
  // 2,400,000 * 0.13 = 312,000
  // 600,000 * 0.15 = 90,000
  // Total = 402,000
  const result = calculateProgressiveTaxDetailed(amount, 2026, mockBrackets);
  
  assert.equal(result.tax, 402_000);
  assert.equal(result.brackets.length, 2);
  assert.equal(result.brackets[0].amount, 2_400_000);
  assert.equal(result.brackets[1].amount, 600_000);
});

test('calculateProgressiveTaxDetailed: applies deduction correctly', () => {
  const amount = 3_000_000;
  const deduction = 500_000;
  // Taxable base = 2,500_000
  // 2,400,000 * 0.13 = 312,000
  // 100,000 * 0.15 = 15,000
  // Total = 327,000
  const result = calculateProgressiveTaxDetailed(amount, 2026, mockBrackets, deduction);
  
  assert.equal(result.tax, 327_000);
});
