import test from 'node:test';
import assert from 'node:assert/strict';

import { parseUpdateDailyArgs } from '../src/cli/updateDailyArgs.js';

test('parseUpdateDailyArgs maps command arguments to update service options', () => {
  assert.deepEqual(
    parseUpdateDailyArgs([
      '--date=2026-06-17',
      '--db=data/custom.sqlite',
      '--symbols=600519,000001',
      '--initial-start=20200101',
      '--adjust=hfq',
      '--concurrency=3',
    ]),
    {
      tradeDate: '2026-06-17',
      dbPath: 'data/custom.sqlite',
      symbols: ['600519', '000001'],
      initialStart: '20200101',
      quoteOptions: { concurrency: 3 },
      klineOptions: { period: 'daily', adjust: 'hfq' },
    }
  );
});

test('parseUpdateDailyArgs uses daily update defaults', () => {
  assert.deepEqual(parseUpdateDailyArgs([]), {
    tradeDate: undefined,
    dbPath: 'data/stock-scoring.sqlite',
    symbols: [],
    initialStart: '20200101',
    quoteOptions: { concurrency: 5 },
    klineOptions: { period: 'daily', adjust: 'qfq' },
  });
});

test('parseUpdateDailyArgs rejects invalid concurrency', () => {
  assert.throws(
    () => parseUpdateDailyArgs(['--concurrency=abc']),
    /--concurrency must be a positive integer/
  );
});
