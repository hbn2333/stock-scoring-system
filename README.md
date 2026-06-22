# stock-scoring-system

独立的股票评分系统原型，用 `stock-sdk` 作为数据源，自己维护数据仓库、因子、评分和候选池。

当前阶段是零依赖核心逻辑：

- 数据库 schema SQL：行情快照、日 K、因子、评分、候选池
- SQLite 初始化与 upsert repository：基于 Node 内置 `node:sqlite`
- 技术因子：动量、波动率、成交额均值、最大回撤
- 综合评分：按因子归一化后加权排序
- 候选池：按资金规模和最大持仓数给出建议资金分配

## 命令

```bash
node --test
```

## 初始化本地数据库

```js
import {
  createSqliteRepository,
  initializeDatabase,
  openDatabase,
} from './src/index.js';

const db = openDatabase('data/stock-scoring.sqlite');
initializeDatabase(db);
const repo = createSqliteRepository(db);
```

当前使用 Node 内置 `node:sqlite`，运行时会出现 ExperimentalWarning。它适合先把 MVP 跑通；后续如果要长期稳定运行，可以替换为 DuckDB 或 `better-sqlite3`。

## 抓取每日数据

安装依赖后可以运行：

```bash
npm run ingest:daily -- --date=2026-06-16 "--symbols=600519,000001"
```

默认会抓全市场 A 股行情快照。日 K 为了避免第一次抓取量过大，需要通过 `--symbols` 明确指定代码列表。

## 增量更新每日数据

推荐日常使用新的增量更新命令：

```bash
npm run update:daily -- --end-date=2026-06-17 "--symbols=600519,000001"
```

这个命令会调用 `updateDailyData()`：

- 每次更新当日全市场行情快照。
- 对每个 `--symbols` 股票先查询数据库里已有的最新日 K 日期，只补缺失日期。
- 单只股票抓取失败不会中断其他股票，命令会输出 JSON 报告，包含 `success`、`partial_success` 或 `failed` 状态。
- 第一次更新某只股票时，默认从 `20200101` 开始抓取；可用 `--initial-start=20240101` 调小首次回补范围。
- `--end-date` 是补数据的截止日期；旧参数 `--date` 仍兼容，但新命令建议统一写 `--end-date`。

未来做 HTML 前端时，后端接口应该直接调用 `src/updateDaily.js` 里的 `updateDailyData()`，不要从 Web 按钮里 shell out 到 CLI。CLI 只是本地手动执行入口。

## 建立股票池并批量回补

第一次建库建议按这个顺序执行：

```bash
npm run update:daily -- --end-date=2026-06-17
npm run universe:seed
npm run backfill:universe -- --end-date=2026-06-17 --initial-start=20240101 --batch-size=50
```

含义：

- `update:daily` 先抓一次全市场行情快照。
- `universe:seed` 从最新行情快照把股票代码、名称、市场写入 `stock_universe`。
- `backfill:universe` 读取启用股票池，只筛选最新日 K 日期还没到 `--end-date` 的股票，分批补日 K。默认只补 K 线，不重复抓全市场快照。
- 回补失败会写入 `ingest_failures`，后续可以单独重试。
- `--end-date` 最好使用交易日；如果填周末或节假日，最后一根日 K 通常停在前一个交易日，脚本会认为还没补到该自然日。

测试小批量时可以加 `--limit=100`：

```bash
npm run backfill:universe -- --end-date=2026-06-17 --initial-start=20240101 --batch-size=20 --limit=100
```

回补过程中会输出进度和预计剩余时间，例如：

```text
[backfill 12/277] 240/5527 symbols | rows 18320 | failures 3 | elapsed 00:08:42 | ETA 03:05:18
```

进度行输出到 stderr，最终 JSON 报告输出到 stdout。需要保存最终报告时可以重定向 stdout。

## 重试失败抓取

如果回补报告里出现 `failures`，可以运行：

```bash
npm run retry:failures -- --end-date=2026-06-18 --max-attempts=5 --batch-size=10
```

逻辑：

- 只读取 `ingest_failures` 中 `pending` 的 K 线失败记录。
- `--end-date` 会匹配失败记录里的截止日期；旧参数 `--date` 仍兼容。
- 在一次命令执行里持续重试，直到成功、没有 pending，或累计达到 `--max-attempts`。
- 成功后标记 `resolved`。
- 达到上限仍失败后标记 `gave_up`，后续默认不再自动重试。
- 输出报告里的 `failedAttempts` 是本次失败尝试次数，`remainingFailures` 是命令结束后仍处于 pending 的记录数。
- 重试过程也会输出进度行，例如：

```text
[retry pass 2 batch 4] attempts 40/100 | resolved 8 | failed attempts 32 | pending 12 | elapsed 00:01:30 | ETA 00:02:15
```

## 下一步

1. 增加资金流、北向、板块强度因子。
2. 增加回测和每日候选池生成 CLI。
3. 增加股票池配置，控制需要抓取日 K 的标的范围。
4. 需要稳定生产运行时，再评估 DuckDB 或 `better-sqlite3`。
