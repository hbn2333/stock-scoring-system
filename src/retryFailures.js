import { todayInShanghai, updateDailyData } from './updateDaily.js';

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_MAX_ATTEMPTS = 5;

export async function retryIngestFailures({
  sdk,
  repo,
  tradeDate = todayInShanghai(),
  batchSize = DEFAULT_BATCH_SIZE,
  limit,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  initialStart = '20240101',
  klineOptions,
  updateDailyDataFn = updateDailyData,
} = {}) {
  if (!sdk) throw new Error('sdk is required');
  if (!repo) throw new Error('repo is required');
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error('batchSize must be a positive integer');
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('maxAttempts must be a positive integer');
  }

  const initialFailures = repo.listPendingIngestFailures({ jobType: 'kline', tradeDate, limit });
  if (initialFailures.length === 0) {
    return {
      tradeDate,
      status: 'skipped',
      totalFailures: 0,
      retriedSymbols: 0,
      resolvedSymbols: 0,
      failedAttempts: 0,
      remainingFailures: 0,
      batches: [],
      failures: [],
    };
  }

  const batches = [];
  const retryFailures = [];
  let resolvedSymbols = 0;
  let retriedSymbols = 0;
  let passCount = 0;

  while (passCount < maxAttempts) {
    const pendingFailures = repo.listPendingIngestFailures({ jobType: 'kline', tradeDate, limit });
    if (pendingFailures.length === 0) break;
    passCount += 1;

    for (const batchFailures of chunk(pendingFailures, batchSize)) {
      const symbols = batchFailures.map((failure) => failure.symbol);
      retriedSymbols += symbols.length;
      const result = await updateDailyDataFn({
        sdk,
        repo,
        tradeDate,
        symbols,
        initialStart,
        klineOptions,
        includeQuotes: false,
      });
      const failedBySymbol = new Map(
        (result.failures ?? [])
          .filter((failure) => failure.type === 'kline' && failure.symbol)
          .map((failure) => [failure.symbol, failure])
      );

      for (const job of result.jobs ?? []) {
        if (job.type !== 'kline' || !job.symbol) continue;
        const failure = failedBySymbol.get(job.symbol);
        if (failure) {
          const recorded = {
            jobType: 'kline',
            symbol: job.symbol,
            tradeDate,
            errorMessage: failure.message,
            maxAttempts,
          };
          repo.recordIngestFailure(recorded);
          retryFailures.push(failure);
        } else if (job.status === 'success' || job.status === 'skipped') {
          repo.resolveIngestFailure({ jobType: 'kline', symbol: job.symbol, tradeDate });
          resolvedSymbols += 1;
        }
      }

      batches.push({
        symbols,
        status: result.status,
        failures: result.failures ?? [],
      });
    }
  }

  return {
    tradeDate,
    status: summarizeRetryStatus(batches),
    totalFailures: initialFailures.length,
    retriedSymbols,
    resolvedSymbols,
    failedAttempts: retryFailures.length,
    remainingFailures: repo.listPendingIngestFailures({ jobType: 'kline', tradeDate, limit }).length,
    batches,
    failures: retryFailures,
  };
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function summarizeRetryStatus(batches) {
  const failedCount = batches.filter((batch) => batch.status === 'failed').length;
  const partialCount = batches.filter((batch) => batch.status === 'partial_success').length;
  if (failedCount === 0 && partialCount === 0) return 'success';
  if (failedCount === batches.length) return 'failed';
  return 'partial_success';
}
