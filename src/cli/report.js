export function formatBackfillStatusSummary(report) {
  const lines = [
    'Backfill status',
    `endDate: ${report.endDate}`,
    `enabledSymbols: ${report.totalEnabledSymbols ?? 0}`,
    `completed: ${report.completedSymbols ?? 0}`,
    `incomplete: ${report.incompleteSymbols ?? 0}`,
    `completionRate: ${formatPercent(report.completionRate ?? 0)}`,
    `neverFetched: ${report.neverFetchedSymbols ?? 0}`,
    `stale: ${report.staleSymbols ?? 0}`,
    `pendingFailures: ${report.pendingFailures ?? 0}`,
    `gaveUpFailures: ${report.gaveUpFailures ?? 0}`,
  ];
  appendIncompleteSamples(lines, report.samples?.incomplete ?? []);
  appendFailureStatusSamples(lines, 'pending failure samples:', report.samples?.pendingFailures ?? []);
  appendFailureStatusSamples(lines, 'gave up failure samples:', report.samples?.gaveUpFailures ?? []);
  return lines.join('\n');
}
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

function appendIncompleteSamples(lines, samples) {
  if (samples.length === 0) return;
  lines.push('incomplete samples:');
  for (const sample of samples) {
    lines.push(
      `- ${sample.code} ${sample.name} ${sample.market ?? ''} latest=${sample.latestTradeDate ?? 'never'}`.trim()
    );
  }
}

function appendFailureStatusSamples(lines, title, samples) {
  if (samples.length === 0) return;
  lines.push(title);
  for (const sample of samples) {
    lines.push(`- ${sample.symbol} attempts=${sample.attemptCount}: ${sample.lastError}`);
  }
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
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
