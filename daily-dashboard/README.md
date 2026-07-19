# 日报经营看板 · 可迁移包

民德时代日报经营看板（曜石翡翠视觉），数据截至 **2026-07-18**，共 1913 条记录、26 家门店、79 个经营日。

## 包内文件

| 文件 | 用途 |
|------|------|
| `index.html` | 看板本体（约 1MB，**数据已内嵌，双击即可离线打开**，无需任何环境） |
| `base-records.json` | 数据快照（飞书 Base 全量记录，用于重新生成看板） |
| `scripts/build-base-dashboard.js` | 看板生成器（曜石翡翠视觉 + 单店门店切换 + 首页 8 核心卡） |
| `scripts/daily-base-schema.js` | 飞书 Base 配置与记录清洗（BASE_TOKEN / TABLE_ID） |
| `scripts/store-order.js` | 门店排序规则 |

依赖：仅 Node.js（建议 ≥ 18），无 npm 包依赖。

## 三种使用方式

### 1. 直接查看（零环境）

双击 `index.html` 用浏览器打开即可。支持：明暗主题切换、按日/周/月/季/年/自定义周期、点击指标卡看门店横向对比与当月趋势、单店页顶部门店切换、每日明细表。手机端自适应。

### 2. 用现有数据重新生成看板

```bash
node scripts/build-base-dashboard.js --from-json base-records.json
```

输出到 `outputs/daily-dashboard/index.html` 与 `outputs/daily-dashboard/base-records.json`（相对包根目录自动创建）。

### 3. 拉取飞书最新数据后重建

```bash
node scripts/build-base-dashboard.js
```

前提：系统 PATH 中存在已登录的 `lark-cli`（飞书 CLI）。没有 lark-cli 时此方式不可用，请用方式 2，或在其他机器更新 `base-records.json` 后再重建。

## 部署到线上

- **GitHub Pages**：把 `index.html`（可选连同 `base-records.json`）推到仓库 Pages 分支即可，纯静态。
- **任意静态托管/内网服务器**：单文件 `index.html` 直接放上去，无服务端要求。

## 给执行者（Kimi）的备注

- 看板视觉遵循「曜石翡翠 · Obsidian Jade」规范（另有 obsidian-jade-design-system 移植包），迭代样式时保持类名/ID 契约不变。
- 修改生成器后先用 `--from-json` 本地重建验证，再考虑数据刷新。
- 业务约定：红涨绿跌不可反转；门店顺序以 Base 的门店顺序为准、福州店最后；大钟率 = (298项目 + 358项目) ÷ 项目总数。
