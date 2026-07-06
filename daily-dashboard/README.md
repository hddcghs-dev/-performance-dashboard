# 民德时代日报看板

以飞书 Base 为数据源的纯静态日报看板。

## 更新数据

```powershell
node scripts/pull_base_data.js
```

## 本地预览

```powershell
node scripts/serve.js
```

打开 `http://localhost:8080`。

## 文件结构

- `index.html`：页面结构
- `styles.css`：视觉样式
- `app.js`：筛选、统计、图表和导出逻辑
- `data/dashboard_data.json`：服务器模式使用的静态数据
- `data/dashboard_data.js`：支持直接双击 `index.html` 打开的内嵌数据
- `scripts/pull_base_data.js`：Base 分页拉取脚本
