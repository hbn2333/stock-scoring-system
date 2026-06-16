export function normalizeQuoteRow(tradeDate, quote) {
  return {
    tradeDate,
    code: quote.code,
    name: quote.name,
    price: quote.price ?? null,
    changePercent: quote.changePercent ?? null,
    volume: quote.volume ?? null,
    amount: quote.amount ?? null,
    turnoverRate: quote.turnoverRate ?? null,
    pe: quote.pe ?? null,
    pb: quote.pb ?? null,
    totalMarketCap: quote.totalMarketCap ?? quote.marketCap ?? null,
  };
}

export function normalizeKlineRow(kline) {
  return {
    tradeDate: kline.date,
    code: kline.code,
    open: kline.open ?? null,
    high: kline.high ?? null,
    low: kline.low ?? null,
    close: kline.close ?? null,
    volume: kline.volume ?? null,
    amount: kline.amount ?? null,
    turnoverRate: kline.turnoverRate ?? null,
    changePercent: kline.changePercent ?? null,
  };
}

export async function ingestQuoteSnapshots({
  sdk,
  repo,
  tradeDate,
  options = { concurrency: 5 },
}) {
  const quotes = await sdk.batch.cn(options);
  const rows = quotes.map((quote) => normalizeQuoteRow(tradeDate, quote));
  repo.upsertQuoteSnapshots(rows);
  return { rowCount: rows.length };
}

export async function ingestDailyKlines({ sdk, repo, symbols, options = {} }) {
  const rows = [];
  for (const symbol of symbols) {
    const klines = await sdk.kline.cn(symbol, options);
    rows.push(...klines.map(normalizeKlineRow));
  }
  repo.upsertKlineDaily(rows);
  return { rowCount: rows.length };
}
