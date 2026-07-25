# 民德搓澡堂 · 经营看板

26 店经营数据看板，通过 GitHub Pages 部署。

在线地址：https://hddcghs-dev.github.io/-performance-dashboard/

## 这个仓库是被自动写入的

**不要手工编辑数据文件，也不要手工 commit/push。**
内容由日报流水线每天早上自动生成并推送，工作目录在：

```
/Users/chenxiaolan/Documents/Codex/2026-05-29/9-https-www-life-data-cn
```

发布链路：

```
飞书「门店日明细」表
  → scripts/build-performance-dashboard-data.js   生成数据文件
  → scripts/sync-dashboard-to-github.mjs          commit + push 到本仓库
```

由 `scripts/run-life-data-daily.js` 在每日流程末尾调用，
详见工作目录里的 `AUTOMATION.md`。

手动触发一次：

```bash
cd /Users/chenxiaolan/Documents/Codex/2026-05-29/9-https-www-life-data-cn
node scripts/sync-dashboard-to-github.mjs --date 2026-07-24
```

同步脚本会先 `git rebase origin/main`，**所以本仓库的工作区必须保持干净**。
在这里留下未提交的改动会让第二天的自动同步失败。

## 文件说明

| 文件 | 说明 | 谁在写 |
| --- | --- | --- |
| `dashboard.html` | 看板页面本体，JS/CSS 全部内联 | 人工 |
| `dashboard-metric-rules.js` | 指标口径规则 | 人工 |
| `dashboard_version.json` | 版本清单，页面先读它再按版本号取数据（缓存破坏） | 自动 |
| `dashboard_data.json` | 全量数据，同时是增量构建的状态文件 | 自动 |
| `dashboard_core.json` | 月度核心数据分片 | 自动 |
| `dashboard_daily_YYYY.json` | 按年拆分的日粒度分片 | 自动 |
| `index.html` | 站点首页，负责跳转 | 人工 |
| `daily-dashboard/index.html` | 单文件快照看板 | 人工 |
| `echarts.min.js` / `assets/` | 图表库 | 人工 |

`dashboard_data.json` 既是页面数据源，也是 `build-performance-dashboard-data.js`
下一次构建时读取的历史底稿——它每天被读出、追加当天、再写回。
**删掉它会导致第二天构建失败。**

## 已知的坑

- **首页和日更数据不是同一个看板。** `index.html` 跳转到 `daily-dashboard/`，
  那是一份人工提交的单文件快照，不参与每日同步；每天自动更新的是
  `dashboard.html?grain=daily`。两者会随时间越差越远。
- **`grain=daily` 目前读全量 `dashboard_data.json`**，分片只在
  `grain=monthly` 时生效（见 `dashboard.html` 的 `fetchDashboardData`）。
  按年懒加载的 `ensureDailyYear()` 已经写好，daily 路径下用不上。

## 数据口径

字段口径、门店名称映射、核销差异规则全部写在工作目录的 `AUTOMATION.md`，
不在本仓库维护，避免两处不一致。

飞书数据源：

- Base Token：`Y7oubeBYNaAVqNs7yurc5SxSnee`
- 门店日明细表：`tblXCehbW5BMG0sg`
