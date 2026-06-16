import test from 'node:test';
import assert from 'node:assert/strict';

import { rankScores, scoreStocks } from '../src/scoring.js';

test('scoreStocks combines normalized factors into ranked score rows', () => {
  const rows = scoreStocks({
    tradeDate: '2026-06-15',
    strategyName: 'baseline-v1',
    factorsByCode: [
      {
        code: '600519',
        name: '贵州茅台',
        values: { momentum: 0.2, avgAmount: 100, volatility: 0.01, northboundAdd: 10 },
      },
      {
        code: '000001',
        name: '平安银行',
        values: { momentum: -0.1, avgAmount: 200, volatility: 0.05, northboundAdd: -5 },
      },
    ],
  });

  assert.equal(rows.length, 2);
  assert.equal(rows[0].code, '600519');
  assert.equal(rows[0].rank, 1);
  assert.ok(rows[0].score > rows[1].score);
});

test('rankScores assigns stable ranks for equal scores by code', () => {
  const ranked = rankScores([
    { tradeDate: '2026-06-15', strategyName: 'x', code: '000002', score: 1 },
    { tradeDate: '2026-06-15', strategyName: 'x', code: '000001', score: 1 },
  ]);

  assert.deepEqual(ranked.map((row) => row.code), ['000001', '000002']);
  assert.deepEqual(ranked.map((row) => row.rank), [1, 2]);
});
