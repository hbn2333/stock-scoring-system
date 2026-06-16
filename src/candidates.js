export function selectCandidates({
  tradeDate,
  strategyName = 'baseline-v1',
  capital,
  maxPositions,
  scores,
}) {
  const selected = [...scores]
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return String(a.code).localeCompare(String(b.code));
    })
    .slice(0, maxPositions);

  const suggestedCapital =
    selected.length === 0 ? 0 : roundCurrency(capital / selected.length);

  return selected.map((row) => ({
    tradeDate,
    strategyName,
    code: row.code,
    name: row.name ?? null,
    rank: row.rank,
    score: row.score,
    suggestedCapital,
  }));
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}
