import test from 'node:test';
import assert from 'node:assert/strict';

import { selectCandidates } from '../src/candidates.js';

test('selectCandidates returns top scored rows with position sizing metadata', () => {
  const candidates = selectCandidates({
    tradeDate: '2026-06-15',
    capital: 20000,
    maxPositions: 2,
    scores: [
      { code: '600519', name: '贵州茅台', score: 0.9, rank: 1 },
      { code: '000001', name: '平安银行', score: 0.5, rank: 2 },
      { code: '300750', name: '宁德时代', score: 0.4, rank: 3 },
    ],
  });

  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].suggestedCapital, 10000);
  assert.equal(candidates[1].suggestedCapital, 10000);
});
