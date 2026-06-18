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
    recordIngestFailure({ jobType, symbol, tradeDate, errorMessage, maxAttempts = 5 }) {
      const now = new Date().toISOString();
      db.prepare(
        `
        INSERT INTO ingest_failures (
          job_type, symbol, trade_date, attempt_count, last_error, status,
          created_at, updated_at, resolved_at
        )
        VALUES (?, ?, ?, 1, ?, CASE WHEN ? <= 1 THEN 'gave_up' ELSE 'pending' END, ?, ?, NULL)
        ON CONFLICT(job_type, symbol, trade_date) DO UPDATE SET
          attempt_count = ingest_failures.attempt_count + 1,
          last_error = excluded.last_error,
          status = CASE
            WHEN ingest_failures.attempt_count + 1 >= ? THEN 'gave_up'
            ELSE 'pending'
          END,
          updated_at = excluded.updated_at,
          resolved_at = NULL
      `
      ).run(jobType, symbol, tradeDate, errorMessage, maxAttempts, now, now, maxAttempts);
    },

    resolveIngestFailure({ jobType, symbol, tradeDate }) {
      db.prepare(
        `
        UPDATE ingest_failures
        SET status = 'resolved', updated_at = ?, resolved_at = ?
        WHERE job_type = ? AND symbol = ? AND trade_date = ?
      `
      ).run(new Date().toISOString(), new Date().toISOString(), jobType, symbol, tradeDate);
    },

    listPendingIngestFailures({ jobType, tradeDate, limit } = {}) {
      const filters = ["status = 'pending'"];
      const values = [];
      if (jobType) {
        filters.push('job_type = ?');
        values.push(jobType);
      }
      if (tradeDate) {
        filters.push('trade_date = ?');
        values.push(tradeDate);
      }
      const sql = [
        `
        SELECT
          job_type AS jobType,
          symbol,
          trade_date AS tradeDate,
          attempt_count AS attemptCount,
          last_error AS lastError,
          status
        FROM ingest_failures
        WHERE ${filters.join(' AND ')}
        ORDER BY updated_at ASC, symbol ASC
      `,
        limit ? 'LIMIT ?' : '',
      ]
        .filter(Boolean)
        .join(' ');
      if (limit) values.push(limit);
      return db.prepare(sql).all(...values).map((row) => ({ ...row }));
    },

    upsertStockUniverse(rows) {
      const statement = db.prepare(`
        INSERT INTO stock_universe (code, name, market, enabled, notes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
          name = excluded.name,
          market = excluded.market,
          enabled = excluded.enabled,
          notes = excluded.notes,
          updated_at = excluded.updated_at
      `);

      runMany(db, rows, (row) =>
        statement.run(
          row.code,
          row.name,
          row.market ?? null,
          row.enabled === false ? 0 : 1,
          row.notes ?? null,
          row.updatedAt ?? new Date().toISOString()
        )
      );
    },

    listEnabledUniverseSymbols({ limit } = {}) {
      const sql = [
        'SELECT code FROM stock_universe WHERE enabled = 1 ORDER BY code',
        limit ? 'LIMIT ?' : '',
      ]
        .filter(Boolean)
        .join(' ');
      const statement = db.prepare(sql);
      const rows = limit ? statement.all(limit) : statement.all();
      return rows.map((row) => row.code);
    },

    seedStockUniverseFromLatestQuoteSnapshot() {
      const latest = db
        .prepare('SELECT MAX(trade_date) AS tradeDate FROM stock_quotes_daily_snapshot')
        .get().tradeDate;
      if (!latest) return { tradeDate: null, rowCount: 0 };

      const result = db
        .prepare(
          `
          INSERT INTO stock_universe (code, name, market, enabled, notes, updated_at)
          SELECT
            code,
            name,
            CASE
              WHEN substr(code, 1, 1) = '6' THEN 'SH'
              WHEN substr(code, 1, 1) IN ('0', '3') THEN 'SZ'
              WHEN substr(code, 1, 1) IN ('4', '8') THEN 'BJ'
              ELSE NULL
            END AS market,
            1 AS enabled,
            NULL AS notes,
            ? AS updated_at
          FROM stock_quotes_daily_snapshot
          WHERE trade_date = ?
          ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            market = excluded.market,
            updated_at = excluded.updated_at
        `
        )
        .run(new Date().toISOString(), latest);

      return { tradeDate: latest, rowCount: result.changes };
    },

    getLatestKlineDate(code) {
      const row = db
        .prepare('SELECT MAX(trade_date) AS latest FROM stock_kline_daily WHERE code = ?')
        .get(code);
      return row.latest ?? null;
    },

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
