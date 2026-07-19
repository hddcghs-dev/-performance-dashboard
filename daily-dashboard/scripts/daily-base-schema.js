const BASE_TOKEN = 'FenabhJ7Na0fots8Em2cQhIanKf';
const TABLE_ID = 'tblaQen7S4W8B96T';

const FIELD_IDS = Object.freeze({
  日期: 'fldfYiSTYI',
  门店: 'fldqgQ3vZa',
  总营业额: 'fldIQrKzXO',
  开卡金额: 'fldiFRZsdx',
  续充金额: 'fldc692tP0',
  卡金: 'fldiQgqDqv',
  抖音访问人数: 'fldpbYp955',
  '抖音-前厅': 'fld47Xem8N',
  '抖音-平台': 'fldkQtCxqT',
  抖音评分: 'flduuzBLON',
  抖音扫码: 'fldZbyuHvl',
  美团访问人数: 'fldNCAVIwz',
  '美团-前厅': 'fld8H80TZY',
  '美团-平台': 'fldodi2Qub',
  美团评分: 'fldBBQ9Fdo',
  大众评分: 'fldli5QTC5',
  美团经营分: 'fldEoSKrRv',
  美团扫码: 'fldHZGoYQ3',
  平均回复时长: 'fldjNEvdlu',
  '30s回复率': 'fldM46kiK6',
  '5min回复率': 'fld6c988U0',
  新增好评: 'fldFOdHv5d',
  新增差评: 'fldFytToOF',
  '168项目': 'fldFBvUvQL',
  '298项目': 'fldnHNVjE8',
  '358项目': 'fldcd8J7lH',
  商品销售数量: 'fldVZHanlk',
  免单: 'fldWEriEpT',
});

const CANONICAL_BY_ID = Object.freeze(Object.fromEntries(
  Object.entries(FIELD_IDS).map(([name, id]) => [id, name])
));

function fieldId(name) {
  const id = FIELD_IDS[name];
  if (!id) throw new Error(`Unknown daily Base field: ${name}`);
  return id;
}

function canonicalRecord(data, row) {
  const names = data.fields || [];
  const ids = data.field_id_list || [];
  const record = {};
  row.forEach((value, index) => {
    const canonical = CANONICAL_BY_ID[ids[index]] || names[index];
    if (canonical) record[canonical] = value;
  });
  return record;
}

function validateFieldList(fields) {
  const liveIds = new Set((fields || []).map((field) => field.id));
  return Object.entries(FIELD_IDS)
    .filter(([, id]) => !liveIds.has(id))
    .map(([name, id]) => ({ name, id }));
}

module.exports = {
  BASE_TOKEN,
  TABLE_ID,
  FIELD_IDS,
  CANONICAL_BY_ID,
  fieldId,
  canonicalRecord,
  validateFieldList,
};
