import test from 'node:test';
import assert from 'node:assert/strict';

import { parseBackfillUniverseArgs } from '../src/cli/backfillUniverseArgs.js';

test('parseBackfillUniverseArgs maps command arguments to backfill options', () => {
  assert.deepEqual(
    parseBackfillUniverseArgs([
      '--date=2026-06-17',
      '--db=data/custom.sqlite',
      '--batch-size=25',
      '--limit=100',
      '--initial-start=20240101',
      '--adjust=hfq',
    ]),
    {
      tradeDate: '2026-06-17',
      dbPath: 'data/custom.sqlite',
      batchSize: 25,
      limit: 100,
      initialStart: '20240101',
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
    klineOptions: { period: 'daily', adjust: 'qfq' },
  });
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
});
