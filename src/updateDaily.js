import { ingestQuoteSnapshots, normalizeKlineRow } from './ingest.js';

const DEFAULT_INITIAL_START = '20200101';
const DEFAULT_KLINE_OPTIONS = { period: 'daily', adjust: 'qfq' };
const DEFAULT_QUOTE_OPTIONS = { concurrency: 5 };

export async function updateDailyData({
  sdk,
  repo,
  tradeDate = todayInShanghai(),
  symbols = [],
  initialStart = DEFAULT_INITIAL_START,
  quoteOptions = DEFAULT_QUOTE_OPTIONS,
  klineOptions = DEFAULT_KLINE_OPTIONS,
  includeQuotes = true,
} = {}) {
  if (!sdk) throw new Error('sdk is required');
  if (!repo) throw new Error('repo is required');

  const jobs = [];
  const failures = [];

  if (includeQuotes) {
    try {
      const result = await ingestQuoteSnapshots({ sdk, repo, tradeDate, options: quoteOptions });
      jobs.push({ type: 'quotes', status: 'success', rowCount: result.rowCount });
    } catch (error) {
      const failure = createFailure({ type: 'quotes', error });
      failures.push(failure);
      jobs.push({ type: 'quotes', status: 'failed', rowCount: 0, error: failure.message });
    }
  }

  for (const symbol of symbols) {
    const latest = repo.getLatestKlineDate(symbol);
    if (latest && latest >= tradeDate) {
      jobs.push({
        type: 'kline',
        symbol,
        status: 'skipped',
        reason: 'already_current',
        rowCount: 0,
        latest,
      });
      continue;
    }

    const start = latest ? toCompactDate(nextCalendarDate(latest)) : toCompactDate(initialStart);
    const end = toCompactDate(tradeDate);

    try {
      const klines = await sdk.kline.cn(symbol, {
        ...klineOptions,
        startDate: start,
        endDate: end,
      });
      const rows = klines.map(normalizeKlineRow);
      repo.upsertKlineDaily(rows);
      jobs.push({ type: 'kline', symbol, status: 'success', rowCount: rows.length, start, end });
    } catch (error) {
      const failure = createFailure({ type: 'kline', symbol, error });
      failures.push(failure);
      jobs.push({
        type: 'kline',
        symbol,
        status: 'failed',
        rowCount: 0,
        start,
        end,
        error: failure.message,
      });
    }
  }

  return {
    tradeDate,
    status: summarizeStatus(jobs),
    jobs,
    failures,
  };
}

export function todayInShanghai() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function toCompactDate(date) {
  return date.replaceAll('-', '');
}

export function nextCalendarDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function createFailure({ type, symbol, error }) {
  return {
    type,
    ...(symbol ? { symbol } : {}),
    message: error instanceof Error ? error.message : String(error),
  };
}

function summarizeStatus(jobs) {
  const failedCount = jobs.filter((job) => job.status === 'failed').length;
  if (failedCount === 0) return 'success';
  if (failedCount === jobs.length) return 'failed';
  return 'partial_success';
}
