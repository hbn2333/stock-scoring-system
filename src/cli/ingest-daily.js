#!/usr/bin/env node
import {
  createSqliteRepository,
  ingestDailyKlines,
  ingestQuoteSnapshots,
  initializeDatabase,
  openDatabase,
} from '../index.js';

const args = parseArgs(process.argv.slice(2));
const tradeDate = args.date ?? todayInShanghai();
const dbPath = args.db ?? 'data/stock-scoring.sqlite';
const symbols = args.symbols ? args.symbols.split(',').filter(Boolean) : [];

const { StockSDK } = await import('stock-sdk');
const sdk = new StockSDK();
const db = openDatabase(dbPath);

try {
  initializeDatabase(db);
  const repo = createSqliteRepository(db);

  const quoteResult = await ingestQuoteSnapshots({ sdk, repo, tradeDate });
  console.log(`quotes: ${quoteResult.rowCount} rows`);

  if (symbols.length > 0) {
    const klineResult = await ingestDailyKlines({
      sdk,
      repo,
      symbols,
      options: {
        period: 'daily',
        adjust: args.adjust ?? 'qfq',
        start: args.start,
        end: args.end,
      },
    });
    console.log(`klines: ${klineResult.rowCount} rows`);
  } else {
    console.log('klines: skipped; pass --symbols=600519,000001 to ingest daily K lines');
  }
} finally {
  db.close();
}

function parseArgs(argv) {
  const parsed = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, value = 'true'] = arg.slice(2).split('=');
    parsed[key] = value;
  }
  return parsed;
}

function todayInShanghai() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
