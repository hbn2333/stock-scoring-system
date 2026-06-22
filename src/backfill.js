import { todayInShanghai, updateDailyData } from './updateDaily.js';

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_INITIAL_START = '20240101';
const DEFAULT_MAX_CONSECUTIVE_FAILED_BATCHES = 2;
const DEFAULT_FAILURE_RATE_ABORT_THRESHOLD = 0.8;
const KLINE_PROVIDER_UNAVAILABLE = 'kline_provider_unavailable';

export async function backfillUniverseData({
  sdk,
  repo,
  tradeDate = todayInShanghai(),
  batchSize = DEFAULT_BATCH_SIZE,
  limit,
  initialStart = DEFAULT_INITIAL_START,
  klineOptions,
  maxAttempts = 5,
  maxConsecutiveFailedBatches = DEFAULT_MAX_CONSECUTIVE_FAILED_BATCHES,
  failureRateAbortThreshold = DEFAULT_FAILURE_RATE_ABORT_THRESHOLD,
  onProgress,
  now = () => Date.now(),
  updateDailyDataFn = updateDailyData,
} = {}) {
  if (!sdk) throw new Error('sdk is required');
  if (!repo) throw new Error('repo is required');
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error('batchSize must be a positive integer');
  }
  if (!Number.isInteger(maxConsecutiveFailedBatches) || maxConsecutiveFailedBatches < 1) {
    throw new Error('maxConsecutiveFailedBatches must be a positive integer');
  }
  if (
    typeof failureRateAbortThreshold !== 'number' ||
    failureRateAbortThreshold <= 0 ||
    failureRateAbortThreshold > 1
  ) {
    throw new Error('failureRateAbortThreshold must be a number between 0 and 1');
  }

  const symbols = repo.listUniverseSymbolsNeedingKlineBackfill
    ? repo.listUniverseSymbolsNeedingKlineBackfill({ endDate: tradeDate, limit })
    : repo.listEnabledUniverseSymbols({ limit });
  if (symbols.length === 0) {
    return {
      tradeDate,
      status: 'skipped',
      totalSymbols: 0,
      totalKlineRows: 0,
      batches: [],
      failures: [],
    };
  }

  const batches = [];
  const failures = [];
  let totalKlineRows = 0;
  let completedSymbols = 0;
  const symbolBatches = chunk(symbols, batchSize);
  const totalBatches = symbolBatches.length;
  const startedAt = now();
  let consecutiveProviderFailureBatches = 0;
  let aborted = false;
  let abortReason;

  for (const [batchIndex, batchSymbols] of symbolBatches.entries()) {
    const result = await updateDailyDataFn({
      sdk,
      repo,
      tradeDate,
      symbols: batchSymbols,
      initialStart,
      klineOptions,
      includeQuotes: false,
    });
    const rowCount = sumKlineRows(result.jobs);
    totalKlineRows += rowCount;
    failures.push(...(result.failures ?? []));
    completedSymbols += batchSymbols.length;
    recordKlineFailureStates(repo, tradeDate, result, maxAttempts);
    batches.push({
      symbols: batchSymbols,
      status: result.status,
      rowCount,
      failures: result.failures ?? [],
    });
    if (looksLikeProviderFailureBatch(batchSymbols, result, rowCount, failureRateAbortThreshold)) {
      consecutiveProviderFailureBatches += 1;
    } else {
      consecutiveProviderFailureBatches = 0;
    }
    if (consecutiveProviderFailureBatches >= maxConsecutiveFailedBatches) {
      aborted = true;
      abortReason = KLINE_PROVIDER_UNAVAILABLE;
    }
    const completedBatches = batchIndex + 1;
    const elapsedMs = now() - startedAt;
    onProgress?.({
      type: 'backfill',
      tradeDate,
      batchIndex: completedBatches,
      totalBatches,
      completedSymbols,
      totalSymbols: symbols.length,
      totalKlineRows,
      failureCount: failures.length,
      elapsedMs,
      estimatedRemainingMs: aborted
        ? 0
        : estimateRemainingMs(elapsedMs, completedBatches, totalBatches),
      status: result.status,
      aborted,
      abortReason,
    });
    if (aborted) break;
  }

  return {
    tradeDate,
    status: summarizeBatchStatus(batches),
    totalSymbols: symbols.length,
    totalKlineRows,
    batches,
    failures,
    aborted,
    abortReason,
  };
}

function estimateRemainingMs(elapsedMs, completedUnits, totalUnits) {
  if (completedUnits <= 0 || completedUnits >= totalUnits) return 0;
  return Math.round((elapsedMs / completedUnits) * (totalUnits - completedUnits));
}

function recordKlineFailureStates(repo, tradeDate, result, maxAttempts) {
  const failedSymbols = new Map(
    (result.failures ?? [])
      .filter((failure) => failure.type === 'kline' && failure.symbol)
      .map((failure) => [failure.symbol, failure])
  );

  for (const job of result.jobs ?? []) {
    if (job.type !== 'kline' || !job.symbol) continue;
    const failure = failedSymbols.get(job.symbol);
    if (failure) {
      repo.recordIngestFailure?.({
        jobType: 'kline',
        symbol: job.symbol,
        tradeDate,
        errorMessage: failure.message,
        maxAttempts,
      });
    } else if (job.status === 'success' || job.status === 'skipped') {
      repo.resolveIngestFailure?.({
        jobType: 'kline',
        symbol: job.symbol,
        tradeDate,
      });
    }
  }
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function sumKlineRows(jobs = []) {
  return jobs
    .filter((job) => job.type === 'kline')
    .reduce((sum, job) => sum + (job.rowCount ?? 0), 0);
}

function looksLikeProviderFailureBatch(batchSymbols, result, rowCount, threshold) {
  if (rowCount > 0) return false;
  const failureCount = (result.failures ?? []).filter((failure) => failure.type === 'kline').length;
  return failureCount / batchSymbols.length >= threshold;
}

function summarizeBatchStatus(batches) {
  const failedCount = batches.filter((batch) => batch.status === 'failed').length;
  const partialCount = batches.filter((batch) => batch.status === 'partial_success').length;
  if (failedCount === 0 && partialCount === 0) return 'success';
  if (failedCount === batches.length) return 'failed';
  return 'partial_success';
}
