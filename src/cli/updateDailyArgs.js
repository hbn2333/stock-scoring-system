export function parseUpdateDailyArgs(argv) {
  const args = parseKeyValueArgs(argv);
  const concurrency = Number(args.concurrency ?? 5);
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('--concurrency must be a positive integer');
  }

  return {
    tradeDate: args['end-date'] ?? args.date,
    dbPath: args.db ?? 'data/stock-scoring.sqlite',
    symbols: parseSymbols(args.symbols),
    initialStart: args['initial-start'] ?? '20200101',
    quoteOptions: {
      concurrency,
    },
    klineSource: parseKlineSource(args['kline-source'] ?? 'tencent', '--kline-source'),
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

function parseSymbols(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((symbol) => symbol.trim())
    .filter(Boolean);
}

function parseKlineSource(value, label) {
  if (!['auto', 'stock-sdk', 'tencent'].includes(value)) {
    throw new Error(`${label} must be one of auto, stock-sdk, tencent`);
  }
  return value;
}
