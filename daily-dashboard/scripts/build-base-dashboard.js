#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { BASE_TOKEN, TABLE_ID, canonicalRecord } = require('./daily-base-schema');
const { compareStoreNames, orderStores } = require('./store-order');

const BASE_DIR = path.resolve(__dirname, '..');
const BASE_URL = 'https://bcnyncmn4dtd.feishu.cn/wiki/T5S4wEKmniyDH5kvl2Mcz3tnnRb?table=tblaQen7S4W8B96T&view=vewqEBgSKP';
const OUT_DIR = path.join(BASE_DIR, 'outputs', 'daily-dashboard');

const NUMBER_FIELDS = [
  '总营业额', '开卡金额', '续充金额', '卡金',
  '抖音访问人数', '抖音-平台', '抖音评分', '抖音扫码',
  '美团访问人数', '美团-平台', '美团评分', '大众评分', '美团经营分',
  '美团扫码', '平均回复时长', '30s回复率', '5min回复率', '新增好评', '新增差评',
  '168项目', '298项目', '358项目', '商品销售数量', '免单',
];

function arg(name, fallback = undefined) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function lark(args) {
  const env = {
    ...process.env,
    PATH: `${BASE_DIR}/tools/feishu-cli/node_modules/.bin:/Applications/Codex.app/Contents/Resources:${process.env.PATH}`,
  };
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const output = execFileSync('lark-cli', ['--as', 'user', ...args], {
        cwd: BASE_DIR, env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30 * 1000,
      });
      return JSON.parse(output);
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

function dateKey(value) {
  if (value == null || value === '') return '';
  return String(value).slice(0, 10);
}

function cleanStore(name) {
  if (!name) return '';
  let s = String(name).trim();
  s = s.replace(/民德搓澡堂/g, '');
  s = s.replace(/（/g, '(').replace(/）/g, ')');
  s = s.replace(/^\((.*)\)$/, '$1').trim();
  const aliases = {
    青岛市北区店: '青岛店',
    萍乡安源店: '萍乡店',
    新余渝水店: '新余店',
    宜春袁州店: '宜春店',
    杭州西溪: '杭州西溪天街店',
  };
  return aliases[s] || s;
}

function num(value) {
  if (value == null || value === '' || value === '-') return 0;
  if (typeof value === 'string') {
    value = value.replace(/,/g, '').replace(/%/g, '').trim();
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function listRecords() {
  const records = [];
  let offset = 0;
  while (true) {
    const res = lark([
      'base', '+record-list',
      '--base-token', BASE_TOKEN,
      '--table-id', TABLE_ID,
      '--limit', '200',
      '--offset', String(offset),
      '--format', 'json',
    ]);
    if (!res.ok) throw new Error(JSON.stringify(res));
    const data = res.data || {};
    const ids = data.record_id_list || [];
    const rows = data.data || [];
    rows.forEach((row, idx) => {
      const obj = canonicalRecord(data, row);
      const normalized = {
        recordId: ids[idx] || '',
        日期: dateKey(obj['日期']),
        门店: cleanStore(obj['门店']),
      };
      for (const field of NUMBER_FIELDS) {
        normalized[field] = num(obj[field]);
      }
      if (normalized.日期 && normalized.门店) records.push(normalized);
    });
    if (!data.has_more || rows.length === 0) break;
    offset += rows.length;
  }
  return records;
}

function loadCachedRecords(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(parsed) ? parsed : parsed.records;
}

function htmlJson(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function buildHtml(records, generatedAt) {
  const dates = [...new Set(records.map((r) => r.日期))].sort();
  const stores = orderStores(new Set(records.map((r) => r.门店)));
  const latestDate = dates[dates.length - 1] || '';
  const payload = { records, dates, stores, latestDate, generatedAt, baseUrl: BASE_URL };

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>民德时代日报看板</title>
  <style>
    /* ============================================================
       曜石翡翠 · Obsidian Jade — 高端经营指挥舱视觉系统
       暗色为主视觉，亮色同样精致；红涨绿跌遵循业务约定
       ============================================================ */
    :root {
      color-scheme: dark;
      --ink: #ecf5ef;
      --muted: #8fa79a;
      --faint: #5f7267;
      --line: rgba(236, 245, 239, .09);
      --line-strong: rgba(236, 245, 239, .20);
      --paper: rgba(14, 22, 17, .58);
      --paper-strong: rgba(17, 27, 21, .88);
      --surface: rgba(255, 255, 255, .035);
      --surface-2: rgba(255, 255, 255, .06);
      --blue: #3ddc9f;
      --cyan: #4adccc;
      --violet: #a9baff;
      --orange: #3ddc9f;
      --gold: #d8b47e;
      --jade: #3ddc9f;
      --mint: rgba(61, 220, 159, .13);
      --grid: rgba(170, 205, 184, .05);
      --chart-grid: rgba(236, 245, 239, .13);
      --glow: rgba(61, 220, 159, .30);
      --ring: rgba(61, 220, 159, .42);
      --halo: rgba(61, 220, 159, .20);
      --halo-glow: rgba(61, 220, 159, .09);
      --up: #f4716f;
      --up-bg: rgba(244, 113, 111, .13);
      --down: #45d194;
      --down-bg: rgba(69, 209, 148, .13);
      --shadow: 0 26px 70px rgba(0, 0, 0, .46);
      --on-accent: #05231a;
      --hero-gradient:
        radial-gradient(54rem 32rem at 10% -12%, rgba(61, 220, 159, .14), transparent 62%),
        radial-gradient(48rem 30rem at 90% -14%, rgba(74, 220, 204, .11), transparent 64%),
        radial-gradient(44rem 28rem at 55% 120%, rgba(216, 180, 126, .09), transparent 66%),
        linear-gradient(180deg, #070c09 0%, #050908 100%);
    }
    body[data-theme="light"] {
      color-scheme: light;
      --ink: #15231b;
      --muted: #687a6f;
      --faint: #94a39a;
      --line: rgba(21, 35, 27, .10);
      --line-strong: rgba(21, 35, 27, .20);
      --paper: rgba(255, 255, 255, .74);
      --paper-strong: rgba(255, 255, 255, .94);
      --surface: rgba(255, 255, 255, .82);
      --surface-2: rgba(21, 35, 27, .05);
      --blue: #0e8a5f;
      --cyan: #0f9a8a;
      --violet: #6f7cc4;
      --orange: #0e8a5f;
      --gold: #a97f45;
      --jade: #0e8a5f;
      --mint: rgba(14, 138, 95, .10);
      --grid: rgba(20, 62, 43, .05);
      --chart-grid: rgba(21, 35, 27, .16);
      --glow: rgba(14, 138, 95, .22);
      --ring: rgba(14, 138, 95, .38);
      --halo: rgba(14, 138, 95, .16);
      --halo-glow: rgba(14, 138, 95, .07);
      --up: #d0443e;
      --up-bg: rgba(208, 68, 62, .10);
      --down: #1e8e5a;
      --down-bg: rgba(30, 142, 90, .10);
      --shadow: 0 20px 54px rgba(34, 62, 46, .13);
      --on-accent: #ffffff;
      --hero-gradient:
        radial-gradient(54rem 32rem at 10% -12%, rgba(14, 138, 95, .10), transparent 62%),
        radial-gradient(48rem 30rem at 90% -14%, rgba(15, 154, 138, .09), transparent 64%),
        radial-gradient(44rem 28rem at 55% 120%, rgba(169, 127, 69, .08), transparent 66%),
        linear-gradient(180deg, #f6f8f4 0%, #eef2ec 100%);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
      font-size: 14px;
      line-height: 1.5;
      font-weight: 400;
      background: var(--hero-gradient);
      background-attachment: fixed;
      overflow-x: hidden;
      transition: background .3s ease, color .3s ease;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    button, input, select, textarea { font-family: inherit; }
    ::selection { background: rgba(61, 220, 159, .30); color: var(--ink); }
    :focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; border-radius: 8px; }
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(143, 167, 154, .30); border-radius: 8px; border: 2px solid transparent; background-clip: content-box; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(143, 167, 154, .48); border: 2px solid transparent; background-clip: content-box; }

    /* 环境层：细网格 + 极光漂移光斑 */
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(var(--grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--grid) 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: radial-gradient(ellipse 92% 64% at 50% 0%, black 26%, transparent 100%);
      -webkit-mask-image: radial-gradient(ellipse 92% 64% at 50% 0%, black 26%, transparent 100%);
    }
    .ambient { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
    .ambient .blob { position: absolute; border-radius: 999px; filter: blur(90px); opacity: .55; will-change: transform; }
    body[data-theme="light"] .ambient .blob { opacity: .38; }
    .blob-a { width: 46rem; height: 46rem; left: -14rem; top: -18rem; background: radial-gradient(circle, rgba(61, 220, 159, .32), transparent 65%); animation: drift 26s ease-in-out infinite alternate; }
    .blob-b { width: 40rem; height: 40rem; right: -12rem; top: -10rem; background: radial-gradient(circle, rgba(74, 220, 204, .26), transparent 65%); animation: drift 32s ease-in-out infinite alternate-reverse; }
    .blob-c { width: 38rem; height: 38rem; left: 34%; bottom: -24rem; background: radial-gradient(circle, rgba(216, 180, 126, .22), transparent 65%); animation: drift 38s ease-in-out infinite alternate; }
    @keyframes drift { from { transform: translate3d(0, 0, 0) scale(1); } to { transform: translate3d(4rem, 2.6rem, 0) scale(1.12); } }

    .shell { position: relative; z-index: 1; width: min(1360px, calc(100vw - 48px)); margin: 0 auto; padding: 36px 0 48px; }

    /* 顶部品牌区 */
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 24px;
      align-items: end;
      margin-bottom: 28px;
      animation: rise .55s cubic-bezier(.22, .9, .3, 1) both;
    }
    .brand-line { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .brand-mark {
      width: 40px; height: 40px; border-radius: 13px;
      display: inline-grid; place-items: center;
      font-size: 18px; font-weight: 700; color: var(--on-accent);
      background: linear-gradient(135deg, var(--blue), var(--cyan));
      box-shadow: 0 10px 26px var(--glow), inset 0 1px 0 rgba(255, 255, 255, .35);
    }
    .eyebrow { color: var(--muted); font-size: 11px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; }
    .live-pill {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 5px 12px; border-radius: 999px;
      border: 1px solid var(--line); background: var(--surface);
      color: var(--muted); font-size: 11px; font-weight: 600; letter-spacing: .06em;
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    }
    .live-pill i { width: 6px; height: 6px; border-radius: 999px; background: var(--blue); box-shadow: 0 0 0 0 rgba(61, 220, 159, .5); animation: pulse 2.4s ease-out infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(61, 220, 159, .45); } 70% { box-shadow: 0 0 0 9px rgba(61, 220, 159, 0); } 100% { box-shadow: 0 0 0 0 rgba(61, 220, 159, 0); } }
    h1 {
      margin: 14px 0 10px;
      font-size: clamp(32px, 3.6vw, 48px);
      line-height: 1.04; font-weight: 700; letter-spacing: -.03em;
      background: linear-gradient(112deg, var(--ink) 42%, var(--blue) 82%, var(--cyan));
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .subtitle { max-width: 640px; color: var(--muted); font-size: 13px; line-height: 1.7; }

    /* 控件 */
    .controls { display: flex; gap: 10px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
    .select-wrap, .button {
      height: 42px;
      display: inline-flex; align-items: center;
      border: 1px solid var(--line); border-radius: 12px;
      background: var(--paper-strong);
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 8px 22px rgba(0, 0, 0, .16), inset 0 1px 0 rgba(255, 255, 255, .06);
      transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease;
    }
    body[data-theme="light"] .select-wrap, body[data-theme="light"] .button { box-shadow: 0 6px 18px rgba(34, 62, 46, .08), inset 0 1px 0 rgba(255, 255, 255, .5); }
    .select-wrap:hover, .button:hover { border-color: var(--line-strong); }
    .select-wrap { padding: 0 12px; }
    select, .date-input {
      border: 0; outline: 0; background: transparent;
      color: var(--ink); font: inherit; font-size: 13px; font-weight: 600;
      min-width: 128px; cursor: pointer;
    }
    select {
      appearance: none; -webkit-appearance: none;
      padding-right: 22px;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%238fa79a' stroke-width='1.6' fill='none' stroke-linecap='round'/></svg>");
      background-repeat: no-repeat; background-position: right 2px center;
    }
    select option { color: #ecf5ef; background: #101a14; }
    body[data-theme="light"] select option { color: #15231b; background: #ffffff; }
    .date-input { min-width: 142px; }
    .custom-range { display: none; gap: 8px; align-items: center; }
    .custom-range.active { display: flex; }
    .custom-range .period-note { margin: 0; }
    .button {
      padding: 0 16px; gap: 8px;
      color: var(--ink); text-decoration: none;
      font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .button:hover { transform: translateY(-2px); border-color: var(--blue); }
    .button.primary {
      background: linear-gradient(135deg, var(--blue), var(--cyan));
      border-color: transparent; color: var(--on-accent);
      box-shadow: 0 12px 30px var(--glow), inset 0 1px 0 rgba(255, 255, 255, .30);
    }
    .button.primary:hover { box-shadow: 0 16px 40px var(--glow), inset 0 1px 0 rgba(255, 255, 255, .30); }
    .theme-toggle { min-width: 106px; justify-content: center; }
    .theme-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--blue); box-shadow: 0 0 12px var(--blue); }

    /* 分组标题 */
    .section-label {
      display: flex; align-items: center; gap: 12px;
      margin: 28px 2px 14px;
      color: var(--muted); font-size: 11px; font-weight: 700; letter-spacing: .20em;
    }
    .section-label em { font-style: normal; color: var(--gold); font-weight: 700; letter-spacing: .10em; }
    .section-label::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--line-strong), transparent); }
    .period-note { margin: 14px 2px 0; color: var(--faint); font-size: 11px; line-height: 1.7; }

    /* 玻璃卡片（整圈翡翠发光描边） */
    .grid { display: grid; gap: 16px; }
    .card {
      position: relative;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 20px;
      box-shadow: var(--shadow), 0 0 0 1px var(--halo), 0 0 26px var(--halo-glow);
      backdrop-filter: blur(18px) saturate(140%);
      -webkit-backdrop-filter: blur(18px) saturate(140%);
      overflow: hidden;
      animation: rise .6s cubic-bezier(.22, .9, .3, 1) backwards;
      transition: transform .24s cubic-bezier(.22, .9, .3, 1), box-shadow .24s ease, border-color .24s ease;
    }
    .card > * { position: relative; }

    /* KPI 指标卡 */
    .kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .secondary-kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .kpi { padding: 18px 18px 16px; min-height: 140px; cursor: pointer; }
    .kpi:hover {
      transform: translateY(-6px) scale(1.025);
      border-color: var(--ring);
      box-shadow: 0 30px 80px rgba(0, 0, 0, .50), 0 0 0 1px var(--ring), 0 0 46px rgba(61, 220, 159, .22);
      z-index: 3;
    }
    body[data-theme="light"] .kpi:hover { box-shadow: 0 24px 60px rgba(34, 62, 46, .20), 0 0 0 1px var(--ring), 0 0 34px rgba(14, 138, 95, .16); }
    .kpi.active { border-color: var(--ring); box-shadow: 0 0 0 3px rgba(61, 220, 159, .16), var(--shadow); }
    .kpis .card:nth-child(1) { animation-delay: .04s; }
    .kpis .card:nth-child(2) { animation-delay: .09s; }
    .kpis .card:nth-child(3) { animation-delay: .14s; }
    .kpis .card:nth-child(4) { animation-delay: .19s; }
    .kpis .card:nth-child(5) { animation-delay: .24s; }
    .kpis .card:nth-child(6) { animation-delay: .29s; }
    .kpis .card:nth-child(7) { animation-delay: .34s; }
    .kpis .card:nth-child(8) { animation-delay: .39s; }
    .secondary-kpis .card:nth-child(1) { animation-delay: .08s; }
    .secondary-kpis .card:nth-child(2) { animation-delay: .13s; }
    .secondary-kpis .card:nth-child(3) { animation-delay: .18s; }
    .secondary-kpis .card:nth-child(4) { animation-delay: .23s; }
    .secondary-kpis .card:nth-child(5) { animation-delay: .28s; }
    .secondary-kpis .card:nth-child(6) { animation-delay: .33s; }
    .secondary-kpis .card:nth-child(7) { animation-delay: .38s; }
    .label { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 11px; font-weight: 700; letter-spacing: .14em; }
    .label::before { content: ""; width: 5px; height: 5px; border-radius: 2px; background: linear-gradient(135deg, var(--blue), var(--cyan)); box-shadow: 0 0 10px var(--glow); }
    .value {
      margin-top: 12px;
      font-size: clamp(24px, 2.2vw, 32px);
      line-height: 1.08; font-weight: 600; letter-spacing: -.02em;
      font-variant-numeric: tabular-nums;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .hint { margin-top: 10px; color: var(--muted); font-size: 11px; line-height: 1.9; }
    .hint .delta-up, .hint .delta-down, .hint .delta-flat {
      display: inline-block; padding: 0 8px; margin: 0 1px;
      border-radius: 999px; font-weight: 600;
    }
    .hint .delta-up { background: var(--up-bg); }
    .hint .delta-down { background: var(--down-bg); }
    .month-compare { display: block; margin-top: 3px; }
    .delta-up { color: var(--up); }
    .delta-down { color: var(--down); }
    .delta-flat { color: var(--muted); }

    /* 面板 */
    .panel-head { display: flex; justify-content: space-between; gap: 14px; align-items: center; padding: 20px 22px 10px; }
    .panel-title { font-size: 17px; font-weight: 700; letter-spacing: -.01em; }
    .panel-sub { color: var(--muted); font-size: 12px; margin-top: 4px; line-height: 1.6; }
    .kpi-trend-panel { margin: 18px 0 4px; scroll-margin-top: 20px; }
    .secondary-kpis + .kpi-trend-panel { margin-top: 18px; }
    .kpi-panel-tools { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    .kpi-trend-layout { display: grid; gap: 14px; padding: 4px 18px 18px; }
    .kpi-trend-section { border: 1px solid var(--line); border-radius: 16px; background: var(--surface); overflow: hidden; }
    .kpi-trend-section .panel-sub { padding: 16px 20px 0; }
    .metric-summary { padding: 2px 20px 12px; color: var(--muted); font-size: 12px; line-height: 1.7; }

    /* 门店横向对比 */
    .metric-compare-list { padding: 0 14px 14px; display: grid; gap: 8px; overflow-x: auto; }
    .metric-compare-row {
      display: grid;
      grid-template-columns: 42px minmax(150px, 1fr) minmax(120px, .5fr) minmax(88px, .4fr) minmax(136px, .55fr) minmax(136px, .55fr) minmax(180px, .8fr);
      gap: 12px; align-items: center;
      min-width: 900px;
      padding: 11px 14px;
      border: 1px solid var(--line); border-radius: 14px;
      background: var(--surface);
      color: var(--ink); text-decoration: none; cursor: pointer;
      transition: transform .18s ease, border-color .18s ease, background .18s ease;
    }
    .metric-compare-row.header { cursor: default; background: transparent; border-color: transparent; padding: 0 14px 2px; color: var(--faint); font-size: 11px; font-weight: 600; letter-spacing: .06em; }
    .metric-compare-row:not(.header):hover { border-color: var(--blue); transform: translateY(-1px); }
    .metric-compare-store { font-weight: 600; }
    .metric-compare-value { font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
    .metric-compare-muted { color: var(--muted); font-size: 11px; text-align: right; font-variant-numeric: tabular-nums; }
    .metric-bar { position: relative; height: 8px; border-radius: 999px; background: var(--surface-2); }
    .metric-bar-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--blue), var(--cyan)); box-shadow: 0 0 14px var(--glow); }
    .metric-median-marker { position: absolute; top: -4px; width: 2px; height: 16px; border-radius: 2px; background: var(--gold); box-shadow: 0 0 0 2px var(--paper-strong); transform: translateX(-1px); }
    .rank { width: 24px; height: 24px; border-radius: 8px; display: inline-grid; place-items: center; background: var(--mint); color: var(--jade); font-size: 11px; font-weight: 700; }
    .metric-compare-list > .metric-compare-row:nth-child(-n+4):not(.header) .rank { background: linear-gradient(135deg, var(--blue), var(--cyan)); color: var(--on-accent); box-shadow: 0 4px 14px var(--glow); }

    /* 趋势图 */
    .chart { position: relative; padding: 8px 16px 18px; }
    svg { display: block; width: 100%; height: auto; }
    .trend text, .donut text { fill: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
    .trend { animation: trendReveal .45s ease-out both; }
    .trend-line { animation: trendLineReveal .6s ease-out both; }
    .trend-area { opacity: .12; animation: trendAreaReveal .6s ease-out both; }
    .trend-dot { pointer-events: none; transform-box: fill-box; transform-origin: center; animation: trendPoint .3s .2s ease-out both; }
    .trend-hit { cursor: crosshair; pointer-events: all; }
    .chart-tooltip {
      position: fixed; z-index: 30; pointer-events: none;
      transform: translate(14px, -18px);
      padding: 9px 12px; border-radius: 12px;
      background: var(--paper-strong);
      border: 1px solid var(--line-strong);
      box-shadow: var(--shadow);
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      color: var(--ink); font-size: 12px; font-weight: 600; line-height: 1.55;
      opacity: 0; transition: opacity .12s ease; white-space: nowrap;
    }
    .chart-tooltip.active { opacity: 1; }

    /* 明细表 */
    .table-wrap { padding: 0 16px 16px; overflow-x: auto; }
    .table-scroll-top { margin: 0 16px; height: 14px; overflow-x: auto; overflow-y: hidden; }
    .table-scroll-top .scroll-spacer { height: 1px; }
    table { width: 100%; border-collapse: separate; border-spacing: 0 8px; min-width: 2200px; }
    th {
      position: sticky; top: 0; z-index: 5;
      background: var(--paper-strong);
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      color: var(--faint); font-size: 11px; font-weight: 600; letter-spacing: .05em;
      text-align: right; padding: 10px 12px; white-space: nowrap;
      box-shadow: 0 1px 0 var(--line);
    }
    th:first-child { text-align: left; }
    td {
      background: var(--surface);
      padding: 12px; text-align: right;
      border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
      white-space: nowrap; font-size: 12px; font-variant-numeric: tabular-nums;
    }
    td:first-child { text-align: left; border-left: 1px solid var(--line); border-radius: 12px 0 0 12px; }
    td:last-child { border-right: 1px solid var(--line); border-radius: 0 12px 12px 0; }
    td.alert-cell { color: #ffffff; background: linear-gradient(135deg, #c0453e, #e0695f); border-color: rgba(224, 105, 95, .5); }
    td.warn-cell { background: rgba(216, 180, 126, .14); border-color: rgba(216, 180, 126, .35); }
    tr[data-store] { cursor: pointer; }
    tr[data-store]:hover td { background: var(--surface-2); }

    /* 单店详情 */
    .detail { display: none; }
    .detail.active { display: grid; }
    .overview.hidden { display: none; }
    .store-hero { grid-template-columns: minmax(0, 1fr); align-items: start; padding: 24px; gap: 18px; }
    .store-title { margin-top: 10px; font-size: clamp(26px, 2.6vw, 34px); line-height: 1.1; font-weight: 400; letter-spacing: -.02em; }
    .pills { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
    .metric-group { padding: 14px; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); transition: transform .22s ease, border-color .22s ease; }
    .metric-group:hover { transform: translateY(-2px); border-color: var(--line-strong); }
    .metric-group-title { margin-bottom: 10px; color: var(--faint); font-size: 11px; font-weight: 700; letter-spacing: .12em; }
    .metric-group-items { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
    .pill {
      border: 1px solid var(--line); background: var(--surface-2);
      border-radius: 999px; padding: 7px 12px;
      font: inherit; font-size: 11px; color: var(--muted); cursor: pointer;
      transition: transform .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
    }
    .pill-label { color: var(--ink); font-weight: 600; }
    .pill-detail { font-weight: 400; font-variant-numeric: tabular-nums; }
    .rank-top { color: var(--up); }
    .rank-bottom { color: var(--down); }
    .pill:hover { transform: translateY(-1px); border-color: var(--blue); color: var(--ink); }
    .pill.active { background: var(--mint); border-color: var(--blue); color: var(--jade); }
    #detailMetricTrendPanel { scroll-margin-top: 20px; }

    .footer {
      margin-top: 28px; padding-top: 16px;
      border-top: 1px solid var(--line);
      color: var(--faint); font-size: 11px;
      display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    }

    /* 动画 */
    @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes trendReveal { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes trendLineReveal { from { opacity: .15; } to { opacity: 1; } }
    @keyframes trendAreaReveal { from { opacity: 0; } to { opacity: .12; } }
    @keyframes trendPoint { from { transform: scale(.35); } to { transform: scale(1); } }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
      .ambient .blob { animation: none; }
    }

    /* 响应式 */
    @media (max-width: 1080px) {
      .hero, .store-hero { grid-template-columns: 1fr; }
      .controls { justify-content: flex-start; }
      .kpis, .secondary-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 620px) {
      .shell { width: min(100vw - 28px, 1360px); padding-top: 22px; }
      .kpis, .secondary-kpis { grid-template-columns: 1fr; }
      .pills { grid-template-columns: 1fr; }
      .card { border-radius: 18px; }
      h1 { font-size: 30px; }
      .value { font-size: 26px; }
      .controls { gap: 8px; }
      .theme-toggle { min-width: auto; }
    }
  </style>

</head>
<body>
  <div class="ambient" aria-hidden="true"><i class="blob blob-a"></i><i class="blob blob-b"></i><i class="blob blob-c"></i></div>
  <main class="shell">
    <section class="hero">
      <div class="hero-copy">
        <div class="brand-line">
          <span class="brand-mark">民</span>
          <span class="eyebrow">民德时代 · 经营日报</span>
          <span class="live-pill"><i></i>数据已同步</span>
        </div>
        <h1>日报经营看板</h1>
        <div class="subtitle">核心结果、门店表现与需要跟进的问题，一屏尽览。点击任意指标卡，查看门店横向对比与当月趋势。</div>
      </div>
      <div class="controls">
        <button class="button theme-toggle" id="themeToggle" type="button" aria-label="切换暗黑模式"><span class="theme-dot"></span><span id="themeText">暗黑</span></button>
        <div class="select-wrap"><select id="periodSelect" aria-label="选择时间颗粒度">
          <option value="day">按日</option>
          <option value="week">按周</option>
          <option value="month">按月</option>
          <option value="quarter">按季度</option>
          <option value="year">按年</option>
          <option value="custom">自定义</option>
        </select></div>
        <div class="select-wrap"><select id="dateSelect" aria-label="选择截止日期"></select></div>
        <div class="select-wrap" id="overviewStorePicker"><select id="overviewStoreSelect" aria-label="选择门店"><option value="">选择门店</option></select></div>
        <div class="select-wrap" id="detailStorePicker" style="display:none"><select id="detailStoreSelect" aria-label="切换门店"></select></div>
        <div class="custom-range" id="customRange">
          <div class="select-wrap"><input class="date-input" id="startDate" type="date" aria-label="开始日期"></div>
          <span class="period-note">至</span>
          <div class="select-wrap"><input class="date-input" id="endDate" type="date" aria-label="结束日期"></div>
        </div>
        <a class="button" id="backButton" href="#">回到周期总览</a>
        <a class="button primary" href="${BASE_URL}" target="_blank" rel="noreferrer">打开多维表格</a>
      </div>
    </section>

    <section id="overview" class="overview">
      <div class="section-label"><em>01</em>核心结果</div>
      <div class="grid kpis" id="kpis"></div>
      <div class="period-note" id="periodNote"></div>
      <div class="section-label"><em>02</em>运营指标</div>
      <div class="grid secondary-kpis" id="secondaryKpis"></div>
      <section class="card kpi-trend-panel" id="kpiTrendPanel" style="display:none">
        <div class="panel-head">
          <div><div class="panel-title" id="kpiTrendTitle"></div><div class="panel-sub">点击顶部数据卡片后，同时查看门店横向比较和该指标当月变化</div></div>
          <div class="kpi-panel-tools">
            <div class="select-wrap"><select id="kpiComparePeriod" aria-label="指标对比周期">
              <option value="day">按日</option>
              <option value="week">按周</option>
              <option value="month">按月</option>
            </select></div>
            <button class="button" id="kpiTrendClose">关闭</button>
          </div>
        </div>
        <div class="kpi-trend-layout">
          <div class="kpi-trend-section">
            <div class="panel-sub">该指标当月趋势变化</div>
            <div class="metric-summary" id="kpiMonthTrendSummary"></div>
            <div class="chart" id="kpiMonthTrendChart"></div>
          </div>
          <div class="kpi-trend-section">
            <div class="panel-sub">门店横向对比</div>
            <div class="metric-summary" id="kpiTrendSummary"></div>
            <div id="kpiTrendChart"></div>
          </div>
        </div>
      </section>
    </section>

    <section id="detail" class="detail grid">
      <section class="card store-hero grid">
        <div>
          <div class="eyebrow">单店指标</div>
          <div class="store-title" id="detailTitle"></div>
          <div class="pills" id="detailPills"></div>
        </div>
      </section>
      <section class="card" id="detailMetricTrendPanel" style="display:none">
        <div class="panel-head">
          <div>
            <div class="panel-title" id="detailMetricTrendTitle"></div>
            <div class="panel-sub" id="detailMetricTrendSummary"></div>
          </div>
          <button class="button" id="detailMetricTrendClose" type="button">关闭</button>
        </div>
        <div class="chart" id="detailMetricTrendChart"></div>
      </section>
      <section class="card">
        <div class="panel-head">
          <div>
            <div class="panel-title">每日明细</div>
            <div class="panel-sub">展示所选周期内的门店经营数据</div>
          </div>
        </div>
        <div class="table-scroll-top" id="historyScrollTop"><div class="scroll-spacer"></div></div>
        <div class="table-wrap" id="historyTableWrap"><table id="historyTable"></table></div>
      </section>
    </section>

    <div class="footer">
      <span>生成时间：${generatedAt}</span>
      <span>数据源：飞书多维表格 / 数据表</span>
    </div>
  </main>
  <script id="dashboardData" type="application/json">${htmlJson(payload)}</script>
  <script>
    const state = JSON.parse(document.getElementById('dashboardData').textContent);
    const money = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
    const one = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 });
    const pct = new Intl.NumberFormat('zh-CN', { style: 'percent', maximumFractionDigits: 1 });
    const dateSelect = document.getElementById('dateSelect');
    const periodSelect = document.getElementById('periodSelect');
    const customRange = document.getElementById('customRange');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const overviewStorePicker = document.getElementById('overviewStorePicker');
    const overviewStoreSelect = document.getElementById('overviewStoreSelect');
    const detailStorePicker = document.getElementById('detailStorePicker');
    const detailStoreSelect = document.getElementById('detailStoreSelect');
    const overview = document.getElementById('overview');
    const detail = document.getElementById('detail');
    const backButton = document.getElementById('backButton');
    const themeToggle = document.getElementById('themeToggle');
    const themeText = document.getElementById('themeText');

    function applyTheme(theme) {
      const resolved = theme === 'dark' ? 'dark' : 'light';
      document.body.dataset.theme = resolved;
      themeText.textContent = resolved === 'dark' ? '亮色' : '暗黑';
      themeToggle.setAttribute('aria-pressed', resolved === 'dark' ? 'true' : 'false');
      localStorage.setItem('lifeDataDashboardTheme', resolved);
    }

    applyTheme(localStorage.getItem('lifeDataDashboardTheme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    themeToggle.addEventListener('click', () => {
      applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
    });

    function value(row, field) { return Number((row && row[field]) || 0); }
    function byDate(date) { return state.records.filter((r) => r['日期'] === date); }
    function byStore(store) { return state.records.filter((r) => r['门店'] === store).sort((a, b) => a['日期'].localeCompare(b['日期'])); }
    function compareStoreNames(left, right) {
      const leftIndex = state.stores.indexOf(left);
      const rightIndex = state.stores.indexOf(right);
      if (leftIndex >= 0 || rightIndex >= 0) return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
      return String(left).localeCompare(String(right), 'zh-Hans-CN');
    }
    function sum(rows, field) { return rows.reduce((acc, row) => acc + value(row, field), 0); }
    function avg(rows, field) {
      const vals = rows.map((r) => value(r, field)).filter((v) => v > 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    function esc(text) {
      return String(text == null ? '' : text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }
    function currentHash() {
      const params = new URLSearchParams(location.hash.replace(/^#/, ''));
      return {
        date: params.get('date') || state.latestDate,
        store: params.get('store') || '',
        period: params.get('period') || 'day',
        start: params.get('start') || '',
        end: params.get('end') || ''
      };
    }
    function setHash(date, store, period, start, end) {
      const current = currentHash();
      const params = new URLSearchParams();
      params.set('date', date);
      params.set('period', period || current.period || 'day');
      if (store) params.set('store', store);
      if ((period || current.period) === 'custom') {
        if (start || current.start) params.set('start', start || current.start);
        if (end || current.end) params.set('end', end || current.end);
      }
      location.hash = params.toString();
    }
    function normalizeInitialHash() {
      if (!location.hash) {
        setHash(state.latestDate, '');
        return;
      }
      const h = currentHash();
      const staleOverviewDate = h.date && h.date !== state.latestDate && !h.store && h.period !== 'custom' && !h.start && !h.end;
      if (staleOverviewDate) setHash(state.latestDate, '', h.period);
    }
    function updateDateOptions(select, period, dates, selectedDate) {
      if (period === 'month') {
        const months = [...new Set(dates.map((date) => date.slice(0, 7)))].sort().reverse();
        select.innerHTML = months.map((month) => {
          const monthDates = dates.filter((date) => date.startsWith(month));
          const value = monthDates[monthDates.length - 1];
          const label = month.slice(0, 4) + '年' + month.slice(5) + '月';
          return '<option value="' + value + '">' + label + '</option>';
        }).join('');
        const selectedMonth = selectedDate.slice(0, 7);
        const selectedMonthDates = dates.filter((date) => date.startsWith(selectedMonth));
        select.value = selectedMonthDates[selectedMonthDates.length - 1] || select.options[0]?.value || '';
        return;
      }
      select.innerHTML = dates.slice().reverse().map((date) => '<option value="' + date + '">' + date + '</option>').join('');
      select.value = selectedDate;
    }
    function initDates() {
      overviewStoreSelect.innerHTML = '<option value="">选择门店</option>' + state.stores.map((store) => '<option value="' + esc(store) + '">' + esc(store) + '</option>').join('');
      overviewStoreSelect.addEventListener('change', () => {
        if (!overviewStoreSelect.value) return;
        const h = currentHash();
        setHash(dateSelect.value || h.date, overviewStoreSelect.value, h.period, h.start, h.end);
      });
      detailStoreSelect.innerHTML = state.stores.map((store) => '<option value="' + esc(store) + '">' + esc(store) + '</option>').join('');
      detailStoreSelect.addEventListener('change', () => {
        if (!detailStoreSelect.value) return;
        const h = currentHash();
        setHash(h.date, detailStoreSelect.value, h.period, h.start, h.end);
      });
      backButton.addEventListener('click', (event) => {
        event.preventDefault();
        const h = currentHash();
        const range = periodRange(h.date, h.period, h.start, h.end);
        setHash(h.date, '', h.period, range.start, range.end);
      });
      dateSelect.addEventListener('change', () => {
        const h = currentHash();
        setHash(dateSelect.value, h.store, h.period, h.start, h.end);
      });
      periodSelect.addEventListener('change', () => {
        const h = currentHash();
        const period = periodSelect.value;
        if (period === 'custom') {
          const defaults = periodRange(h.date, 'month');
          startDateInput.value = h.start || defaults.start;
          endDateInput.value = h.end || h.date;
          setHash(h.date, h.store, period, startDateInput.value, endDateInput.value);
        } else {
          const periodDate = period === 'month'
            ? state.dates.filter((date) => date.startsWith(h.date.slice(0, 7))).slice(-1)[0] || h.date
            : h.date;
          setHash(periodDate, h.store, period);
        }
      });
      const updateCustomRange = () => {
        if (!startDateInput.value || !endDateInput.value) return;
        const start = startDateInput.value <= endDateInput.value ? startDateInput.value : endDateInput.value;
        const end = startDateInput.value <= endDateInput.value ? endDateInput.value : startDateInput.value;
        setHash(end, currentHash().store, 'custom', start, end);
      };
      startDateInput.addEventListener('change', updateCustomRange);
      endDateInput.addEventListener('change', updateCustomRange);
      startDateInput.min = state.dates[0] || '';
      startDateInput.max = state.latestDate;
      endDateInput.min = state.dates[0] || '';
      endDateInput.max = state.latestDate;
      backButton.addEventListener('click', (event) => {
        event.preventDefault();
        const h = currentHash();
        setHash(dateSelect.value, '', h.period, h.start, h.end);
      });
    }
    function kpi(label, valueText, hint, metric) {
      const attr = metric ? ' data-kpi="' + metric + '"' : '';
      return '<article class="card kpi"' + attr + '><div class="label">' + label + '</div><div class="value">' + valueText + '</div><div class="hint">' + hint + '</div></article>';
    }
    function previousDate(date) {
      const idx = state.dates.indexOf(date);
      return idx > 0 ? state.dates[idx - 1] : '';
    }
    function dateStr(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    }
    function monthRange(date, offsetMonths = 0) {
      const selected = new Date(date + 'T00:00:00');
      const year = selected.getFullYear();
      const month = selected.getMonth() + offsetMonths;
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      end.setDate(Math.min(selected.getDate(), end.getDate()));
      return { start: dateStr(start), end: dateStr(end) };
    }
    function rowsInRange(start, end) {
      return state.records.filter((row) => row['日期'] >= start && row['日期'] <= end);
    }
    function addDays(dateText, days) {
      const date = new Date(dateText + 'T12:00:00');
      date.setDate(date.getDate() + days);
      return dateStr(date);
    }
    function daysBetween(start, end) {
      return Math.round((new Date(end + 'T12:00:00') - new Date(start + 'T12:00:00')) / 86400000) + 1;
    }
    function shiftMonths(dateText, months) {
      const source = new Date(dateText + 'T12:00:00');
      const target = new Date(source.getFullYear(), source.getMonth() + months, 1, 12);
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      target.setDate(Math.min(source.getDate(), lastDay));
      return dateStr(target);
    }
    function shiftYears(dateText, years) {
      const source = new Date(dateText + 'T12:00:00');
      const target = new Date(source.getFullYear() + years, source.getMonth(), 1, 12);
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      target.setDate(Math.min(source.getDate(), lastDay));
      return dateStr(target);
    }
    function periodRange(date, period, customStart, customEnd) {
      const selected = new Date(date + 'T12:00:00');
      let start = date;
      let end = date;
      if (period === 'week') {
        const day = selected.getDay() || 7;
        start = addDays(date, 1 - day);
      } else if (period === 'month') {
        start = date.slice(0, 7) + '-01';
      } else if (period === 'quarter') {
        const quarterMonth = Math.floor(selected.getMonth() / 3) * 3;
        start = dateStr(new Date(selected.getFullYear(), quarterMonth, 1));
      } else if (period === 'year') {
        start = selected.getFullYear() + '-01-01';
      } else if (period === 'custom') {
        start = customStart || date;
        end = customEnd || date;
        if (start > end) [start, end] = [end, start];
      }
      const days = daysBetween(start, end);
      let previousStart = addDays(start, -days);
      let previousEnd = addDays(start, -1);
      if (period === 'day') {
        previousStart = previousEnd = addDays(date, -1);
      } else if (period === 'week') {
        previousStart = addDays(start, -7);
        previousEnd = addDays(end, -7);
      } else if (period === 'month') {
        previousStart = shiftMonths(start, -1);
        previousEnd = shiftMonths(end, -1);
      } else if (period === 'quarter') {
        previousStart = shiftMonths(start, -3);
        previousEnd = shiftMonths(end, -3);
      } else if (period === 'year') {
        previousStart = shiftYears(start, -1);
        previousEnd = shiftYears(end, -1);
      }
      return {
        start,
        end,
        days,
        previousStart,
        previousEnd
      };
    }
    function periodLabel(period, range) {
      const names = { day: '日', week: '周', month: '月', quarter: '季度', year: '年', custom: '自定义' };
      return '按' + names[period] + ' · ' + range.start + (range.start === range.end ? '' : ' 至 ' + range.end);
    }
    function comparisonLabel(period) {
      return { day: '昨日', week: '上周同期', month: '上月同期', quarter: '上季度同期', year: '去年同期', custom: '前一等长周期' }[period];
    }
    function median(values) {
      const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
      if (!sorted.length) return 0;
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    function aggregateStore(store, range) {
      const rows = state.records.filter((row) => row['门店'] === store && row['日期'] >= range.start && row['日期'] <= range.end);
      if (!rows.length) return null;
      const result = { '门店': store, '日期': range.end, _aggregate: true, _rows: rows };
      const sumFields = [
        '总营业额','开卡金额','续充金额','卡金','抖音访问人数','抖音-平台','抖音扫码',
        '美团访问人数','美团-平台','美团扫码','新增好评','新增差评','168项目','298项目',
        '358项目','商品销售数量','免单'
      ];
      const averageFields = ['抖音评分','美团评分','大众评分','美团经营分','平均回复时长','30s回复率','5min回复率'];
      sumFields.forEach((field) => { result[field] = sum(rows, field); });
      averageFields.forEach((field) => { result[field] = avg(rows, field); });
      result._days = new Set(rows.map((row) => row['日期'])).size;
      return result;
    }
    function deltaText(current, previous, format = (v) => money.format(v)) {
      if (!previous && previous !== 0) return '-';
      const diff = current - previous;
      const sign = diff > 0 ? '+' : '';
      const pctText = previous ? ' / ' + sign + one.format(diff / previous * 100) + '%' : '';
      const className = diff > 0 ? 'delta-up' : diff < 0 ? 'delta-down' : 'delta-flat';
      return '<span class="' + className + '">' + sign + format(diff) + pctText + '</span>';
    }
    function deltaHint(current, previous, format = (v) => money.format(v)) {
      return '较昨日 ' + deltaText(current, previous, format);
    }
    function mtdHint(currentRows, previousRows, calc, format = (v) => money.format(v)) {
      const current = currentRows.reduce((acc, row) => acc + calc(row), 0);
      const previous = previousRows.reduce((acc, row) => acc + calc(row), 0);
      return '本月累计 ' + format(current) + ' / 较上月同期 ' + deltaText(current, previous, format);
    }
    function moneyDelta(v) {
      return (v < 0 ? '-¥' : '¥') + money.format(Math.abs(v));
    }
    function ratio(part, total) {
      return total ? pct.format(part / total) : '0%';
    }
    function salesMixForRows(rows) {
      const revenue = Math.max(0, sum(rows, '总营业额'));
      const douyin = Math.max(0, sum(rows, '抖音-平台'));
      const meituan = Math.max(0, sum(rows, '美团-平台'));
      const platformTotal = douyin + meituan;
      const adjusted = platformTotal > revenue;
      const other = adjusted ? 0 : Math.max(0, revenue - platformTotal);
      const base = adjusted ? platformTotal : revenue;
      return {
        douyin: base ? douyin / base : 0,
        meituan: base ? meituan / base : 0,
        other: base ? other / base : 0,
        adjusted,
      };
    }
    function metricValue(row, metric) {
      if (metric === '项目数') return value(row, '168项目') + value(row, '298项目') + value(row, '358项目');
      if (metric === '大钟率') {
        const total = value(row, '168项目') + value(row, '298项目') + value(row, '358项目');
        return total ? (value(row, '298项目') + value(row, '358项目')) / total : 0;
      }
      if (metric === '扫码合计') return value(row, '抖音扫码') + value(row, '美团扫码');
      return value(row, metric);
    }
    function aggregateMetricForRows(rows, metric) {
      if (!rows.length) return 0;
      if (metric === '大钟率') {
        const total = sum(rows, '168项目') + sum(rows, '298项目') + sum(rows, '358项目');
        return total ? (sum(rows, '298项目') + sum(rows, '358项目')) / total : 0;
      }
      if (nonAdditiveMetric(metric)) return avg(rows, metric);
      return rows.reduce((acc, row) => acc + metricValue(row, metric), 0);
    }
    function metricMonthTrendRows(metric, selectedDate) {
      const monthStart = selectedDate.slice(0, 7) + '-01';
      return state.dates
        .filter((date) => date >= monthStart && date <= selectedDate)
        .map((date) => {
          const rows = byDate(date);
          return { '日期': date, [metric]: aggregateMetricForRows(rows, metric) };
        });
    }
    function renderOverview(date, period, customStart, customEnd) {
      const range = periodRange(date, period, customStart, customEnd);
      const rows = state.stores.map((store) => aggregateStore(store, range)).filter(Boolean)
        .sort((a, b) => value(b, '总营业额') - value(a, '总营业额'));
      const previousRange = { start: range.previousStart, end: range.previousEnd };
      const prevRows = state.stores.map((store) => aggregateStore(store, previousRange)).filter(Boolean);
      const lastMonthRange = { start: shiftMonths(range.start, -1), end: shiftMonths(range.end, -1) };
      const lastMonthRows = state.stores.map((store) => aggregateStore(store, lastMonthRange)).filter(Boolean);
      const revenue = sum(rows, '总营业额');
      const prevRevenue = sum(prevRows, '总营业额');
      const douyin = sum(rows, '抖音-平台');
      const prevDouyin = sum(prevRows, '抖音-平台');
      const meituan = sum(rows, '美团-平台');
      const prevMeituan = sum(prevRows, '美团-平台');
      const channelTotal = Math.max(0, douyin + meituan);
      const visits = sum(rows, '抖音访问人数') + sum(rows, '美团访问人数');
      const prevVisits = sum(prevRows, '抖音访问人数') + sum(prevRows, '美团访问人数');
      const scans = sum(rows, '抖音扫码') + sum(rows, '美团扫码');
      const prevScans = sum(prevRows, '抖音扫码') + sum(prevRows, '美团扫码');
      const good = sum(rows, '新增好评');
      const prevGood = sum(prevRows, '新增好评');
      const bad = sum(rows, '新增差评');
      const prevBad = sum(prevRows, '新增差评');
      const dyVisits = sum(rows, '抖音访问人数');
      const prevDyVisits = sum(prevRows, '抖音访问人数');
      const mtVisits = sum(rows, '美团访问人数');
      const prevMtVisits = sum(prevRows, '美团访问人数');
      const projects = rows.reduce((acc, row) => acc + metricValue(row, '项目数'), 0);
      const prevProjects = prevRows.reduce((acc, row) => acc + metricValue(row, '项目数'), 0);
      const bigClockRate = projects ? (sum(rows, '298项目') + sum(rows, '358项目')) / projects : 0;
      const prevBigClockTotal = prevProjects;
      const prevBigClockRate = prevBigClockTotal ? (sum(prevRows, '298项目') + sum(prevRows, '358项目')) / prevBigClockTotal : 0;
      const productSales = sum(rows, '商品销售数量');
      const prevProductSales = sum(prevRows, '商品销售数量');
      const freeOrders = sum(rows, '免单');
      const prevFreeOrders = sum(prevRows, '免单');
      const avgReply = avg(rows, '平均回复时长');
      const prevAvgReply = avg(prevRows, '平均回复时长');
      const lastMonth = {
        revenue: sum(lastMonthRows, '总营业额'),
        openCard: sum(lastMonthRows, '开卡金额'),
        douyin: sum(lastMonthRows, '抖音-平台'),
        meituan: sum(lastMonthRows, '美团-平台'),
        dyVisits: sum(lastMonthRows, '抖音访问人数'),
        mtVisits: sum(lastMonthRows, '美团访问人数'),
        good: sum(lastMonthRows, '新增好评'),
        bad: sum(lastMonthRows, '新增差评'),
        scans: sum(lastMonthRows, '抖音扫码') + sum(lastMonthRows, '美团扫码'),
        projects: lastMonthRows.reduce((acc, row) => acc + metricValue(row, '项目数'), 0),
        productSales: sum(lastMonthRows, '商品销售数量'),
        freeOrders: sum(lastMonthRows, '免单'),
        avgReply: avg(lastMonthRows, '平均回复时长')
      };
      lastMonth.bigClockRate = lastMonth.projects
        ? (sum(lastMonthRows, '298项目') + sum(lastMonthRows, '358项目')) / lastMonth.projects
        : 0;
      const compareLabel = range.previousStart + ' 至 ' + range.previousEnd;
      const coverageDays = new Set(rows.flatMap((row) => row._rows.map((item) => item['日期']))).size;
      const compareName = comparisonLabel(period);
      const compareHint = (current, previous, formatter = (v) => money.format(v)) =>
        '较' + compareName + ' ' + deltaText(current, previous, formatter);
      const comparisonHint = (current, previous, lastMonthValue, formatter = (v) => money.format(v)) =>
        compareHint(current, previous, formatter) +
        '<span class="month-compare">较上月同期 ' + deltaText(current, lastMonthValue, formatter) + '</span>';
      const kpiCards = [
        kpi('总营业额', '¥' + money.format(revenue), comparisonHint(revenue, prevRevenue, lastMonth.revenue, moneyDelta) + ' / ' + rows.length + ' 家门店', '总营业额'),
        kpi('开卡金额', '¥' + money.format(sum(rows, '开卡金额')), comparisonHint(sum(rows, '开卡金额'), sum(prevRows, '开卡金额'), lastMonth.openCard, moneyDelta) + ' / 续充 ¥' + money.format(sum(rows, '续充金额')), '开卡金额'),
        kpi('抖音-平台', '¥' + money.format(douyin), '占核销 ' + ratio(douyin, channelTotal) + ' / ' + comparisonHint(douyin, prevDouyin, lastMonth.douyin, moneyDelta), '抖音-平台'),
        kpi('美团-平台', '¥' + money.format(meituan), '占核销 ' + ratio(meituan, channelTotal) + ' / ' + comparisonHint(meituan, prevMeituan, lastMonth.meituan, moneyDelta), '美团-平台'),
        kpi('抖音访问', money.format(dyVisits), comparisonHint(dyVisits, prevDyVisits, lastMonth.dyVisits), '抖音访问人数'),
        kpi('美团访问', money.format(mtVisits), comparisonHint(mtVisits, prevMtVisits, lastMonth.mtVisits), '美团访问人数'),
        kpi('大钟率', pct.format(bigClockRate), '(298 + 358) ÷ 项目总数 / ' + comparisonHint(bigClockRate, prevBigClockRate, lastMonth.bigClockRate, (v) => one.format(v * 100) + '个百分点'), '大钟率'),
        kpi('新增好评', '+' + money.format(good), comparisonHint(good, prevGood, lastMonth.good), '新增好评'),
        kpi('新增差评', money.format(bad), comparisonHint(bad, prevBad, lastMonth.bad), '新增差评'),
        kpi('扫码合计', money.format(scans), comparisonHint(scans, prevScans, lastMonth.scans) + ' / 访问 ' + money.format(visits) + '（访问较' + compareName + ' ' + deltaText(visits, prevVisits) + '）', '扫码合计'),
        kpi('平均回复时长', one.format(avgReply) + 's', comparisonHint(avgReply, prevAvgReply, lastMonth.avgReply, (v) => one.format(v) + 's'), '平均回复时长'),
        kpi('项目数', money.format(projects), '168项目 ' + money.format(sum(rows, '168项目')) + ' / 298项目 ' + money.format(sum(rows, '298项目')) + ' / 358项目 ' + money.format(sum(rows, '358项目')) + ' / ' + comparisonHint(projects, prevProjects, lastMonth.projects), '项目数'),
        kpi('商品销售数量', money.format(productSales), comparisonHint(productSales, prevProductSales, lastMonth.productSales), '商品销售数量'),
        kpi('免单', money.format(freeOrders), comparisonHint(freeOrders, prevFreeOrders, lastMonth.freeOrders), '免单'),
      ];
      document.getElementById('kpis').innerHTML = kpiCards.slice(0, 6).concat(kpiCards.slice(7, 9)).join('');
      document.getElementById('secondaryKpis').innerHTML = [kpiCards[6], ...kpiCards.slice(9)].join('');
      document.getElementById('periodNote').textContent = periodLabel(period, range) + '；实际覆盖 ' + coverageDays +
        ' 个经营日；对比期 ' + compareLabel + '；上月同期 ' + lastMonthRange.start + ' 至 ' + lastMonthRange.end + '。季度、年度若历史数据不足，增长项按中性分处理。';
      let activeKpi = null;
      const panel = document.getElementById('kpiTrendPanel');
      panel.style.display = 'none';
      document.getElementById('secondaryKpis').after(panel);
      const title = document.getElementById('kpiTrendTitle');
      const comparePeriodSelect = document.getElementById('kpiComparePeriod');
      const defaultComparePeriod = ['day','week','month'].includes(period) ? period : 'month';
      comparePeriodSelect.value = defaultComparePeriod;
      document.querySelectorAll('.kpi[data-kpi]').forEach(card => {
        card.addEventListener('click', () => {
          const metric = card.getAttribute('data-kpi');
          if (activeKpi === metric) {
            activeKpi = null;
            document.querySelectorAll('.kpi').forEach(c => c.classList.remove('active'));
            panel.style.display = 'none';
          } else {
            activeKpi = metric;
            document.querySelectorAll('.kpi').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            card.parentElement.after(panel);
            panel.style.display = 'block';
            title.textContent = metric + ' · 门店横向对比';
            renderKpiTrend(metric, date, comparePeriodSelect.value, range);
            panel.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });
      comparePeriodSelect.onchange = () => {
        if (!activeKpi) return;
        renderKpiTrend(activeKpi, date, comparePeriodSelect.value, range);
      };
      document.getElementById('kpiTrendClose').addEventListener('click', () => {
        activeKpi = null;
        document.querySelectorAll('.kpi').forEach(c => c.classList.remove('active'));
        panel.style.display = 'none';
      });
    }
    function metricFormatter(metric) {
      if (metric.includes('营业额') || metric.includes('核销') || metric.includes('开卡') || metric.includes('卡金') || metric.includes('续充')) {
        return (v) => '¥' + money.format(v);
      }
      if (metric === '平均回复时长') return (v) => one.format(v) + 's';
      if (metric === '大钟率' || metric === '销售占比') return (v) => pct.format(v);
      if (metric === '30s回复率' || metric === '5min回复率') return (v) => pct.format(v);
      return (v) => money.format(v);
    }
    function lowerIsBetter(metric) {
      return metric === '新增差评';
    }
    function nonAdditiveMetric(metric) {
      return metric === '平均回复时长' || metric === '30s回复率' || metric === '5min回复率' ||
        metric === '抖音评分' || metric === '美团评分' || metric === '大众评分' || metric === '美团经营分' || metric === '大钟率';
    }
    function renderKpiTrend(metric, selectedDate, comparePeriod, currentRange) {
      const isScanMetric = metric === '扫码合计';
      const metricRange = periodRange(selectedDate, comparePeriod);
      const previousRange = { start: metricRange.previousStart, end: metricRange.previousEnd };
      const rows = state.stores.map((store) => {
        const current = aggregateStore(store, metricRange);
        if (!current) return null;
        const previous = aggregateStore(store, previousRange);
        return {
          store,
          current,
          previous,
          value: metricValue(current, metric),
          previousValue: previous ? metricValue(previous, metric) : 0,
          meituanScan: value(current, '美团扫码'),
          douyinScan: value(current, '抖音扫码')
        };
      }).filter(Boolean);
      const additive = !nonAdditiveMetric(metric);
      const total = additive ? rows.reduce((acc, row) => acc + row.value, 0) : avg(rows, 'value');
      const middle = median(rows.map((row) => row.value));
      const max = Math.max(1, ...rows.map((row) => row.value));
      const lowBetter = lowerIsBetter(metric);
      rows.sort((a, b) => lowBetter ? a.value - b.value || compareStoreNames(a.store, b.store) : b.value - a.value || compareStoreNames(a.store, b.store));
      const format = metricFormatter(metric);
      const periodName = { day: '日', week: '周', month: '月' }[comparePeriod];
      const monthTrendRows = isScanMetric
        ? state.dates.filter((date) => date >= selectedDate.slice(0, 7) + '-01' && date <= selectedDate).map((date) => {
            const dayRows = byDate(date);
            return { '日期': date, '美团扫码': sum(dayRows, '美团扫码'), '抖音扫码': sum(dayRows, '抖音扫码') };
          })
        : metricMonthTrendRows(metric, selectedDate);
      const monthRange = { start: selectedDate.slice(0, 7) + '-01', end: selectedDate };
      const previousMonthRange = { start: shiftMonths(monthRange.start, -1), end: shiftMonths(monthRange.end, -1) };
      const monthCurrent = aggregateMetricForRows(
        state.records.filter((row) => row['日期'] >= monthRange.start && row['日期'] <= monthRange.end),
        metric
      );
      const monthPrevious = aggregateMetricForRows(
        state.records.filter((row) => row['日期'] >= previousMonthRange.start && row['日期'] <= previousMonthRange.end),
        metric
      );
      const monthSummary = nonAdditiveMetric(metric)
        ? '本月按日均值 ' + format(monthCurrent) + '；上月同期 ' + format(monthPrevious) + '；较上月同期 ' + deltaText(monthCurrent, monthPrevious, format) + '。'
        : '本月累计 ' + format(monthCurrent) + '；上月同期 ' + format(monthPrevious) + '；较上月同期 ' + deltaText(monthCurrent, monthPrevious, format) + '。';
      const meituanScanTotal = rows.reduce((acc, row) => acc + row.meituanScan, 0);
      const douyinScanTotal = rows.reduce((acc, row) => acc + row.douyinScan, 0);
      document.getElementById('kpiTrendSummary').innerHTML =
        '当前按' + periodName + '查看：' + metricRange.start + (metricRange.start === metricRange.end ? '' : ' 至 ' + metricRange.end) +
        '；门店数 ' + rows.length + '；全店' + (additive ? '合计 ' : '平均 ') + format(total) +
        (isScanMetric ? '（美团 ' + money.format(meituanScanTotal) + '，抖音 ' + money.format(douyinScanTotal) + '）' : '') +
        '；门店中位数 ' + format(middle) + '。点击任一门店可进入单店详情。';
      const compareHeader = isScanMetric
        ? '<div class="metric-compare-row header"><div>排名</div><div>门店</div><div style="text-align:right">扫码合计</div><div style="text-align:right">美团扫码</div><div style="text-align:right">抖音扫码</div><div style="text-align:right">较上期</div><div>横向条</div></div>'
        : '<div class="metric-compare-row header"><div>排名</div><div>门店</div><div style="text-align:right">指标值</div><div style="text-align:right">占比</div><div style="text-align:right">较上期</div><div style="text-align:right">较中位数</div><div>横向条</div></div>';
      document.getElementById('kpiTrendChart').innerHTML =
        '<div class="metric-compare-list">' +
        compareHeader +
        rows.map((row, idx) => {
          const share = additive && total ? pct.format(row.value / total) : '-';
          const previousText = row.previous ? deltaText(row.value, row.previousValue, format) : '-';
          const medianText = deltaText(row.value, middle, format);
          const width = Math.max(3, row.value / max * 100);
          const medianPosition = Math.max(0, Math.min(100, middle / max * 100));
          const link = '#date=' + encodeURIComponent(selectedDate) + '&period=' + encodeURIComponent(comparePeriod) + '&store=' + encodeURIComponent(row.store);
          return '<a class="metric-compare-row" href="' + link + '">' +
            '<div class="rank">' + (idx + 1) + '</div>' +
            '<div class="metric-compare-store">' + esc(row.store) + '</div>' +
            '<div class="metric-compare-value">' + format(row.value) + '</div>' +
            (isScanMetric
              ? '<div class="metric-compare-muted">' + money.format(row.meituanScan) + '</div>' +
                '<div class="metric-compare-muted">' + money.format(row.douyinScan) + '</div>' +
                '<div class="metric-compare-muted">' + previousText + '</div>'
              : '<div class="metric-compare-muted">' + share + '</div>' +
                '<div class="metric-compare-muted">' + previousText + '</div>' +
                '<div class="metric-compare-muted">' + medianText + '</div>') +
            '<div class="metric-bar"><div class="metric-bar-fill" style="width:' + width.toFixed(1) + '%"></div>' +
            '<span class="metric-median-marker" style="left:' + medianPosition.toFixed(1) + '%" title="门店中位数 ' + esc(format(middle)) + '"></span></div>' +
            '</a>';
        }).join('') +
        '</div>';
      document.getElementById('kpiMonthTrendSummary').innerHTML =
        '统计范围：' + monthRange.start + ' 至 ' + monthRange.end + '；' + monthSummary +
        (isScanMetric ? ' 美团 ' + money.format(sum(monthTrendRows, '美团扫码')) + '，抖音 ' + money.format(sum(monthTrendRows, '抖音扫码')) + '。' : '');
      renderMultiTrend('kpiMonthTrendChart', monthTrendRows, selectedDate, isScanMetric ? [
        { label: '美团扫码', color: 'var(--blue)', calc: (row) => value(row, '美团扫码'), format },
        { label: '抖音扫码', color: 'var(--cyan)', calc: (row) => value(row, '抖音扫码'), format }
      ] : [
        { label: metric, color: 'var(--blue)', calc: (row) => value(row, metric), format }
      ]);
    }
    function renderDetail(date, store, period, range) {
      const rows = byStore(store);
      const periodRows = rows.filter((row) => row['日期'] >= range.start && row['日期'] <= range.end);
      const days = Math.max(1, periodRows.length);
      const storesInPeriod = state.stores.map((storeName) => {
        const storeRows = byStore(storeName).filter((row) => row['日期'] >= range.start && row['日期'] <= range.end);
        return { storeName, rows: storeRows };
      }).filter((item) => item.rows.length);
      const rankFor = (calc) => {
        const ranking = storesInPeriod
          .map((item) => ({ storeName: item.storeName, total: item.rows.reduce((acc, row) => acc + calc(row), 0) }))
          .sort((a, b) => b.total - a.total || compareStoreNames(a.storeName, b.storeName));
        const idx = ranking.findIndex((item) => item.storeName === store);
        return idx >= 0 ? idx + 1 : '-';
      };
      const medianFor = (calc) => {
        const values = storesInPeriod
          .map((item) => item.rows.reduce((acc, row) => acc + calc(row), 0))
          .sort((a, b) => a - b);
        if (!values.length) return 0;
        const mid = Math.floor(values.length / 2);
        return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
      };
      const metric = (label, calc, prefix = '') => {
        const total = periodRows.reduce((acc, row) => acc + calc(row), 0);
        return label + ' ' + prefix + money.format(total) + ' / 日均 ' + prefix + money.format(total / days) + ' / 排名 ' + rankFor(calc) + ' / 中位数 ' + prefix + money.format(medianFor(calc));
      };
      const bigClockRateFor = (targetRows) => {
        const projectTotal = sum(targetRows, '168项目') + sum(targetRows, '298项目') + sum(targetRows, '358项目');
        return projectTotal ? (sum(targetRows, '298项目') + sum(targetRows, '358项目')) / projectTotal : 0;
      };
      const bigClockRanking = storesInPeriod.map((item) => ({
        storeName: item.storeName,
        rate: bigClockRateFor(item.rows)
      })).sort((a, b) => b.rate - a.rate || compareStoreNames(a.storeName, b.storeName));
      const bigClockRank = bigClockRanking.findIndex((item) => item.storeName === store) + 1;
      const bigClockMedian = median(bigClockRanking.map((item) => item.rate));
      const salesMix = salesMixForRows(periodRows);
      const salesMixText = '销售占比 抖音 ' + pct.format(salesMix.douyin) + ' / 美团 ' + pct.format(salesMix.meituan) +
        ' / 其它 ' + pct.format(salesMix.other) + (salesMix.adjusted ? ' / 平台金额高于营业额' : '');
      document.getElementById('detailTitle').textContent = store;
      detailStoreSelect.value = store;
      const detailMetrics = [
        { group: '经营结果', key: '总营业额', text: metric('营业额', (row) => value(row, '总营业额'), '¥') },
        { group: '经营结果', key: '卡金', text: metric('卡金', (row) => value(row, '卡金'), '¥') },
        { group: '经营结果', key: '大钟率', text: '大钟率 ' + pct.format(bigClockRateFor(periodRows)) + ' / 排名 ' + (bigClockRank || '-') + ' / 中位数 ' + pct.format(bigClockMedian) },
        { group: '平台表现', key: '美团-平台', text: metric('美团-平台', (row) => value(row, '美团-平台'), '¥') },
        { group: '平台表现', key: '抖音-平台', text: metric('抖音-平台', (row) => value(row, '抖音-平台'), '¥') },
        { group: '平台表现', key: '销售占比', text: salesMixText },
        { group: '平台表现', key: '美团访问人数', text: metric('美团访问', (row) => value(row, '美团访问人数')) },
        { group: '平台表现', key: '抖音访问人数', text: metric('抖音访问', (row) => value(row, '抖音访问人数')) },
        { group: '口碑与留存', key: '新增好评', text: metric('新增好评', (row) => value(row, '新增好评')) },
        { group: '口碑与留存', key: '新增差评', text: metric('差评', (row) => value(row, '新增差评')) },
        { group: '口碑与留存', key: '扫码合计', text: metric('扫码', (row) => value(row, '美团扫码') + value(row, '抖音扫码')) },
      ];
      const pillContent = (text) => {
        const splitAt = text.indexOf(' ');
        const label = splitAt < 0 ? text : text.slice(0, splitAt);
        const detailText = splitAt < 0 ? '' : text.slice(splitAt + 1);
        const rankMatch = detailText.match(/排名 ([0-9]+)/);
        const rank = rankMatch ? Number(rankMatch[1]) : 0;
        const rankClass = rank && rank <= 3 ? ' rank-top' : rank > Math.max(3, storesInPeriod.length - 3) ? ' rank-bottom' : '';
        return '<span class="pill-label">' + esc(label) + '</span>' + (detailText ? ' <span class="pill-detail' + rankClass + '">' + esc(detailText) + '</span>' : '');
      };
      document.getElementById('detailPills').innerHTML = ['经营结果', '平台表现', '口碑与留存'].map((group) =>
        '<section class="metric-group"><div class="metric-group-title">' + group + '</div><div class="metric-group-items">' +
        detailMetrics.filter((item) => item.group === group).map((item) =>
          '<button class="pill" type="button" data-detail-metric="' + item.key + '">' + pillContent(item.text) + '</button>'
        ).join('') + '</div></section>'
      ).join('');
      const detailTrendPanel = document.getElementById('detailMetricTrendPanel');
      detailTrendPanel.style.display = 'none';
      const trendRows = period === 'day' ? rows.filter((row) => row['日期'] <= date).slice(-30) : periodRows;
      const detailMetricLabel = {
        '总营业额': '营业额', '美团-平台': '美团平台', '抖音-平台': '抖音平台',
        '抖音访问人数': '抖音访问', '美团访问人数': '美团访问', '新增好评': '新增好评',
        '新增差评': '新增差评', '卡金': '卡金', '扫码合计': '扫码', '大钟率': '大钟率',
        '销售占比': '销售占比'
      };
      document.querySelectorAll('#detailPills [data-detail-metric]').forEach((pill) => {
        pill.addEventListener('click', () => {
          const selectedMetric = pill.getAttribute('data-detail-metric');
          document.querySelectorAll('#detailPills .pill').forEach((item) => item.classList.remove('active'));
          pill.classList.add('active');
          detailTrendPanel.style.display = 'block';
          document.getElementById('detailMetricTrendTitle').textContent = detailMetricLabel[selectedMetric] + '趋势';
          const salesMixAnomalyDays = selectedMetric === '销售占比'
            ? trendRows.filter((row) => salesMixForRows([row]).adjusted).length
            : 0;
          document.getElementById('detailMetricTrendSummary').textContent = (period === 'day'
            ? '按日查看时展示截至所选日期近30条记录'
            : periodLabel(period, range) + '，按日展示周期内变化') +
            (salesMixAnomalyDays ? '；' + salesMixAnomalyDays + '天平台金额高于营业额，已按平台金额归一化' : '');
          const format = metricFormatter(selectedMetric);
          const series = selectedMetric === '扫码合计' ? [
            { label: '美团扫码', color: 'var(--blue)', calc: (row) => value(row, '美团扫码'), format },
            { label: '抖音扫码', color: 'var(--cyan)', calc: (row) => value(row, '抖音扫码'), format }
          ] : selectedMetric === '销售占比' ? [
            { label: '抖音占比', color: 'var(--cyan)', calc: (row) => salesMixForRows([row]).douyin, format },
            { label: '美团占比', color: 'var(--blue)', calc: (row) => salesMixForRows([row]).meituan, format },
            { label: '其它占比', color: 'var(--gold)', calc: (row) => salesMixForRows([row]).other, format }
          ] : [
            { label: detailMetricLabel[selectedMetric], color: 'var(--blue)', calc: (row) => metricValue(row, selectedMetric), format }
          ];
          renderMultiTrend('detailMetricTrendChart', trendRows, date, series);
          detailTrendPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      });
      document.getElementById('detailMetricTrendClose').onclick = () => {
        detailTrendPanel.style.display = 'none';
        document.querySelectorAll('#detailPills .pill').forEach((item) => item.classList.remove('active'));
      };
      document.getElementById('historyTable').innerHTML = '<thead><tr><th>日期</th><th>总营业额</th><th>开卡</th><th>续充</th><th>卡金</th><th>抖音-平台</th><th>美团-平台</th><th>抖音访问</th><th>美团访问</th><th>美团扫码</th><th>抖音扫码</th><th>平均回复时长</th><th>好评</th><th>差评</th><th>168项目</th><th>298项目</th><th>358项目</th><th>抖音评分</th><th>美团评分</th><th>大众点评评分</th></tr></thead><tbody>' +
        periodRows.slice().reverse().map((row) => '<tr><td>' + row['日期'] + '</td><td>¥' + money.format(value(row, '总营业额')) + '</td><td>¥' + money.format(value(row, '开卡金额')) + '</td><td>¥' + money.format(value(row, '续充金额')) + '</td><td>¥' + money.format(value(row, '卡金')) + '</td><td>¥' + money.format(value(row, '抖音-平台')) + '</td><td>¥' + money.format(value(row, '美团-平台')) + '</td><td>' + money.format(value(row, '抖音访问人数')) + '</td><td>' + money.format(value(row, '美团访问人数')) + '</td><td>' + money.format(value(row, '美团扫码')) + '</td><td>' + money.format(value(row, '抖音扫码')) + '</td><td>' + one.format(value(row, '平均回复时长')) + 's</td><td>' + money.format(value(row, '新增好评')) + '</td><td>' + money.format(value(row, '新增差评')) + '</td><td>' + money.format(value(row, '168项目')) + '</td><td>' + money.format(value(row, '298项目')) + '</td><td>' + money.format(value(row, '358项目')) + '</td><td>' + one.format(value(row, '抖音评分')) + '</td><td>' + one.format(value(row, '美团评分')) + '</td><td>' + one.format(value(row, '大众评分')) + '</td></tr>').join('') +
        '</tbody>';
      syncHistoryScroll();
    }
    function renderMultiTrend(targetId, rows, selectedDate, series) {
      const w = 900, h = 300, leftPad = 76, rightPad = 28, topPad = 24, bottomPad = 44;
      const allValues = series.flatMap((s) => rows.map((row) => s.calc(row)));
      const max = Math.max(1, ...allValues);
      const min = Math.min(0, ...allValues);
      const span = Math.max(1, max - min);
      const xFor = (i) => leftPad + (rows.length <= 1 ? 0 : i / (rows.length - 1) * (w - leftPad - rightPad));
      const yFor = (v) => h - bottomPad - ((v - min) / span * (h - topPad - bottomPad));
      const smoothPath = (points) => {
        if (!points.length) return '';
        if (points.length === 1) return 'M ' + points[0].x.toFixed(1) + ' ' + points[0].y.toFixed(1);
        let path = 'M ' + points[0].x.toFixed(1) + ' ' + points[0].y.toFixed(1);
        for (let i = 0; i < points.length - 1; i += 1) {
          const current = points[i];
          const next = points[i + 1];
          const midpointX = (current.x + next.x) / 2;
          path += ' C ' + midpointX.toFixed(1) + ' ' + current.y.toFixed(1) + ', ' + midpointX.toFixed(1) + ' ' + next.y.toFixed(1) + ', ' + next.x.toFixed(1) + ' ' + next.y.toFixed(1);
        }
        return path;
      };
      const lines = series.map((s) => {
        const points = rows.map((row, i) => ({ x: xFor(i), y: yFor(s.calc(row)) }));
        const dots = rows.map((row, i) => {
          const x = xFor(i);
          const y = yFor(s.calc(row));
          const data = ' data-date="' + esc(row['日期']) + '" data-label="' + esc(s.label) + '" data-value="' + esc(s.format(s.calc(row))) + '"';
          const selected = row['日期'] === selectedDate;
          return '<circle class="trend-dot" cx="' + x + '" cy="' + y + '" r="' + (selected ? 2.5 : 1.5) + '" fill="' + s.color + '" opacity="' + (selected ? '.95' : '.7') + '"></circle><circle class="trend-hit" cx="' + x + '" cy="' + y + '" r="14" fill="transparent" stroke="transparent"' + data + '></circle>';
        }).join('');
        const baseY = (h - bottomPad).toFixed(1);
        const areaPath = points.length
          ? '<path class="trend-area" d="' + smoothPath(points) + ' L ' + points[points.length - 1].x.toFixed(1) + ' ' + baseY + ' L ' + points[0].x.toFixed(1) + ' ' + baseY + ' Z" style="fill:' + s.color + '"/>'
          : '';
        return areaPath + '<path class="trend-line" d="' + smoothPath(points) + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' + dots;
      }).join('');
      const yTicks = Array.from({ length: 5 }, (_, index) => {
        const tickValue = min + span * index / 4;
        const y = yFor(tickValue);
        return '<line x1="' + leftPad + '" y1="' + y + '" x2="' + (w - rightPad) + '" y2="' + y + '" stroke="var(--chart-grid)" stroke-opacity=".55"></line>' +
          '<text x="' + (leftPad - 10) + '" y="' + (y + 4) + '" text-anchor="end">' + esc(series[0].format(tickValue)) + '</text>';
      }).join('');
      const labels = rows.filter((_, i) => i === 0 || i === rows.length - 1).map((row, i, arr) => {
        const idx = i === 0 ? 0 : rows.length - 1;
        const x = xFor(idx);
        return '<text x="' + x + '" y="' + (h - 12) + '" text-anchor="' + (i === 0 ? 'start' : 'end') + '">' + row['日期'].slice(5) + '</text>';
      }).join('');
      const yAxis = '<line x1="' + leftPad + '" y1="' + topPad + '" x2="' + leftPad + '" y2="' + (h - bottomPad) + '" stroke="var(--chart-grid)"></line>';
      document.getElementById(targetId).innerHTML = '<svg class="trend" viewBox="0 0 ' + w + ' ' + h + '" role="img">' + yTicks + yAxis + lines + labels + '</svg>';
      attachTrendTooltip(targetId);
    }
    function attachTrendTooltip(targetId) {
      let tooltip = document.getElementById('chartTooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'chartTooltip';
        tooltip.className = 'chart-tooltip';
        document.body.appendChild(tooltip);
      }
      const target = document.getElementById(targetId);
      target.querySelectorAll('.trend-hit').forEach((dot) => {
        dot.addEventListener('pointerenter', () => {
          tooltip.innerHTML = dot.dataset.date + '<br>' + dot.dataset.label + '：' + dot.dataset.value;
          tooltip.classList.add('active');
        });
        dot.addEventListener('pointermove', (event) => {
          const gap = 14;
          const margin = 8;
          const rect = tooltip.getBoundingClientRect();
          let left = event.clientX + gap;
          let top = event.clientY - rect.height - gap;
          if (left + rect.width > window.innerWidth - margin) left = event.clientX - rect.width - gap;
          if (left < margin) left = margin;
          if (top < margin) top = event.clientY + gap;
          if (top + rect.height > window.innerHeight - margin) top = window.innerHeight - rect.height - margin;
          tooltip.style.transform = 'none';
          tooltip.style.left = left + 'px';
          tooltip.style.top = top + 'px';
        });
        dot.addEventListener('pointerleave', () => {
          tooltip.classList.remove('active');
        });
      });
    }
    function syncHistoryScroll() {
      const wrap = document.getElementById('historyTableWrap');
      const top = document.getElementById('historyScrollTop');
      const table = document.getElementById('historyTable');
      if (!wrap || !top || !table) return;
      requestAnimationFrame(() => {
        top.querySelector('.scroll-spacer').style.width = table.scrollWidth + 'px';
        top.onscroll = () => { wrap.scrollLeft = top.scrollLeft; };
        wrap.onscroll = () => { top.scrollLeft = wrap.scrollLeft; };
      });
    }
    function render() {
      const h = currentHash();
      const date = state.dates.includes(h.date) ? h.date : state.latestDate;
      const period = ['day','week','month','quarter','year','custom'].includes(h.period) ? h.period : 'day';
      const range = periodRange(date, period, h.start, h.end);
      periodSelect.value = period;
      updateDateOptions(dateSelect, period, state.dates, date);
      customRange.classList.toggle('active', period === 'custom');
      startDateInput.value = range.start;
      endDateInput.value = range.end;
      if (h.store && state.stores.includes(h.store)) {
        overview.classList.add('hidden');
        detail.classList.add('active');
        overviewStorePicker.style.display = 'none';
        detailStorePicker.style.display = 'inline-flex';
        backButton.style.display = 'inline-flex';
        renderDetail(date, h.store, period, range);
      } else {
        overview.classList.remove('hidden');
        detail.classList.remove('active');
        overviewStorePicker.style.display = 'inline-flex';
        detailStorePicker.style.display = 'none';
        overviewStoreSelect.value = '';
        backButton.style.display = 'none';
        renderOverview(date, period, range.start, range.end);
      }
    }
    initDates();
    window.addEventListener('hashchange', render);
    normalizeInitialHash();
    render();
  </script>
</body>
</html>`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cache = arg('from-json');
  const records = cache ? loadCachedRecords(path.resolve(cache)) : listRecords();
  const generatedAt = new Date().toLocaleString('zh-CN', { hour12: false });
  const dataPath = path.join(OUT_DIR, 'base-records.json');
  const htmlPath = path.join(OUT_DIR, 'index.html');
  fs.writeFileSync(dataPath, JSON.stringify({ generatedAt, records }, null, 2));
  fs.writeFileSync(htmlPath, buildHtml(records, generatedAt));
  if (!hasFlag('quiet')) {
    const dates = [...new Set(records.map((r) => r.日期))].sort();
    const stores = orderStores(new Set(records.map((r) => r.门店)));
    console.log(JSON.stringify({
      ok: true,
      recordCount: records.length,
      dateCount: dates.length,
      storeCount: stores.length,
      latestDate: dates[dates.length - 1] || null,
      htmlPath,
      dataPath,
    }, null, 2));
  }
}

main();
