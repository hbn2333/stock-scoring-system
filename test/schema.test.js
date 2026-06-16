import test from 'node:test';
import assert from 'node:assert/strict';

import { createSchemaSql, TABLES } from '../src/schema.js';

test('schema defines the scoring system warehouse tables', () => {
  assert.deepEqual(TABLES, [
    'ingest_runs',
    'stock_quotes_daily_snapshot',
    'stock_kline_daily',
    'factor_values',
    'stock_scores',
    'daily_candidates',
  ]);
});

test('schema SQL is idempotent and includes scoring keys', () => {
  const sql = createSchemaSql().join('\n');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS stock_scores/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS factor_values/);
  assert.match(sql, /UNIQUE\(trade_date, code, factor_name\)/);
  assert.match(sql, /UNIQUE\(trade_date, strategy_name, code\)/);
});
