import { todayInShanghai, updateDailyData } from './updateDaily.js';

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_INITIAL_START = '20240101';

export async function backfillUniverseData({
  sdk,
  repo,
  tradeDate = todayInShanghai(),
  batchSize = DEFAULT_BATCH_SIZE,
  limit,
  initialStart = DEFAULT_INITIAL_START,
  klineOptions,
  updateDailyDataFn = updateDailyData,
} = {}) {
  if (!sdk) throw new Error('sdk is required');
  if (!repo) throw new Error('repo is required');
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error('batchSize must be a positive integer');
  }

  const symbols = repo.listEnabledUniverseSymbols({ limit });
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

  for (const batchSymbols of chunk(symbols, batchSize)) {
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
    batches.push({
      symbols: batchSymbols,
      status: result.status,
      rowCount,
      failures: result.failures ?? [],
    });
  }

  return {
    tradeDate,
    status: summarizeBatchStatus(batches),
    totalSymbols: symbols.length,
    totalKlineRows,
    batches,
    failures,
  };
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

function summarizeBatchStatus(batches) {
  const failedCount = batches.filter((batch) => batch.status === 'failed').length;
  const partialCount = batches.filter((batch) => batch.status === 'partial_success').length;
  if (failedCount === 0 && partialCount === 0) return 'success';
  if (failedCount === batches.length) return 'failed';
  return 'partial_success';
}
