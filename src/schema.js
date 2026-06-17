export const TABLES = [
  'ingest_runs',
  'stock_universe',
  'stock_quotes_daily_snapshot',
  'stock_kline_daily',
  'factor_values',
  'stock_scores',
  'daily_candidates',
];

export function createSchemaSql() {
  return [
    `CREATE TABLE IF NOT EXISTS ingest_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL,
      row_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS stock_universe (
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      market TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(code)
    )`,
    `CREATE TABLE IF NOT EXISTS stock_quotes_daily_snapshot (
      trade_date TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL,
      change_percent REAL,
      volume REAL,
      amount REAL,
      turnover_rate REAL,
      pe REAL,
      pb REAL,
      total_market_cap REAL,
      UNIQUE(trade_date, code)
    )`,
    `CREATE TABLE IF NOT EXISTS stock_kline_daily (
      trade_date TEXT NOT NULL,
      code TEXT NOT NULL,
      open REAL,
      high REAL,
      low REAL,
      close REAL,
      volume REAL,
      amount REAL,
      turnover_rate REAL,
      change_percent REAL,
      UNIQUE(trade_date, code)
    )`,
    `CREATE TABLE IF NOT EXISTS factor_values (
      trade_date TEXT NOT NULL,
      code TEXT NOT NULL,
      factor_name TEXT NOT NULL,
      factor_value REAL,
      UNIQUE(trade_date, code, factor_name)
    )`,
    `CREATE TABLE IF NOT EXISTS stock_scores (
      trade_date TEXT NOT NULL,
      strategy_name TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT,
      score REAL NOT NULL,
      rank INTEGER NOT NULL,
      UNIQUE(trade_date, strategy_name, code)
    )`,
    `CREATE TABLE IF NOT EXISTS daily_candidates (
      trade_date TEXT NOT NULL,
      strategy_name TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT,
      rank INTEGER NOT NULL,
      score REAL NOT NULL,
      suggested_capital REAL NOT NULL,
      UNIQUE(trade_date, strategy_name, code)
    )`,
  ];
}
