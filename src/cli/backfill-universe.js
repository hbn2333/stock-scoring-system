#!/usr/bin/env node
import {
  backfillUniverseData,
  createSqliteRepository,
  initializeDatabase,
  openDatabase,
  todayInShanghai,
} from '../index.js';
import { parseBackfillUniverseArgs } from './backfillUniverseArgs.js';
import { formatBackfillProgress } from './progress.js';
import { formatBackfillSummary } from './report.js';

const args = parseBackfillUniverseArgs(process.argv.slice(2));
const { StockSDK } = await import('stock-sdk');
const sdk = new StockSDK();
const db = openDatabase(args.dbPath);

try {
  initializeDatabase(db);
  const repo = createSqliteRepository(db);
  const report = await backfillUniverseData({
    sdk,
    repo,
    tradeDate: args.tradeDate ?? todayInShanghai(),
    batchSize: args.batchSize,
    limit: args.limit,
    initialStart: args.initialStart,
    klineOptions: args.klineOptions,
    klineSource: args.klineSource,
    maxConsecutiveFailedBatches: args.maxConsecutiveFailedBatches,
    failureRateAbortThreshold: args.failureRateAbortThreshold,
    onProgress: (event) => console.error(formatBackfillProgress(event)),
  });

  console.log(
    args.report === 'json' ? JSON.stringify(report, null, 2) : formatBackfillSummary(report)
  );
  if (report.status === 'failed') process.exitCode = 1;
} finally {
  db.close();
}

