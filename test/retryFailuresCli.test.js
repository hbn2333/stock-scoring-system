import test from 'node:test';
import assert from 'node:assert/strict';

import { parseRetryFailuresArgs } from '../src/cli/retryFailuresArgs.js';

test('parseRetryFailuresArgs maps command arguments to retry options', () => {
  assert.deepEqual(
    parseRetryFailuresArgs([
      '--end-date=2026-06-18',
      '--db=data/custom.sqlite',
      '--batch-size=8',
      '--limit=20',
      '--max-attempts=5',
      '--initial-start=20240101',
      '--adjust=hfq',
      '--kline-source=stock-sdk',
      '--report=json',
    ]),
    {
      tradeDate: '2026-06-18',
      dbPath: 'data/custom.sqlite',
      batchSize: 8,
      limit: 20,
      maxAttempts: 5,
      initialStart: '20240101',
      klineSource: 'stock-sdk',
      report: 'json',
      klineOptions: { period: 'daily', adjust: 'hfq' },
    }
  );
});

test('parseRetryFailuresArgs uses retry defaults', () => {
  assert.deepEqual(parseRetryFailuresArgs([]), {
    tradeDate: undefined,
    dbPath: 'data/stock-scoring.sqlite',
    batchSize: 10,
    limit: undefined,
    maxAttempts: 5,
    initialStart: '20240101',
    klineSource: 'tencent',
    report: 'summary',
    klineOptions: { period: 'daily', adjust: 'qfq' },
  });
});

test('parseRetryFailuresArgs keeps --date as a backward-compatible end date alias', () => {
  assert.equal(parseRetryFailuresArgs(['--date=2026-06-18']).tradeDate, '2026-06-18');
  assert.equal(
    parseRetryFailuresArgs(['--date=2026-06-18', '--end-date=2026-06-19']).tradeDate,
    '2026-06-19'
  );
});

test('parseRetryFailuresArgs rejects invalid numeric arguments', () => {
  assert.throws(
    () => parseRetryFailuresArgs(['--batch-size=0']),
    /--batch-size must be a positive integer/
  );
  assert.throws(
    () => parseRetryFailuresArgs(['--max-attempts=abc']),
    /--max-attempts must be a positive integer/
  );
  assert.throws(
    () => parseRetryFailuresArgs(['--kline-source=bad']),
    /--kline-source must be one of auto, stock-sdk, tencent/
  );
  assert.throws(
    () => parseRetryFailuresArgs(['--report=xml']),
    /--report must be one of summary, json/
  );
});
