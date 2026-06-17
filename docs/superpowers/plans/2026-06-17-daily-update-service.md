# Daily Update Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable incremental daily updater for quote snapshots and selected K-line symbols.

**Architecture:** Keep `src/ingest.js` as low-level normalization/ingest utilities. Add `src/updateDaily.js` as the orchestration service and expose it through `src/index.js`; add `src/cli/update-daily.js` as a thin CLI wrapper.

**Tech Stack:** Node.js ESM, `node:test`, `node:sqlite`, local `stock-sdk`.

---

### Task 1: Repository Read Support

**Files:**
- Modify: `src/db.js`
- Modify: `test/db.test.js`

- [ ] Add a failing test proving `repo.getLatestKlineDate('600519')` returns the latest stored date and returns `null` for an unknown code.
- [ ] Implement `getLatestKlineDate(code)` with `SELECT MAX(trade_date) AS latest FROM stock_kline_daily WHERE code = ?`.
- [ ] Run `npm test`.

### Task 2: Reusable Update Service

**Files:**
- Create: `src/updateDaily.js`
- Create: `test/updateDaily.test.js`
- Modify: `src/index.js`

- [ ] Add failing tests for incremental range selection, current-data skip behavior, and per-symbol failure isolation.
- [ ] Implement `updateDailyData({ sdk, repo, tradeDate, symbols, initialStart, quoteOptions, klineOptions })`.
- [ ] Export the service from `src/index.js`.
- [ ] Run `npm test`.

### Task 3: CLI Wrapper And Docs

**Files:**
- Create: `src/cli/update-daily.js`
- Modify: `package.json`
- Modify: `README.md`

- [ ] Add `npm run update:daily`.
- [ ] Implement the CLI as argument parsing plus one call to `updateDailyData()`.
- [ ] Document the command and explain that future Web endpoints should call the service, not shell out to the CLI.
- [ ] Run `npm test`.
