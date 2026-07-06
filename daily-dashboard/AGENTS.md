# 日报看板开发约定

- 数据源仅使用飞书 Base `FenabhJ7Na0fots8Em2cQhIanKf` 的 `tblaQen7S4W8B96T` 表。
- 页面保持纯静态结构：`index.html`、`styles.css`、`app.js`、`data/dashboard_data.json`。
- `scripts/pull_base_data.js` 负责分页拉取 Base 数据并生成静态 JSON，不在前端暴露凭据。
- 所有金额统一按元显示；比例字段按百分比显示；评分保留一位小数。
- 门店顺序以 Base 的“门店顺序”公式和项目 AGENTS.md 的台账顺序为准。
- 修改后至少执行数据拉取、JavaScript 语法检查和本地页面检查。

