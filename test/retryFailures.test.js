import test from 'node:test';
import assert from 'node:assert/strict';

import { retryIngestFailures } from '../src/retryFailures.js';

test('retryIngestFailures retries pending kline failures and resolves successes', async () => {
  const calls = [];
  const progressEvents = [];
  const times = [1000, 2500];
  const repo = createRetryRepo([
    {
      jobType: 'kline',
      symbol: '000419',
      tradeDate: '2026-06-18',
      attemptCount: 1,
      lastError: 'fetch failed',
      status: 'pending',
    },
    {
      jobType: 'kline',
      symbol: '000420',
      tradeDate: '2026-06-18',
      attemptCount: 2,
      lastError: 'fetch failed',
      status: 'pending',
    },
  ]);

  const report = await retryIngestFailures({
    sdk: {},
    repo,
    tradeDate: '2026-06-18',
    batchSize: 2,
    maxAttempts: 1,
    now: () => times.shift(),
    onProgress: (event) => progressEvents.push(event),
    updateDailyDataFn: async (options) => {
      calls.push(options);
      return {
        status: 'partial_success',
        jobs: [
          { type: 'kline', symbol: '000419', status: 'success', rowCount: 1 },
          { type: 'kline', symbol: '000420', status: 'failed', rowCount: 0 },
        ],
        failures: [{ type: 'kline', symbol: '000420', message: 'still failing' }],
      };
    },
  });

  assert.equal(report.status, 'partial_success');
  assert.equal(report.totalFailures, 2);
  assert.equal(report.retriedSymbols, 2);
  assert.equal(report.resolvedSymbols, 1);
  assert.equal(report.failedAttempts, 1);
  assert.equal(report.remainingFailures, 0);
  assert.deepEqual(calls[0].symbols, ['000419', '000420']);
  assert.equal(calls[0].includeQuotes, false);
  assert.deepEqual(repo.resolved, [
    { jobType: 'kline', symbol: '000419', tradeDate: '2026-06-18' },
  ]);
  assert.deepEqual(repo.recorded, [
    {
      jobType: 'kline',
      symbol: '000420',
      tradeDate: '2026-06-18',
      errorMessage: 'still failing',
      maxAttempts: 1,
    },
  ]);
  assert.deepEqual(
    progressEvents.map((event) => ({
      type: event.type,
      passIndex: event.passIndex,
      completedBatches: event.completedBatches,
      completedAttempts: event.completedAttempts,
      totalAttemptBudget: event.totalAttemptBudget,
      resolvedSymbols: event.resolvedSymbols,
      failedAttempts: event.failedAttempts,
      remainingFailures: event.remainingFailures,
      elapsedMs: event.elapsedMs,
      estimatedRemainingMs: event.estimatedRemainingMs,
    })),
    [
      {
        type: 'retry',
        passIndex: 1,
        completedBatches: 1,
        completedAttempts: 2,
        totalAttemptBudget: 2,
        resolvedSymbols: 1,
        failedAttempts: 1,
        remainingFailures: 0,
        elapsedMs: 1500,
        estimatedRemainingMs: 0,
      },
    ]
  );
});

test('retryIngestFailures skips when no pending failures exist', async () => {
  const report = await retryIngestFailures({
    sdk: {},
    repo: createRetryRepo([]),
    updateDailyDataFn: async () => {
      throw new Error('update should not run');
    },
  });

  assert.equal(report.status, 'skipped');
  assert.equal(report.totalFailures, 0);
});

test('retryIngestFailures keeps retrying pending failures until max attempts are exhausted', async () => {
  const repo = createMutableRetryRepo([
    {
      jobType: 'kline',
      symbol: '000420',
      tradeDate: '2026-06-18',
      attemptCount: 1,
      lastError: 'fetch failed',
      status: 'pending',
    },
  ]);
  let callCount = 0;

  const report = await retryIngestFailures({
    sdk: {},
    repo,
    tradeDate: '2026-06-18',
    batchSize: 1,
    maxAttempts: 3,
    updateDailyDataFn: async () => {
      callCount += 1;
      return {
        status: 'failed',
        jobs: [{ type: 'kline', symbol: '000420', status: 'failed', rowCount: 0 }],
        failures: [{ type: 'kline', symbol: '000420', message: `failed ${callCount}` }],
      };
    },
  });

  assert.equal(callCount, 2);
  assert.equal(report.status, 'failed');
  assert.equal(report.failedAttempts, 2);
  assert.equal(report.remainingFailures, 0);
  assert.equal(repo.failures[0].attemptCount, 3);
  assert.equal(repo.failures[0].status, 'gave_up');
});

function createRetryRepo(failures) {
  return {
    failures,
    recorded: [],
    resolved: [],
    listPendingIngestFailures({ limit } = {}) {
      return this.failures
        .filter((failure) => failure.status === 'pending')
        .slice(0, limit ?? this.failures.length);
    },
    recordIngestFailure(failureRecord) {
      this.recorded.push(failureRecord);
      const failure = this.failures.find((item) => item.symbol === failureRecord.symbol);
      failure.attemptCount += 1;
      failure.status = failure.attemptCount >= failureRecord.maxAttempts ? 'gave_up' : 'pending';
    },
    resolveIngestFailure(failureRecord) {
      this.resolved.push(failureRecord);
      const failure = this.failures.find((item) => item.symbol === failureRecord.symbol);
      failure.status = 'resolved';
    },
  };
}

function createMutableRetryRepo(failures) {
  return {
    failures,
    listPendingIngestFailures() {
      return this.failures.filter((failure) => failure.status === 'pending');
    },
    recordIngestFailure({ symbol, errorMessage, maxAttempts }) {
      const failure = this.failures.find((item) => item.symbol === symbol);
      failure.attemptCount += 1;
      failure.lastError = errorMessage;
      failure.status = failure.attemptCount >= maxAttempts ? 'gave_up' : 'pending';
    },
    resolveIngestFailure({ symbol }) {
      const failure = this.failures.find((item) => item.symbol === symbol);
      failure.status = 'resolved';
    },
  };
}
