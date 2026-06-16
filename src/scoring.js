const DEFAULT_WEIGHTS = {
  momentum: 0.35,
  avgAmount: 0.2,
  volatility: -0.25,
  northboundAdd: 0.2,
};

export function scoreStocks({
  tradeDate,
  strategyName = 'baseline-v1',
  factorsByCode,
  weights = DEFAULT_WEIGHTS,
}) {
  const normalized = normalizeFactorColumns(factorsByCode, Object.keys(weights));
  const scored = normalized.map((row) => {
    let score = 0;
    for (const [factor, weight] of Object.entries(weights)) {
      score += (row.normalized[factor] ?? 0) * weight;
    }
    return {
      tradeDate,
      strategyName,
      code: row.code,
      name: row.name ?? null,
      score,
    };
  });

  return rankScores(scored);
}

export function rankScores(rows) {
  return [...rows]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.code).localeCompare(String(b.code));
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function normalizeFactorColumns(rows, factors) {
  const stats = new Map();
  for (const factor of factors) {
    const values = rows
      .map((row) => row.values[factor])
      .filter((value) => value != null && Number.isFinite(value));
    stats.set(factor, {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
    });
  }

  return rows.map((row) => {
    const normalized = {};
    for (const factor of factors) {
      const value = row.values[factor];
      const { min, max } = stats.get(factor);
      normalized[factor] =
        value == null || !Number.isFinite(value) || max === min
          ? 0
          : (value - min) / (max - min);
    }
    return { ...row, normalized };
  });
}
