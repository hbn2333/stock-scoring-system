export function parseBackfillStatusArgs(argv) {
  const args = parseKeyValueArgs(argv);
  return {
    endDate: args['end-date'] ?? args.date,
    dbPath: args.db ?? 'data/stock-scoring.sqlite',
    sampleLimit: parsePositiveInteger(args['sample-limit'] ?? '10', '--sample-limit'),
    report: parseReport(args.report ?? 'summary', '--report'),
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

function parsePositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function parseReport(value, label) {
  if (!['summary', 'json'].includes(value)) {
    throw new Error(`${label} must be one of summary, json`);
  }
  return value;
}