import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { createSchemaSql } from './schema.js';

export function openDatabase(filePath = 'data/stock-scoring.sqlite') {
  mkdirSync(dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

export function initializeDatabase(db) {
  for (const statement of createSchemaSql()) {
    db.exec(statement);
  }
}

export function createSqliteRepository(db) {
  return {
    upsertQuoteSnapshots(rows) {
      const statement = db.prepare(`
        INSERT INTO stock_quotes_daily_snapshot (
          trade_date, code, name, price, change_percent, volume, amount,
          turnover_rate, pe, pb, total_market_cap
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(trade_date, code) DO UPDATE SET
          name = excluded.name,
          price = excluded.price,
          change_percent = excluded.change_percent,
          volume = excluded.volume,
          amount = excluded.amount,
          turnover_rate = excluded.turnover_rate,
          pe = excluded.pe,
          pb = excluded.pb,
          total_market_cap = excluded.total_market_cap
      `);

      runMany(db, rows, (row) =>
        statement.run(
          row.tradeDate,
          row.code,
          row.name,
          row.price,
          row.changePercent,
          row.volume,
          row.amount,
          row.turnoverRate,
          row.pe,
          row.pb,
          row.totalMarketCap
        )
      );
    },

    upsertKlineDaily(rows) {
      const statement = db.prepare(`
        INSERT INTO stock_kline_daily (
          trade_date, code, open, high, low, close, volume, amount,
          turnover_rate, change_percent
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(trade_date, code) DO UPDATE SET
          open = excluded.open,
          high = excluded.high,
          low = excluded.low,
          close = excluded.close,
          volume = excluded.volume,
          amount = excluded.amount,
          turnover_rate = excluded.turnover_rate,
          change_percent = excluded.change_percent
      `);

      runMany(db, rows, (row) =>
        statement.run(
          row.tradeDate,
          row.code,
          row.open,
          row.high,
          row.low,
          row.close,
          row.volume,
          row.amount,
          row.turnoverRate,
          row.changePercent
        )
      );
    },

    upsertFactorValues(rows) {
      const statement = db.prepare(`
        INSERT INTO factor_values (trade_date, code, factor_name, factor_value)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(trade_date, code, factor_name) DO UPDATE SET
          factor_value = excluded.factor_value
      `);

      runMany(db, rows, (row) =>
        statement.run(row.tradeDate, row.code, row.factorName, row.factorValue)
      );
    },

    upsertStockScores(rows) {
      const statement = db.prepare(`
        INSERT INTO stock_scores (trade_date, strategy_name, code, name, score, rank)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(trade_date, strategy_name, code) DO UPDATE SET
          name = excluded.name,
          score = excluded.score,
          rank = excluded.rank
      `);

      runMany(db, rows, (row) =>
        statement.run(
          row.tradeDate,
          row.strategyName,
          row.code,
          row.name,
          row.score,
          row.rank
        )
      );
    },

    upsertDailyCandidates(rows) {
      const statement = db.prepare(`
        INSERT INTO daily_candidates (
          trade_date, strategy_name, code, name, rank, score, suggested_capital
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(trade_date, strategy_name, code) DO UPDATE SET
          name = excluded.name,
          rank = excluded.rank,
          score = excluded.score,
          suggested_capital = excluded.suggested_capital
      `);

      runMany(db, rows, (row) =>
        statement.run(
          row.tradeDate,
          row.strategyName,
          row.code,
          row.name,
          row.rank,
          row.score,
          row.suggestedCapital
        )
      );
    },
  };
}

function runMany(db, rows, write) {
  db.exec('BEGIN');
  try {
    for (const row of rows) write(row);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
