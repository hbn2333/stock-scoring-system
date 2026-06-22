import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatBackfillProgress,
  formatDuration,
  formatRetryProgress,
} from '../src/cli/progress.js';

test('formatDuration renders milliseconds as HH:MM:SS', () => {
  assert.equal(formatDuration(0), '00:00:00');
  assert.equal(formatDuration(3661000), '01:01:01');
  assert.equal(formatDuration(27 * 60 * 60 * 1000 + 5000), '27:00:05');
});

test('formatBackfillProgress renders stable progress text', () => {
  assert.equal(
    formatBackfillProgress({
      batchIndex: 12,
      totalBatches: 277,
      completedSymbols: 240,
      totalSymbols: 5527,
      totalKlineRows: 18320,
      failureCount: 3,
      elapsedMs: 522000,
      estimatedRemainingMs: 11118000,
    }),
    '[backfill 12/277] 240/5527 symbols | rows 18320 | failures 3 | elapsed 00:08:42 | ETA 03:05:18'
  );
});

test('formatBackfillProgress marks an aborted backfill', () => {
  assert.equal(
    formatBackfillProgress({
      batchIndex: 2,
      totalBatches: 277,
      completedSymbols: 40,
      totalSymbols: 5527,
      totalKlineRows: 0,
      failureCount: 40,
      elapsedMs: 240000,
      estimatedRemainingMs: 0,
      aborted: true,
      abortReason: 'kline_provider_unavailable',
    }),
    '[backfill 2/277] 40/5527 symbols | rows 0 | failures 40 | elapsed 00:04:00 | ETA 00:00:00 | ABORT kline_provider_unavailable'
  );
});

test('formatRetryProgress renders stable retry progress text', () => {
  assert.equal(
    formatRetryProgress({
      passIndex: 2,
      completedBatches: 4,
      completedAttempts: 40,
      totalAttemptBudget: 100,
      resolvedSymbols: 8,
      failedAttempts: 32,
      remainingFailures: 12,
      elapsedMs: 90000,
      estimatedRemainingMs: 135000,
    }),
    '[retry pass 2 batch 4] attempts 40/100 | resolved 8 | failed attempts 32 | pending 12 | elapsed 00:01:30 | ETA 00:02:15'
  );
});
