import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateTechnicalFactors } from '../src/factors.js';

test('calculateTechnicalFactors returns momentum, volatility, liquidity, and drawdown factors', () => {
  const factors = calculateTechnicalFactors({
    tradeDate: '2026-06-15',
    code: '600519',
    klines: [
      { tradeDate: '2026-06-11', close: 10, amount: 100, high: 11, low: 9 },
      { tradeDate: '2026-06-12', close: 11, amount: 120, high: 12, low: 10 },
      { tradeDate: '2026-06-15', close: 12, amount: 140, high: 13, low: 11 },
    ],
  });

  assert.equal(factors.tradeDate, '2026-06-15');
  assert.equal(factors.code, '600519');
  assert.equal(Number(factors.values.momentum.toFixed(6)), 0.2);
  assert.equal(Number(factors.values.avgAmount.toFixed(6)), 120);
  assert.equal(Number(factors.values.maxDrawdown.toFixed(6)), 0);
  assert.ok(factors.values.volatility > 0);
});

test('calculateTechnicalFactors returns null values when history is insufficient', () => {
  const factors = calculateTechnicalFactors({
    tradeDate: '2026-06-15',
    code: '600519',
    klines: [{ tradeDate: '2026-06-15', close: 12, amount: 140 }],
  });

  assert.equal(factors.values.momentum, null);
  assert.equal(factors.values.volatility, null);
});
