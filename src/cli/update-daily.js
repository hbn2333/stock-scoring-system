#!/usr/bin/env node
import {
  createSqliteRepository,
  initializeDatabase,
  openDatabase,
  todayInShanghai,
  updateDailyData,
} from '../index.js';
import { parseUpdateDailyArgs } from './updateDailyArgs.js';

const args = parseUpdateDailyArgs(process.argv.slice(2));
const { StockSDK } = await import('stock-sdk');
const sdk = new StockSDK();
const db = openDatabase(args.dbPath);

try {
  initializeDatabase(db);
  const repo = createSqliteRepository(db);
  const report = await updateDailyData({
    sdk,
    repo,
    tradeDate: args.tradeDate ?? todayInShanghai(),
    symbols: args.symbols,
    initialStart: args.initialStart,
    quoteOptions: args.quoteOptions,
    klineOptions: args.klineOptions,
  });

  console.log(JSON.stringify(report, null, 2));
  if (report.status === 'failed') process.exitCode = 1;
} finally {
  db.close();
}
