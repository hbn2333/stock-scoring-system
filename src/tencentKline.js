const TENCENT_FQ_KLINE_URL = 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get';
const DEFAULT_LIMIT = 640;
const DEFAULT_TIMEOUT_MS = 10000;

export async function fetchTencentDailyKlines(symbol, options = {}) {
  const {
    adjust = 'qfq',
    fetchFn = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;
  if (typeof fetchFn !== 'function') throw new Error('fetch is required for Tencent kline fallback');

  const tencentSymbol = mapTencentSymbol(symbol);
  const url = buildTencentKlineUrl(symbol, options);
  const response = await fetchFn(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Tencent kline HTTP ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  return parseTencentDailyKlineResponse(json, { symbol, tencentSymbol, adjust });
}

export function buildTencentKlineUrl(symbol, options = {}) {
  const tencentSymbol = mapTencentSymbol(symbol);
  const startDate = toDashedDate(options.startDate);
  const endDate = toDashedDate(options.endDate);
  const adjust = normalizeAdjust(options.adjust ?? 'qfq');
  const params = `${tencentSymbol},day,${startDate},${endDate},${options.limit ?? DEFAULT_LIMIT},${adjust}`;
  return `${TENCENT_FQ_KLINE_URL}?param=${params}`;
}

export function mapTencentSymbol(symbol) {
  const code = String(symbol).trim();
  if (/^(5|6|9)/.test(code)) return `sh${code}`;
  if (/^(4|8)/.test(code)) return `bj${code}`;
  return `sz${code}`;
}

export function parseTencentDailyKlineResponse(json, { symbol, tencentSymbol, adjust = 'qfq' }) {
  if (json?.code !== 0) {
    throw new Error(`Tencent kline API error: ${json?.msg ?? 'unknown error'}`);
  }
  const payload = json?.data?.[tencentSymbol];
  const key = adjust === 'hfq' ? 'hfqday' : adjust === 'qfq' ? 'qfqday' : 'day';
  const rows = payload?.[key] ?? payload?.day ?? [];
  if (!Array.isArray(rows)) return [];

  let previousClose = null;
  return rows.map((row) => {
    const close = toNumber(row[2]);
    const changePercent =
      previousClose && close !== null
        ? round(((close - previousClose) / previousClose) * 100, 4)
        : null;
    previousClose = close;
    return {
      date: row[0],
      code: symbol,
      open: toNumber(row[1]),
      close,
      high: toNumber(row[3]),
      low: toNumber(row[4]),
      volume: toNumber(row[5]),
      amount: null,
      turnoverRate: null,
      changePercent,
    };
  });
}

function toDashedDate(value) {
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{8}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }
  throw new Error(`Invalid Tencent kline date: ${value}`);
}

function normalizeAdjust(adjust) {
  if (adjust === 'hfq') return 'hfq';
  if (adjust === 'none' || adjust === 'raw' || adjust === '') return '';
  return 'qfq';
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value, digits) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}
