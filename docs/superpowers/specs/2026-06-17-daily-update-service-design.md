# Daily Update Service Design

## Goal

Build a reusable daily data update service that can be called from both a CLI command and a future HTML update button.

## Architecture

The update flow has one production entry point: `updateDailyData()`.
The CLI only parses command arguments, opens the database, creates the SDK/repository, and calls that service.

The repository owns SQLite reads and writes. The update service owns fetch orchestration, incremental date ranges, and per-symbol error isolation.

## Data Flow

1. Initialize the SQLite schema.
2. Fetch the current A-share quote snapshot for `tradeDate`.
3. For each requested symbol, read the latest stored daily K-line date.
4. If the stored latest date is before `tradeDate`, fetch only from the next calendar day through `tradeDate`.
5. Upsert all returned rows.
6. Return a structured report with job status, row counts, skipped symbols, and failures.

## Error Handling

Quote fetch failure is recorded as a failed job.
K-line failures are isolated per symbol so one failed symbol does not block other symbols.

The report status is:

- `success`: every requested job succeeded or was skipped because data was already current.
- `partial_success`: at least one job failed and at least one job succeeded or skipped.
- `failed`: every attempted job failed.

## Tests

Tests cover repository latest-date reads, incremental K-line fetch ranges, skip behavior for current symbols, and partial success when one symbol fails.
