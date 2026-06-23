#!/usr/bin/env node
import {
  createSqliteRepository,
  initializeDatabase,
  openDatabase,
  todayInShanghai,
} from '../index.js';
import { parseBackfillStatusArgs } from './backfillStatusArgs.js';
import { formatBackfillStatusSummary } from './report.js';

const args = parseBackfillStatusArgs(process.argv.slice(2));
const db = openDatabase(args.dbPath);

try {
  initializeDatabase(db);
  const repo = createSqliteRepository(db);
  const report = repo.getKlineBackfillCoverage({
    endDate: args.endDate ?? todayInShanghai(),
    sampleLimit: args.sampleLimit,
  });

  console.log(
    args.report === 'json' ? JSON.stringify(report, null, 2) : formatBackfillStatusSummary(report)
  );
} finally {
  db.close();
}