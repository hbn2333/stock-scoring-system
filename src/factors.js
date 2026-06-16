export function calculateTechnicalFactors({ tradeDate, code, klines }) {
  const ordered = [...klines]
    .filter((row) => row.close != null && Number.isFinite(row.close))
    .sort((a, b) => String(a.tradeDate).localeCompare(String(b.tradeDate)));

  if (ordered.length < 2) {
    return {
      tradeDate,
      code,
      values: {
        momentum: null,
        volatility: null,
        avgAmount: averageNullable(klines.map((row) => row.amount)),
        maxDrawdown: null,
      },
    };
  }

  const closes = ordered.map((row) => row.close);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(closes[i - 1] === 0 ? 0 : closes[i] / closes[i - 1] - 1);
  }

  return {
    tradeDate,
    code,
    values: {
      momentum: first === 0 ? null : last / first - 1,
      volatility: standardDeviation(returns),
      avgAmount: averageNullable(ordered.map((row) => row.amount)),
      maxDrawdown: maxDrawdown(closes),
    },
  };
}

function averageNullable(values) {
  const valid = values.filter((value) => value != null && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function standardDeviation(values) {
  if (values.length === 0) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function maxDrawdown(closes) {
  let peak = closes[0];
  let worst = 0;
  for (const close of closes) {
    if (close > peak) peak = close;
    const drawdown = peak === 0 ? 0 : (peak - close) / peak;
    if (drawdown > worst) worst = drawdown;
  }
  return worst;
}
