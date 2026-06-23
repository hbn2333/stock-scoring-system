import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatBackfillStatusSummary,
  formatBackfillSummary,
  formatRetrySummary,
} from '../src/cli/report.js';

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
test('formatBackfillStatusSummary renders concise coverage output', () => {
  assert.equal(
    formatBackfillStatusSummary({
      endDate: '2026-06-18',
      totalEnabledSymbols: 4,
      completedSymbols: 1,
      incompleteSymbols: 3,
      neverFetchedSymbols: 1,
      staleSymbols: 2,
      pendingFailures: 1,
      gaveUpFailures: 1,
      completionRate: 0.25,
      samples: {
        incomplete: [
          { code: '000002', name: 'Vanke A', market: 'SZ', latestTradeDate: '2026-06-17' },
        ],
        pendingFailures: [
          { symbol: '000002', attemptCount: 1, lastError: 'timeout', status: 'pending' },
        ],
        gaveUpFailures: [],
      },
    }),
    [
      'Backfill status',
      'endDate: 2026-06-18',
      'enabledSymbols: 4',
      'completed: 1',
      'incomplete: 3',
      'completionRate: 25.00%',
      'neverFetched: 1',
      'stale: 2',
      'pendingFailures: 1',
      'gaveUpFailures: 1',
      'incomplete samples:',
      '- 000002 Vanke A SZ latest=2026-06-17',
      'pending failure samples:',
      '- 000002 attempts=1: timeout',
    ].join('\n')
  );
});