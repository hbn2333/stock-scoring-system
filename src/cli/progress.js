export function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function formatBackfillProgress(event) {
  return [
    `[backfill ${event.batchIndex}/${event.totalBatches}] ${event.completedSymbols}/${event.totalSymbols} symbols`,
    `rows ${event.totalKlineRows}`,
    `failures ${event.failureCount}`,
    `elapsed ${formatDuration(event.elapsedMs)}`,
    `ETA ${formatDuration(event.estimatedRemainingMs)}`,
  ].join(' | ');
}

export function formatRetryProgress(event) {
  return [
    `[retry pass ${event.passIndex} batch ${event.completedBatches}] attempts ${event.completedAttempts}/${event.totalAttemptBudget}`,
    `resolved ${event.resolvedSymbols}`,
    `failed attempts ${event.failedAttempts}`,
    `pending ${event.remainingFailures}`,
    `elapsed ${formatDuration(event.elapsedMs)}`,
    `ETA ${formatDuration(event.estimatedRemainingMs)}`,
  ].join(' | ');
}
