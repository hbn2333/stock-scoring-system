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

## 下一步

1. 增加资金流、北向、板块强度因子。
2. 增加回测和每日候选池生成 CLI。
3. 增加股票池配置，控制需要抓取日 K 的标的范围。
4. 需要稳定生产运行时，再评估 DuckDB 或 `better-sqlite3`。
