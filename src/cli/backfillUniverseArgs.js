export function parseBackfillUniverseArgs(argv) {
  const args = parseKeyValueArgs(argv);
  const batchSize = parsePositiveInteger(args['batch-size'] ?? '50', '--batch-size');
  const limit = args.limit ? parsePositiveInteger(args.limit, '--limit') : undefined;

  return {
    tradeDate: args['end-date'] ?? args.date,
    dbPath: args.db ?? 'data/stock-scoring.sqlite',
    batchSize,
    limit,
    initialStart: args['initial-start'] ?? '20240101',
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
