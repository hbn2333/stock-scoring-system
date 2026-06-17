# Stock Universe And Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stock universe storage and a batch backfill command that builds the local database from enabled symbols.

**Architecture:** Extend schema/repository with `stock_universe`; add `backfillUniverseData()` service that reuses `updateDailyData()`; add thin CLI wrappers for seeding and backfilling.

**Tech Stack:** Node.js ESM, `node:test`, `node:sqlite`, local `stock-sdk`.

---

### Task 1: Stock Universe Table And Repository

- [ ] Write failing schema and repository tests for `stock_universe`.
- [ ] Add `stock_universe` table to `src/schema.js`.
- [ ] Add `upsertStockUniverse()` and `listEnabledUniverseSymbols()` to `src/db.js`.
- [ ] Run `npm.cmd test`.

### Task 2: Backfill Service

- [ ] Write failing tests for batching enabled symbols and summarizing failures.
- [ ] Add `src/backfill.js` with `backfillUniverseData()`.
- [ ] Export it from `src/index.js`.
- [ ] Run `npm.cmd test`.

### Task 3: CLI And Docs

- [ ] Add CLI argument parsers and commands for seeding the universe and backfilling.
- [ ] Add npm scripts.
- [ ] Document the commands in `README.md`.
- [ ] Run `npm.cmd test`.
