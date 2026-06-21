import test from 'node:test';
import assert from 'node:assert/strict';

import { backfillUniverseData } from '../src/backfill.js';

test('backfillUniverseData batches enabled universe symbols and updates kline-only data', async () => {
  const calls = [];
  const progressEvents = [];
  const times = [1000, 2000, 4000];
  const repo = {
    listEnabledUniverseSymbols: ({ limit } = {}) =>
      ['000001', '600519', '300750'].slice(0, limit ?? 3),
  };

  const report = await backfillUniverseData({
    sdk: {},
    repo,
    tradeDate: '2026-06-17',
    batchSize: 2,
    limit: 3,
    initialStart: '20240101',
    now: () => times.shift(),
    onProgress: (event) => progressEvents.push(event),
    updateDailyDataFn: async (options) => {
      calls.push(options);
      return {
        status: 'success',
        jobs: options.symbols.map((symbol) => ({
          type: 'kline',
          symbol,
          status: 'success',
          rowCount: 10,
        })),
        failures: [],
      };
    },
  });

  assert.equal(report.status, 'success');
  assert.equal(report.totalSymbols, 3);
  assert.equal(report.totalKlineRows, 30);
  assert.deepEqual(
    calls.map((call) => ({
      symbols: call.symbols,
      tradeDate: call.tradeDate,
      initialStart: call.initialStart,
      includeQuotes: call.includeQuotes,
    })),
    [
      {
        symbols: ['000001', '600519'],
        tradeDate: '2026-06-17',
        initialStart: '20240101',
        includeQuotes: false,
      },
      {
        symbols: ['300750'],
        tradeDate: '2026-06-17',
        initialStart: '20240101',
        includeQuotes: false,
      },
    ]
  );
  assert.deepEqual(
    progressEvents.map((event) => ({
      type: event.type,
      batchIndex: event.batchIndex,
      totalBatches: event.totalBatches,
      completedSymbols: event.completedSymbols,
      totalSymbols: event.totalSymbols,
      totalKlineRows: event.totalKlineRows,
      failureCount: event.failureCount,
      elapsedMs: event.elapsedMs,
      estimatedRemainingMs: event.estimatedRemainingMs,
    })),
    [
      {
        type: 'backfill',
        batchIndex: 1,
        totalBatches: 2,
        completedSymbols: 2,
        totalSymbols: 3,
        totalKlineRows: 20,
        failureCount: 0,
        elapsedMs: 1000,
        estimatedRemainingMs: 1000,
      },
      {
        type: 'backfill',
        batchIndex: 2,
        totalBatches: 2,
        completedSymbols: 3,
        totalSymbols: 3,
        totalKlineRows: 30,
        failureCount: 0,
        elapsedMs: 3000,
        estimatedRemainingMs: 0,
      },
    ]
  );
});

test('backfillUniverseData reports partial success when one batch has failures', async () => {
  const repo = {
    recordedFailures: [],
    resolvedFailures: [],
    listEnabledUniverseSymbols: () => ['000001', '600519'],
    recordIngestFailure(failure) {
      this.recordedFailures.push(failure);
    },
    resolveIngestFailure(failure) {
      this.resolvedFailures.push(failure);
    },
  };

  const report = await backfillUniverseData({
    sdk: {},
    repo,
    tradeDate: '2026-06-17',
    batchSize: 1,
    updateDailyDataFn: async ({ symbols }) => {
      if (symbols[0] === '600519') {
        return {
          status: 'partial_success',
          jobs: [{ type: 'kline', symbol: '600519', status: 'failed', rowCount: 0 }],
          failures: [{ type: 'kline', symbol: '600519', message: 'timeout' }],
        };
      }
      return {
        status: 'success',
        jobs: [{ type: 'kline', symbol: '000001', status: 'success', rowCount: 5 }],
        failures: [],
      };
    },
  });

  assert.equal(report.status, 'partial_success');
  assert.equal(report.totalSymbols, 2);
  assert.equal(report.totalKlineRows, 5);
  assert.deepEqual(report.failures, [{ type: 'kline', symbol: '600519', message: 'timeout' }]);
  assert.deepEqual(repo.recordedFailures, [
    {
      jobType: 'kline',
      symbol: '600519',
      tradeDate: '2026-06-17',
      errorMessage: 'timeout',
      maxAttempts: 5,
    },
  ]);
  assert.deepEqual(repo.resolvedFailures, [
    { jobType: 'kline', symbol: '000001', tradeDate: '2026-06-17' },
  ]);
});

test('backfillUniverseData skips when no enabled symbols exist', async () => {
  const report = await backfillUniverseData({
    sdk: {},
    repo: { listEnabledUniverseSymbols: () => [] },
    updateDailyDataFn: async () => {
      throw new Error('update should not run');
    },
  });

  assert.equal(report.status, 'skipped');
  assert.equal(report.totalSymbols, 0);
  assert.deepEqual(report.batches, []);
});
