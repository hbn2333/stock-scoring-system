export function parseBackfillUniverseArgs(argv) {
  const args = parseKeyValueArgs(argv);
  const batchSize = parsePositiveInteger(args['batch-size'] ?? '50', '--batch-size');
  const limit = args.limit ? parsePositiveInteger(args.limit, '--limit') : undefined;
  const maxConsecutiveFailedBatches = parsePositiveInteger(
    args['max-consecutive-failed-batches'] ?? '2',
    '--max-consecutive-failed-batches'
  );
  const failureRateAbortThreshold = parseUnitInterval(
    args['failure-rate-abort-threshold'] ?? '0.8',
    '--failure-rate-abort-threshold'
  );

  return {
    tradeDate: args['end-date'] ?? args.date,
    dbPath: args.db ?? 'data/stock-scoring.sqlite',
    batchSize,
    limit,
    initialStart: args['initial-start'] ?? '20240101',
    klineSource: parseKlineSource(args['kline-source'] ?? 'tencent', '--kline-source'),
    maxConsecutiveFailedBatches,
    failureRateAbortThreshold,
    klineOptions: {
      period: 'daily',
      adjust: args.adjust ?? 'qfq',
    },
  };
}

function parseKeyValueArgs(argv) {
  const parsed = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value = 'true'] = arg.slice(2).split('=');
    parsed[key] = value;
  }
  return parsed;
}

function parsePositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function parseUnitInterval(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    throw new Error(`${label} must be a number between 0 and 1`);
  }
  return parsed;
}

function parseKlineSource(value, label) {
  if (!['auto', 'stock-sdk', 'tencent'].includes(value)) {
    throw new Error(`${label} must be one of auto, stock-sdk, tencent`);
  }
  return value;
}
