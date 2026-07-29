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
  const moneyMetrics = new Set([
    '总营业额', '服务营业额', '商品营业额', '现金流', '卡金消耗', '充值金额',
    '免单金额', '抖音营业额', '美团营业额', '抖音-平台', '美团-平台',
    '抖音-可聚集', '美团-可聚集', '抖音成交金额', '抖音刷单金额', '美团刷单金额',
  ]);
  const scoreMetrics = new Set(['抖音评分', '美团评分', '大众点评', '美团经营分']);
  const lowerIsBetterMetrics = new Set([
    '差评率', '总差评', '抖音新增中差评数', '美团新增中评数', '美团新增差评数',
    '免单金额', '抖音刷单金额', '美团刷单金额', '美团平均回复时长（秒）',
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

  function metricMeta(metric) {
    let source = '微聚集';
    if (metric.startsWith('抖音')) source = '抖音来客';
    else if (metric.startsWith('美团') || metric === '大众点评') source = '美团经营宝';
    else if (['差评率', '新客占比'].includes(metric)) source = '跨来源计算';

    let format = 'count';
    if (percentageMetrics.has(metric)) format = 'percent';
    else if (moneyMetrics.has(metric)) format = 'money';
    else if (scoreMetrics.has(metric)) format = 'score';
    else if (metric.includes('时长')) format = 'duration';

    return Object.freeze({
      metric,
      rule: metricRule(metric),
      source,
      format,
      missing: nonZeroAverageMetrics.has(metric) ? 'zero-is-missing' : 'null-is-missing',
      direction: lowerIsBetterMetrics.has(metric) ? 'lower-is-better' : 'higher-is-better',
    });
  }

  return Object.freeze({
    averageMetricValues,
    averageMetrics,
    channelRevenueFields,
    dailySumMetrics,
    metricMeta,
    metricRule,
    nonZeroAverageMetrics,
    percentageMetrics,
    ratioMetrics,
  });
}));
