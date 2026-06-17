# Stock Universe And Backfill Design

## Goal

Add a persistent stock universe and a reusable backfill flow so the database can be built from a configured stock pool instead of manually passing symbols every time.

## Architecture

The database owns the stock pool through a `stock_universe` table. Repository methods read and write enabled symbols. A new `backfillUniverseData()` service reads enabled symbols, splits them into batches, and calls the existing `updateDailyData()` service for each batch.

## Data Flow

1. Seed or upsert stocks into `stock_universe`.
2. Query enabled symbols, optionally capped by `limit`.
3. Split symbols into batches.
4. For each batch, call `updateDailyData()` with `initialStart`.
5. Return a report with batch statuses, total symbols, total K-line rows, and failures.

## Error Handling

`updateDailyData()` already isolates per-symbol K-line fetch failures. The backfill service treats each batch report as data and continues through all batches. If every batch fails, the backfill report is `failed`; if some fail, it is `partial_success`.

## Initial Scope

This does not try to discover every listed A-share automatically yet. The first version supports seeding a known universe from CLI arguments, then batch backfilling enabled symbols from the database.
