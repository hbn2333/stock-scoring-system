#!/usr/bin/env node
import { createSqliteRepository, initializeDatabase, openDatabase } from '../index.js';

const args = parseKeyValueArgs(process.argv.slice(2));
const db = openDatabase(args.db ?? 'data/stock-scoring.sqlite');

try {
  initializeDatabase(db);
  const repo = createSqliteRepository(db);
  const result = repo.seedStockUniverseFromLatestQuoteSnapshot();
  console.log(
    JSON.stringify({ status: result.rowCount > 0 ? 'success' : 'skipped', ...result }, null, 2)
  );
} finally {
  db.close();
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
