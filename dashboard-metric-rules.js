(function initDashboardMetricRules(root, factory) {
  const rules = factory();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.DashboardMetricRules = rules;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createDashboardMetricRules() {
  const channelRevenueFields = Object.freeze({
    '抖音营业额': { platform: '抖音-平台', fallback: '抖音-可聚集' },
    '美团营业额': { platform: '美团-平台', fallback: '美团-可聚集' },
  });
  const dailySumMetrics = new Set(['抖音扫码', '美团扫码', '抖音刷单金额', '美团刷单金额']);
  const ratioMetrics = Object.freeze({
    '美团转化率': ['美团核销总数', '美团曝光人数'],
    '抖音转化率': ['抖音门店页成交人数', '抖音门店页访问人数'],
    '抖音核销率': ['抖音-平台', '抖音成交金额'],
  });
  const percentageMetrics = new Set([
    '差评率', '新客占比',
    '曝光-访问转化率', '美团曝光-访问转化率',
    '意向转化率', '美团意向转化率',
    '美团转化率', '抖音转化率', '抖音核销率',
    '大钟占比', '大钟占比（298+358）',
    '抖音评价回复率', '30s回复率', '5min回复率',
  ]);
  const averageMetrics = new Set([
    ...percentageMetrics,
    '抖音评分', '美团评分', '大众点评', '美团经营分',
    '美团平均回复时长（秒）',
  ]);
  const nonZeroAverageMetrics = new Set([
    '抖音评分', '美团评分', '大众点评', '美团经营分',
    '美团平均回复时长（秒）',
  ]);

  function averageMetricValues(values, metric) {
    const valid = values
      .filter(value => value !== null && value !== undefined && value !== '')
      .map(Number)
      .filter(Number.isFinite)
      .filter(value => !nonZeroAverageMetrics.has(metric) || value > 0);
    return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
  }

  function metricRule(metric) {
    if (channelRevenueFields[metric]) return { kind: 'channel', fields: channelRevenueFields[metric] };
    if (dailySumMetrics.has(metric)) return { kind: 'daily-sum', field: metric };
    if (ratioMetrics[metric]) return { kind: 'ratio', parts: ratioMetrics[metric] };
    if (averageMetrics.has(metric)) return { kind: 'average', field: metric };
    return { kind: 'sum', field: metric };
  }

  return Object.freeze({
    averageMetricValues,
    averageMetrics,
    channelRevenueFields,
    dailySumMetrics,
    metricRule,
    nonZeroAverageMetrics,
    percentageMetrics,
    ratioMetrics,
  });
}));
