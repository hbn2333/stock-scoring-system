import test from 'node:test';
import assert from 'node:assert/strict';

import { parseUpdateDailyArgs } from '../src/cli/updateDailyArgs.js';

test('parseUpdateDailyArgs maps command arguments to update service options', () => {
  assert.deepEqual(
    parseUpdateDailyArgs([
      '--end-date=2026-06-17',
      '--db=data/custom.sqlite',
      '--symbols=600519,000001',
      '--initial-start=20200101',
      '--adjust=hfq',
      '--concurrency=3',
      '--kline-source=auto',
    ]),
    {
      tradeDate: '2026-06-17',
      dbPath: 'data/custom.sqlite',
      symbols: ['600519', '000001'],
      initialStart: '20200101',
      quoteOptions: { concurrency: 3 },
      klineSource: 'auto',
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
    klineSource: 'tencent',
    klineOptions: { period: 'daily', adjust: 'qfq' },
  });
});

test('parseUpdateDailyArgs keeps --date as a backward-compatible end date alias', () => {
  assert.equal(parseUpdateDailyArgs(['--date=2026-06-18']).tradeDate, '2026-06-18');
  assert.equal(
    parseUpdateDailyArgs(['--date=2026-06-18', '--end-date=2026-06-19']).tradeDate,
    '2026-06-19'
  );
});

test('parseUpdateDailyArgs rejects invalid concurrency', () => {
  assert.throws(
    () => parseUpdateDailyArgs(['--concurrency=abc']),
    /--concurrency must be a positive integer/
  );
  assert.throws(
    () => parseUpdateDailyArgs(['--kline-source=bad']),
    /--kline-source must be one of auto, stock-sdk, tencent/
  );
});
