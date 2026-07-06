const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_TOKEN = 'FenabhJ7Na0fots8Em2cQhIanKf';
const TABLE_ID = 'tblaQen7S4W8B96T';
const VIEW_ID = 'vewcl1zgt9';
const PAGE_SIZE = 200;
const outputPath = path.resolve(__dirname, '../data/dashboard_data.json');
const scriptOutputPath = path.resolve(__dirname, '../data/dashboard_data.js');

function readPage(offset) {
  const args = [
    'base', '+record-list', '--base-token', BASE_TOKEN,
    '--table-id', TABLE_ID, '--view-id', VIEW_ID,
    '--offset', String(offset), '--limit', String(PAGE_SIZE),
    '--format', 'json', '--as', 'user'
  ];
  const options = { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 };
  const raw = process.platform === 'win32'
    ? execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'lark-cli', ...args], options)
    : execFileSync('lark-cli', args, options);
  const result = JSON.parse(raw);
  if (!result.ok) throw new Error(result.error?.message || 'Base 数据读取失败');
  return result.data;
}

let offset = 0;
let fields = [];
const records = [];
while (true) {
  const page = readPage(offset);
  fields = page.fields;
  for (let i = 0; i < page.data.length; i++) {
    const record = Object.fromEntries(fields.map((field, index) => [field, page.data[i][index]]));
    record._record_id = page.record_id_list[i];
    if (record['日期']) record['日期'] = String(record['日期']).slice(0, 10);
    records.push(record);
  }
  if (!page.has_more || page.data.length === 0) break;
  offset += page.data.length;
}

const dates = [...new Set(records.map(r => r['日期']).filter(Boolean))].sort();
const stores = [...new Set(records.map(r => r['门店']).filter(Boolean))];
const payload = {
  meta: {
    title: '民德时代日报看板',
    source: '飞书 Base',
    base_token: BASE_TOKEN,
    table_id: TABLE_ID,
    view_id: VIEW_ID,
    generated_at: new Date().toISOString(),
    record_count: records.length,
    date_min: dates[0] || null,
    date_max: dates.at(-1) || null
  },
  fields,
  stores,
  dates,
  records
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
fs.writeFileSync(scriptOutputPath, `window.DASHBOARD_DATA=${JSON.stringify(payload)};\n`, 'utf8');
console.log(`已生成 ${outputPath}`);
console.log(`记录 ${records.length} 条，日期 ${payload.meta.date_min} 至 ${payload.meta.date_max}`);
