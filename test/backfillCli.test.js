import test from 'node:test';
import assert from 'node:assert/strict';

import { parseBackfillUniverseArgs } from '../src/cli/backfillUniverseArgs.js';

test('parseBackfillUniverseArgs maps command arguments to backfill options', () => {
  assert.deepEqual(
    parseBackfillUniverseArgs([
      '--end-date=2026-06-17',
      '--db=data/custom.sqlite',
      '--batch-size=25',
      '--limit=100',
      '--initial-start=20240101',
      '--adjust=hfq',
      '--max-consecutive-failed-batches=3',
      '--failure-rate-abort-threshold=0.9',
      '--kline-source=auto',
    ]),
    {
      tradeDate: '2026-06-17',
      dbPath: 'data/custom.sqlite',
      batchSize: 25,
      limit: 100,
      initialStart: '20240101',
      klineSource: 'auto',
      maxConsecutiveFailedBatches: 3,
      failureRateAbortThreshold: 0.9,
      klineOptions: { period: 'daily', adjust: 'hfq' },
    }
  );
});

test('parseBackfillUniverseArgs uses safe defaults', () => {
  assert.deepEqual(parseBackfillUniverseArgs([]), {
    tradeDate: undefined,
    dbPath: 'data/stock-scoring.sqlite',
    batchSize: 50,
    limit: undefined,
    initialStart: '20240101',
    klineSource: 'tencent',
    maxConsecutiveFailedBatches: 2,
    failureRateAbortThreshold: 0.8,
    klineOptions: { period: 'daily', adjust: 'qfq' },
  });
});

test('parseBackfillUniverseArgs keeps --date as a backward-compatible end date alias', () => {
  assert.equal(parseBackfillUniverseArgs(['--date=2026-06-18']).tradeDate, '2026-06-18');
  assert.equal(
    parseBackfillUniverseArgs(['--date=2026-06-18', '--end-date=2026-06-19']).tradeDate,
    '2026-06-19'
  );
});

test('parseBackfillUniverseArgs rejects invalid numeric arguments', () => {
  assert.throws(
    () => parseBackfillUniverseArgs(['--batch-size=0']),
    /--batch-size must be a positive integer/
  );
  assert.throws(
    () => parseBackfillUniverseArgs(['--limit=abc']),
    /--limit must be a positive integer/
  );
  assert.throws(
    () => parseBackfillUniverseArgs(['--max-consecutive-failed-batches=0']),
    /--max-consecutive-failed-batches must be a positive integer/
  );
  assert.throws(
    () => parseBackfillUniverseArgs(['--failure-rate-abort-threshold=1.5']),
    /--failure-rate-abort-threshold must be a number between 0 and 1/
  );
  assert.throws(
    () => parseBackfillUniverseArgs(['--kline-source=bad']),
    /--kline-source must be one of auto, stock-sdk, tencent/
  );
});
