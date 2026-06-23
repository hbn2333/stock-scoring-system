import test from 'node:test';
import assert from 'node:assert/strict';

import { parseBackfillStatusArgs } from '../src/cli/backfillStatusArgs.js';

test('parseBackfillStatusArgs maps command arguments', () => {
  assert.deepEqual(
    parseBackfillStatusArgs([
      '--end-date=2026-06-18',
      '--db=data/custom.sqlite',
      '--sample-limit=20',
      '--report=json',
    ]),
    {
      endDate: '2026-06-18',
      dbPath: 'data/custom.sqlite',
      sampleLimit: 20,
      report: 'json',
    }
  );
});

test('parseBackfillStatusArgs uses safe defaults', () => {
  assert.deepEqual(parseBackfillStatusArgs([]), {
    endDate: undefined,
    dbPath: 'data/stock-scoring.sqlite',
    sampleLimit: 10,
    report: 'summary',
  });
});

test('parseBackfillStatusArgs keeps --date as a backward-compatible end date alias', () => {
  assert.equal(parseBackfillStatusArgs(['--date=2026-06-18']).endDate, '2026-06-18');
  assert.equal(
    parseBackfillStatusArgs(['--date=2026-06-18', '--end-date=2026-06-19']).endDate,
    '2026-06-19'
  );
});

test('parseBackfillStatusArgs rejects invalid arguments', () => {
  assert.throws(
    () => parseBackfillStatusArgs(['--sample-limit=0']),
    /--sample-limit must be a positive integer/
  );
  assert.throws(
    () => parseBackfillStatusArgs(['--report=xml']),
    /--report must be one of summary, json/
  );
});