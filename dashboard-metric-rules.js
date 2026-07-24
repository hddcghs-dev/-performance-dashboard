(function initDashboardMetricRules(root, factory) {
  const rules = factory();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.DashboardMetricRules = rules;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createDashboardMetricRules() {
  const channelRevenueFields = Object.freeze({
    '抖音营业额': { platform: '抖音-平台', fallback: '抖音-可聚集' },
    '美团营业额': { platform: '美团-平台', fallback: '美团-可聚集' },
  });
  const dailySumMetrics = new Set(['抖音扫码', '美团扫码']);
  const ratioMetrics = Object.freeze({
    '美团转化率': ['美团核销总数', '美团曝光人数'],
    '抖音转化率': ['抖音门店页成交人数', '抖音门店页访问人数'],
    '抖音核销率': ['抖音-平台', '抖音成交金额'],
  });
  const averageMetrics = new Set([
    '差评率', '新客占比', '曝光-访问转化率', '意向转化率', '大钟占比',
    '抖音评价回复率', '抖音评分', '美团评分', '大众点评', '美团经营分',
  ]);

  function metricRule(metric) {
    if (channelRevenueFields[metric]) return { kind: 'channel', fields: channelRevenueFields[metric] };
    if (metric === '美团刷单金额') return { kind: 'daily-sum', field: metric };
    if (dailySumMetrics.has(metric)) return { kind: 'daily-sum', field: metric };
    if (ratioMetrics[metric]) return { kind: 'ratio', parts: ratioMetrics[metric] };
    if (averageMetrics.has(metric)) return { kind: 'average', field: metric };
    return { kind: 'sum', field: metric };
  }

  return Object.freeze({
    averageMetrics,
    channelRevenueFields,
    dailySumMetrics,
    metricRule,
    ratioMetrics,
  });
}));
