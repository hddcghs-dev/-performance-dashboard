# 民德搓澡堂 · 经营看板（发布仓库）

这是一个**纯发布产物仓库**，不是开发目录。除 `dashboard.html`、
`dashboard-metric-rules.js`、`index.html` 和 `daily-dashboard/` 外，
其余文件都由脚本每天覆盖写入。

真正的源码和文档在工作目录：

```
/Users/chenxiaolan/Documents/Codex/2026-05-29/9-https-www-life-data-cn
```

**动手前先读那里的 `AUTOMATION.md`**，口径、门店映射、数据质量规则全在那份文档里，
本仓库不重复维护。

## 两条铁律

1. **工作区必须保持干净。** `sync-dashboard-to-github.mjs` 每天会
   `git rebase origin/main`，这里留下未提交改动会让自动同步失败。
   要改 `dashboard.html`，改完当场 commit。
2. **不要删 `dashboard_data.json`。** 它不只是页面数据，
   `build-performance-dashboard-data.js` 每天读它取历史、追加当天、再写回。
   删了第二天构建直接报错。

## 谁在写什么

```
飞书「门店日明细」表 (Y7oubeBYNaAVqNs7yurc5SxSnee / tblXCehbW5BMG0sg)
  → build-performance-dashboard-data.js
      读 dashboard_data.json 取历史
      按 --date 从飞书只拉当天 26 条
      写回 dashboard_data.json + dashboard_core.json
         + dashboard_daily_YYYY.json + dashboard_version.json
  → sync-dashboard-to-github.mjs
      只 git add 上面这几个 json 和 dashboard.html、dashboard-metric-rules.js
      commit "Update daily performance data" 后 push
```

`index.html`、`echarts.min.js`、`ui-*.css` 不在自动发布名单里，只能人工改人工提交。

站点首页 `index.html` 跳到 `dashboard.html?grain=daily`。
（2026-07-25 前它跳到 `daily-dashboard/` 的单文件快照，那份不参与每日同步、
数据冻结在 2026-07-18，已删除。）

## 前端取数

页面先读 `dashboard_version.json` 拿版本号，再按版本号请求数据文件（用于缓存破坏）。

```js
// dashboard.html · fetchDashboardData
grain=monthly → dashboard_core.json          （1.1MB）
grain=daily   → dashboard_data.json          （17.6MB，全量）
```

`ensureDailyYear()` 支持按年拉 `dashboard_daily_YYYY.json` 分片，
但只有 monthly 路径走到那里；daily 路径因为已经拿到全量数据，永远不会触发懒加载。
**要改数据加载策略，这两个函数得一起改。**

## 门店

当前 26 店，顺序由飞书「门店日明细」表的 `排序` 字段决定，不要在前端硬编码门店列表。

历史遗留：本仓库早期是"月度业绩看板"，数据源是 Excel + Python `generate_json.py`，
门店数是 23/25。**那套流程已经全部废弃**，现在是 Node 脚本直连飞书 Base。
如果在别处看到 `业绩看板_优化版`、`github-pages-deploy`、`generate_json.py`
这些名字，都是过时信息。
