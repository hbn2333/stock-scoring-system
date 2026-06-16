import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ingestDailyKlines,
  ingestQuoteSnapshots,
  normalizeKlineRow,
  normalizeQuoteRow,
} from '../src/ingest.js';

test('normalizeQuoteRow maps stock-sdk quote fields to quote snapshot rows', () => {
  assert.deepEqual(
    normalizeQuoteRow('2026-06-16', {
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
    }),
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
    }
  );
});

test('normalizeKlineRow maps stock-sdk kline fields to daily kline rows', () => {
  assert.deepEqual(
    normalizeKlineRow({
      date: '2026-06-16',
      code: '600519',
      open: 1490,
      high: 1520,
      low: 1480,
      close: 1510,
      volume: 120,
      amount: 240,
      turnoverRate: 0.3,
      changePercent: 1.8,
    }),
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
    }
  );
});

test('ingestQuoteSnapshots fetches A-share batch quotes and writes repository rows', async () => {
  const calls = [];
  const sdk = {
    batch: {
      cn: async (options) => {
        calls.push(options);
        return [
          {
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
        ];
      },
    },
  };
  const repo = createMemoryRepo();

  const result = await ingestQuoteSnapshots({ sdk, repo, tradeDate: '2026-06-16' });

  assert.deepEqual(calls, [{ concurrency: 5 }]);
  assert.equal(result.rowCount, 1);
  assert.equal(repo.quoteSnapshots[0].code, '600519');
});

test('ingestDailyKlines fetches every symbol and writes flattened kline rows', async () => {
  const calls = [];
  const sdk = {
    kline: {
      cn: async (symbol, options) => {
        calls.push({ symbol, options });
        return [
          {
            date: '2026-06-16',
            code: symbol,
            open: 10,
            high: 12,
            low: 9,
            close: 11,
            volume: 100,
            amount: 1000,
            turnoverRate: 1,
            changePercent: 2,
          },
        ];
      },
    },
  };
  const repo = createMemoryRepo();

  const result = await ingestDailyKlines({
    sdk,
    repo,
    symbols: ['600519', '000001'],
    options: { period: 'daily', adjust: 'qfq' },
  });

  assert.deepEqual(calls, [
    { symbol: '600519', options: { period: 'daily', adjust: 'qfq' } },
    { symbol: '000001', options: { period: 'daily', adjust: 'qfq' } },
  ]);
  assert.equal(result.rowCount, 2);
  assert.deepEqual(
    repo.klineDaily.map((row) => row.code),
    ['600519', '000001']
  );
});

function createMemoryRepo() {
  return {
    quoteSnapshots: [],
    klineDaily: [],
    upsertQuoteSnapshots(rows) {
      this.quoteSnapshots.push(...rows);
    },
    upsertKlineDaily(rows) {
      this.klineDaily.push(...rows);
    },
  };
}
