import test from 'node:test';
import assert from 'node:assert/strict';

import { updateDailyData } from '../src/updateDaily.js';

test('updateDailyData fetches quotes and only missing daily klines', async () => {
  const calls = { quotes: [], klines: [] };
  const sdk = {
    batch: {
      cn: async (options) => {
        calls.quotes.push(options);
        return [
          {
            code: '600519',
            name: 'Kweichow Moutai',
            price: 1510,
            changePercent: 1.8,
            volume: 120,
            amount: 240,
          },
        ];
      },
    },
    kline: {
      cn: async (symbol, options) => {
        calls.klines.push({ symbol, options });
        return [
          {
            date: '2026-06-17',
            code: symbol,
            open: 1510,
            high: 1530,
            low: 1500,
            close: 1520,
            volume: 150,
            amount: 260,
          },
        ];
      },
    },
  };
  const repo = createMemoryRepo({ latestByCode: { '600519': '2026-06-16' } });

  const report = await updateDailyData({
    sdk,
    repo,
    tradeDate: '2026-06-17',
    symbols: ['600519'],
    quoteOptions: { concurrency: 2 },
    klineOptions: { period: 'daily', adjust: 'qfq' },
  });

  assert.equal(report.status, 'success');
  assert.deepEqual(calls.quotes, [{ concurrency: 2 }]);
  assert.deepEqual(calls.klines, [
    {
      symbol: '600519',
      options: {
        period: 'daily',
        adjust: 'qfq',
        startDate: '20260617',
        endDate: '20260617',
      },
    },
  ]);
  assert.equal(repo.quoteSnapshots.length, 1);
  assert.equal(repo.klineDaily.length, 1);
  assert.equal(report.jobs.find((job) => job.type === 'kline').rowCount, 1);
});

test('updateDailyData skips kline fetch when stored data is already current', async () => {
  const sdk = {
    batch: {
      cn: async () => [],
    },
    kline: {
      cn: async () => {
        throw new Error('kline fetch should not run');
      },
    },
  };
  const repo = createMemoryRepo({ latestByCode: { '600519': '2026-06-17' } });

  const report = await updateDailyData({
    sdk,
    repo,
    tradeDate: '2026-06-17',
    symbols: ['600519'],
  });

  const klineJob = report.jobs.find((job) => job.type === 'kline');
  assert.equal(report.status, 'success');
  assert.equal(klineJob.status, 'skipped');
  assert.equal(klineJob.reason, 'already_current');
  assert.equal(repo.klineDaily.length, 0);
});

test('updateDailyData isolates per-symbol kline failures', async () => {
  const sdk = {
    batch: {
      cn: async () => [],
    },
    kline: {
      cn: async (symbol) => {
        if (symbol === '000001') throw new Error('network down');
        return [
          {
            date: '2026-06-17',
            code: symbol,
            close: 11,
          },
        ];
      },
    },
  };
  const repo = createMemoryRepo();

  const report = await updateDailyData({
    sdk,
    repo,
    tradeDate: '2026-06-17',
    symbols: ['600519', '000001'],
    initialStart: '20200101',
  });

  assert.equal(report.status, 'partial_success');
  assert.equal(repo.klineDaily.length, 1);
  assert.deepEqual(
    report.failures.map((failure) => ({
      type: failure.type,
      symbol: failure.symbol,
      message: failure.message,
    })),
    [{ type: 'kline', symbol: '000001', message: 'network down' }]
  );
});

test('updateDailyData records quote failure and still updates klines', async () => {
  const sdk = {
    batch: {
      cn: async () => {
        throw new Error('quote source unavailable');
      },
    },
    kline: {
      cn: async (symbol) => [
        {
          date: '2026-06-17',
          code: symbol,
          close: 11,
        },
      ],
    },
  };
  const repo = createMemoryRepo();

  const report = await updateDailyData({
    sdk,
    repo,
    tradeDate: '2026-06-17',
    symbols: ['600519'],
  });

  assert.equal(report.status, 'partial_success');
  assert.equal(repo.quoteSnapshots.length, 0);
  assert.equal(repo.klineDaily.length, 1);
  assert.equal(report.failures[0].type, 'quotes');
  assert.equal(report.failures[0].message, 'quote source unavailable');
});

test('updateDailyData can skip quote snapshot fetch for kline-only backfills', async () => {
  const sdk = {
    batch: {
      cn: async () => {
        throw new Error('quote fetch should not run');
      },
    },
    kline: {
      cn: async (symbol) => [
        {
          date: '2026-06-17',
          code: symbol,
          close: 11,
        },
      ],
    },
  };
  const repo = createMemoryRepo();

  const report = await updateDailyData({
    sdk,
    repo,
    tradeDate: '2026-06-17',
    symbols: ['600519'],
    includeQuotes: false,
  });

  assert.equal(report.status, 'success');
  assert.equal(report.jobs.some((job) => job.type === 'quotes'), false);
  assert.equal(repo.klineDaily.length, 1);
});

function createMemoryRepo({ latestByCode = {} } = {}) {
  return {
    quoteSnapshots: [],
    klineDaily: [],
    getLatestKlineDate(code) {
      return latestByCode[code] ?? null;
    },
    upsertQuoteSnapshots(rows) {
      this.quoteSnapshots.push(...rows);
    },
    upsertKlineDaily(rows) {
      this.klineDaily.push(...rows);
    },
  };
}
