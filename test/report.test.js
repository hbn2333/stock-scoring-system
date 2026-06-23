import test from 'node:test';
import assert from 'node:assert/strict';

import { formatBackfillSummary, formatRetrySummary } from '../src/cli/report.js';

test('formatBackfillSummary renders concise success output', () => {
  assert.equal(
    formatBackfillSummary({
      tradeDate: '2026-06-18',
      status: 'success',
      totalSymbols: 2721,
      totalKlineRows: 123456,
      failures: [],
      aborted: false,
    }),
    [
      'Backfill summary',
      'date: 2026-06-18',
      'status: success',
      'symbols: 2721',
      'rows: 123456',
      'failures: 0',
      'aborted: false',
    ].join('\n')
  );
});

test('formatBackfillSummary includes limited failure samples', () => {
  assert.equal(
    formatBackfillSummary({
      tradeDate: '2026-06-18',
      status: 'failed',
      totalSymbols: 40,
      totalKlineRows: 0,
      failures: [
        { type: 'kline', symbol: '000001', message: 'source down' },
        { type: 'kline', symbol: '000002', message: 'timeout' },
      ],
      aborted: true,
      abortReason: 'kline_provider_unavailable',
    }),
    [
      'Backfill summary',
      'date: 2026-06-18',
      'status: failed',
      'symbols: 40',
      'rows: 0',
      'failures: 2',
      'aborted: true',
      'abortReason: kline_provider_unavailable',
      'failure samples:',
      '- kline 000001: source down',
      '- kline 000002: timeout',
    ].join('\n')
  );
});

test('formatRetrySummary renders concise retry output', () => {
  assert.equal(
    formatRetrySummary({
      tradeDate: '2026-06-18',
      status: 'partial_success',
      totalFailures: 20,
      retriedSymbols: 20,
      resolvedSymbols: 18,
      failedAttempts: 2,
      remainingFailures: 2,
      failures: [{ type: 'kline', symbol: '000420', message: 'still failing' }],
    }),
    [
      'Retry summary',
      'date: 2026-06-18',
      'status: partial_success',
      'totalFailures: 20',
      'retriedSymbols: 20',
      'resolvedSymbols: 18',
      'failedAttempts: 2',
      'remainingFailures: 2',
      'failure samples:',
      '- kline 000420: still failing',
    ].join('\n')
  );
});