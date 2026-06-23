const DEFAULT_FAILURE_SAMPLE_LIMIT = 10;

export function formatBackfillSummary(report, { failureSampleLimit = DEFAULT_FAILURE_SAMPLE_LIMIT } = {}) {
  const lines = [
    'Backfill summary',
    `date: ${report.tradeDate}`,
    `status: ${report.status}`,
    `symbols: ${report.totalSymbols ?? 0}`,
    `rows: ${report.totalKlineRows ?? 0}`,
    `failures: ${(report.failures ?? []).length}`,
    `aborted: ${Boolean(report.aborted)}`,
  ];
  if (report.abortReason) lines.push(`abortReason: ${report.abortReason}`);
  appendFailureSamples(lines, report.failures, failureSampleLimit);
  return lines.join('\n');
}

export function formatRetrySummary(report, { failureSampleLimit = DEFAULT_FAILURE_SAMPLE_LIMIT } = {}) {
  const lines = [
    'Retry summary',
    `date: ${report.tradeDate}`,
    `status: ${report.status}`,
    `totalFailures: ${report.totalFailures ?? 0}`,
    `retriedSymbols: ${report.retriedSymbols ?? 0}`,
    `resolvedSymbols: ${report.resolvedSymbols ?? 0}`,
    `failedAttempts: ${report.failedAttempts ?? 0}`,
    `remainingFailures: ${report.remainingFailures ?? 0}`,
  ];
  appendFailureSamples(lines, report.failures, failureSampleLimit);
  return lines.join('\n');
}

function appendFailureSamples(lines, failures = [], limit) {
  if (failures.length === 0) return;
  lines.push('failure samples:');
  for (const failure of failures.slice(0, limit)) {
    lines.push(`- ${formatFailure(failure)}`);
  }
  if (failures.length > limit) {
    lines.push(`- ... ${failures.length - limit} more`);
  }
}

function formatFailure(failure) {
  return [failure.type, failure.symbol].filter(Boolean).join(' ') + `: ${failure.message}`;
}