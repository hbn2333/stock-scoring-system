import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTencentKlineUrl,
  fetchTencentDailyKlines,
  mapTencentSymbol,
  parseTencentDailyKlineResponse,
} from '../src/tencentKline.js';

test('mapTencentSymbol maps A-share codes to Tencent market symbols', () => {
  assert.equal(mapTencentSymbol('000001'), 'sz000001');
  assert.equal(mapTencentSymbol('300750'), 'sz300750');
  assert.equal(mapTencentSymbol('600519'), 'sh600519');
  assert.equal(mapTencentSymbol('688001'), 'sh688001');
  assert.equal(mapTencentSymbol('430047'), 'bj430047');
});

test('buildTencentKlineUrl uses dashed dates and qfq day key by default', () => {
  assert.equal(
    buildTencentKlineUrl('000001', {
      startDate: '20260601',
      endDate: '2026-06-19',
      adjust: 'qfq',
    }),
    'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sz000001,day,2026-06-01,2026-06-19,640,qfq'
  );
});

test('parseTencentDailyKlineResponse maps qfq rows to normalized kline objects', () => {
  const klines = parseTencentDailyKlineResponse(
    {
      code: 0,
      data: {
        sz000001: {
          qfqday: [
            ['2026-06-18', '10.95', '11.09', '11.13', '10.91', '1012368.000'],
            ['2026-06-19', '11.08', '10.96', '11.10', '10.90', '980001.000'],
          ],
        },
      },
    },
    { symbol: '000001', tencentSymbol: 'sz000001', adjust: 'qfq' }
  );

  assert.deepEqual(klines, [
    {
      date: '2026-06-18',
      code: '000001',
      open: 10.95,
      close: 11.09,
      high: 11.13,
      low: 10.91,
      volume: 1012368,
      amount: null,
      turnoverRate: null,
      changePercent: null,
    },
    {
      date: '2026-06-19',
      code: '000001',
      open: 11.08,
      close: 10.96,
      high: 11.1,
      low: 10.9,
      volume: 980001,
      amount: null,
      turnoverRate: null,
      changePercent: -1.1722,
    },
  ]);
});

test('fetchTencentDailyKlines calls fetch and returns parsed rows', async () => {
  const calls = [];
  const klines = await fetchTencentDailyKlines('600519', {
    startDate: '20260618',
    endDate: '20260619',
    adjust: 'qfq',
    fetchFn: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          code: 0,
          data: {
            sh600519: {
              qfqday: [['2026-06-19', '1400', '1410', '1420', '1390', '12345']],
            },
          },
        }),
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh600519,day,2026-06-18,2026-06-19,640,qfq'
  );
  assert.equal(calls[0].options.headers['User-Agent'], 'Mozilla/5.0');
  assert.equal(klines.length, 1);
  assert.equal(klines[0].code, '600519');
});

test('fetchTencentDailyKlines returns an empty array when Tencent has no rows for the window', async () => {
  const klines = await fetchTencentDailyKlines('430047', {
    startDate: '20260618',
    endDate: '20260619',
    fetchFn: async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ code: 0, data: { bj430047: { day: [] } } }),
    }),
  });

  assert.deepEqual(klines, []);
});
