import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  createSqliteRepository,
  initializeDatabase,
  openDatabase,
} from '../src/db.js';

test('initializeDatabase creates all warehouse tables', () => {
  const { db, cleanup } = createTempDatabase();
  try {
    initializeDatabase(db);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all()
      .map((row) => row.name);

    assert.deepEqual(tables, [
      'daily_candidates',
      'factor_values',
      'ingest_runs',
      'stock_kline_daily',
      'stock_quotes_daily_snapshot',
      'stock_scores',
      'stock_universe',
    ]);
  } finally {
    db.close();
    cleanup();
  }
});

test('sqlite repository upserts quotes, klines, factors, scores, and candidates', () => {
  const { db, cleanup } = createTempDatabase();
  try {
    initializeDatabase(db);
    const repo = createSqliteRepository(db);

    repo.upsertQuoteSnapshots([
      {
        tradeDate: '2026-06-16',
        code: '600519',
        name: '贵州茅台',
        price: 1500,
        changePercent: 1.2,
        volume: 100,
        amount: 200,
        turnoverRate: null,
        pe: 25,
        pb: 8,
        totalMarketCap: 18000,
      },
      {
        tradeDate: '2026-06-16',
        code: '600519',
        name: '贵州茅台',
        price: 1510,
        changePercent: 1.8,
        volume: 120,
        amount: 240,
        turnoverRate: 0.3,
        pe: 26,
        pb: 8.2,
        totalMarketCap: 18100,
      },
    ]);

    repo.upsertKlineDaily([
      {
        tradeDate: '2026-06-16',
        code: '600519',
        open: 1490,
        high: 1520,
        low: 1480,
        close: 1510,
        volume: 120,
        amount: 240,
        turnoverRate: 0.3,
        changePercent: 1.8,
      },
    ]);

    repo.upsertFactorValues([
      {
        tradeDate: '2026-06-16',
        code: '600519',
        factorName: 'momentum',
        factorValue: 0.2,
      },
    ]);

    repo.upsertStockScores([
      {
        tradeDate: '2026-06-16',
        strategyName: 'baseline-v1',
        code: '600519',
        name: '贵州茅台',
        score: 0.88,
        rank: 1,
      },
    ]);

    repo.upsertDailyCandidates([
      {
        tradeDate: '2026-06-16',
        strategyName: 'baseline-v1',
        code: '600519',
        name: '贵州茅台',
        rank: 1,
        score: 0.88,
        suggestedCapital: 10000,
      },
    ]);

    assert.equal(
      db.prepare('SELECT COUNT(*) AS count FROM stock_quotes_daily_snapshot').get().count,
      1
    );
    assert.equal(
      db.prepare('SELECT price FROM stock_quotes_daily_snapshot WHERE code = ?').get('600519')
        .price,
      1510
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM stock_kline_daily').get().count, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM factor_values').get().count, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM stock_scores').get().count, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM daily_candidates').get().count, 1);
  } finally {
    db.close();
    cleanup();
  }
});

test('sqlite repository upserts and lists enabled stock universe symbols', () => {
  const { db, cleanup } = createTempDatabase();
  try {
    initializeDatabase(db);
    const repo = createSqliteRepository(db);

    repo.upsertStockUniverse([
      {
        code: '600519',
        name: 'Kweichow Moutai',
        market: 'SH',
        enabled: true,
        notes: 'core holding',
      },
      {
        code: '000001',
        name: 'Ping An Bank',
        market: 'SZ',
        enabled: false,
        notes: null,
      },
      {
        code: '600519',
        name: 'Kweichow Moutai Updated',
        market: 'SH',
        enabled: true,
        notes: 'updated',
      },
    ]);

    assert.deepEqual(repo.listEnabledUniverseSymbols(), ['600519']);
    assert.deepEqual(repo.listEnabledUniverseSymbols({ limit: 1 }), ['600519']);

    const row = db.prepare('SELECT name, enabled, notes FROM stock_universe WHERE code = ?').get(
      '600519'
    );
    assert.equal(row.name, 'Kweichow Moutai Updated');
    assert.equal(row.enabled, 1);
    assert.equal(row.notes, 'updated');
  } finally {
    db.close();
    cleanup();
  }
});

test('sqlite repository seeds stock universe from latest quote snapshot', () => {
  const { db, cleanup } = createTempDatabase();
  try {
    initializeDatabase(db);
    const repo = createSqliteRepository(db);

    repo.upsertQuoteSnapshots([
      {
        tradeDate: '2026-06-16',
        code: '000001',
        name: 'Ping An Bank Old',
        price: 10,
        changePercent: 1,
        volume: 100,
        amount: 1000,
        turnoverRate: null,
        pe: null,
        pb: null,
        totalMarketCap: null,
      },
      {
        tradeDate: '2026-06-17',
        code: '000001',
        name: 'Ping An Bank',
        price: 10,
        changePercent: 1,
        volume: 100,
        amount: 1000,
        turnoverRate: null,
        pe: null,
        pb: null,
        totalMarketCap: null,
      },
      {
        tradeDate: '2026-06-17',
        code: '600519',
        name: 'Kweichow Moutai',
        price: 1500,
        changePercent: 1,
        volume: 100,
        amount: 1000,
        turnoverRate: null,
        pe: null,
        pb: null,
        totalMarketCap: null,
      },
    ]);

    const result = repo.seedStockUniverseFromLatestQuoteSnapshot();

    assert.deepEqual(result, { tradeDate: '2026-06-17', rowCount: 2 });
    assert.deepEqual(repo.listEnabledUniverseSymbols(), ['000001', '600519']);
  } finally {
    db.close();
    cleanup();
  }
});

test('sqlite repository reads latest stored daily kline date by code', () => {
  const { db, cleanup } = createTempDatabase();
  try {
    initializeDatabase(db);
    const repo = createSqliteRepository(db);

    repo.upsertKlineDaily([
      {
        tradeDate: '2026-06-15',
        code: '600519',
        open: 1490,
        high: 1520,
        low: 1480,
        close: 1510,
        volume: 120,
        amount: 240,
        turnoverRate: 0.3,
        changePercent: 1.8,
      },
      {
        tradeDate: '2026-06-16',
        code: '600519',
        open: 1510,
        high: 1530,
        low: 1500,
        close: 1520,
        volume: 150,
        amount: 260,
        turnoverRate: 0.4,
        changePercent: 0.7,
      },
    ]);

    assert.equal(repo.getLatestKlineDate('600519'), '2026-06-16');
    assert.equal(repo.getLatestKlineDate('000001'), null);
  } finally {
    db.close();
    cleanup();
  }
});

function createTempDatabase() {
  const dir = mkdtempSync(join(tmpdir(), 'stock-scoring-'));
  const db = openDatabase(join(dir, 'test.sqlite'));
  return {
    db,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
