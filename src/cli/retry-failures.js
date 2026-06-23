#!/usr/bin/env node
import {
  createSqliteRepository,
  initializeDatabase,
  openDatabase,
  retryIngestFailures,
  todayInShanghai,
} from '../index.js';
import { formatRetryProgress } from './progress.js';
import { parseRetryFailuresArgs } from './retryFailuresArgs.js';

const args = parseRetryFailuresArgs(process.argv.slice(2));
const { StockSDK } = await import('stock-sdk');
const sdk = new StockSDK();
const db = openDatabase(args.dbPath);

try {
  initializeDatabase(db);
  const repo = createSqliteRepository(db);
  const report = await retryIngestFailures({
    sdk,
    repo,
    tradeDate: args.tradeDate ?? todayInShanghai(),
    batchSize: args.batchSize,
    limit: args.limit,
    maxAttempts: args.maxAttempts,
    initialStart: args.initialStart,
    klineOptions: args.klineOptions,
    klineSource: args.klineSource,
    onProgress: (event) => console.error(formatRetryProgress(event)),
  });

  console.log(JSON.stringify(report, null, 2));
  if (report.status === 'failed') process.exitCode = 1;
} finally {
  db.close();
}
