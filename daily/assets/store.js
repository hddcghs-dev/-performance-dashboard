let allData = [];
let currentStore = "";
let currentMonth = "";
let charts = {};

const nf = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const fmt = value => nf.format(Number(value || 0));
const money = value => "¥" + fmt(value);
const n = value => Number(value || 0);
const pct = value => value == null || Number.isNaN(Number(value)) ? "-" : (Number(value) * 100).toFixed(0) + "%";
const sumBy = (rows, getter) => rows.reduce((sum, row) => sum + n(getter(row)), 0);
const avgBy = (rows, getter) => {
  const values = rows.map(getter).map(Number).filter(v => Number.isFinite(v) && v > 0);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
};

const chartTheme = {
  animationDuration: 850,
  animationEasing: "cubicOut",
  tooltip: {
    trigger: "axis",
    backgroundColor: "#fff",
    borderColor: "#e5e7eb",
    textStyle: { color: "#111827", fontSize: 12 },
    extraCssText: "box-shadow:0 10px 28px rgba(15,23,42,.12);border-radius:8px;padding:10px 14px;"
  },
  legend: { top: 2, right: 8, itemWidth: 10, itemHeight: 10, textStyle: { color: "#64748b", fontSize: 11 } },
  grid: { left: 14, right: 18, top: 58, bottom: 34, containLabel: true },
  xAxis: { type: "category", axisTick: { show: false }, axisLine: { lineStyle: { color: "#e5e7eb" } }, axisLabel: { color: "#94a3b8", fontSize: 10 } },
  yAxis: { type: "value", axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: "#94a3b8", fontSize: 10 }, splitLine: { lineStyle: { color: "#eef2f7", type: "dashed" } } }
};

function getParam(name) {
  return new URL(location.href).searchParams.get(name) || "";
}

async function loadData() {
  try {
    const response = await fetch("daily_data.json");
    allData = await response.json();
    initApp();
    return;
  } catch (error) {
    if (location.protocol === "file:") {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", "daily_data.json", false);
        xhr.send(null);
        if (xhr.status === 0 || xhr.status === 200) {
          allData = JSON.parse(xhr.responseText);
          initApp();
          return;
        }
      } catch (_) {}
    }
  }
  document.getElementById("detailBody").innerHTML = `<tr><td colspan="16" class="empty">未能读取 daily_data.json</td></tr>`;
}

function initApp() {
  currentStore = decodeURIComponent(getParam("store"));
  currentMonth = getParam("month") || latestMonthForStore(currentStore);
  document.getElementById("storeTitle").textContent = currentStore || "未指定门店";
  render();
}

function latestMonthForStore(store) {
  const dates = allData.filter(row => row.门店名称 === store).map(row => row.日期).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1].slice(0, 7) : "";
}

function navMonth(delta) {
  if (!currentMonth) return;
  const [year, month] = currentMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  render();
}

function rowsForMonth(month) {
  return allData
    .filter(row => row.门店名称 === currentStore && String(row.日期 || "").startsWith(month))
    .sort((a, b) => String(a.日期).localeCompare(String(b.日期)));
}

function previousMonth(month) {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(year, mon - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function totals(rows) {
  return {
    revenue: sumBy(rows, row => row.微矩总业绩 || row.总营业额),
    mt: sumBy(rows, row => row.美团核销金额),
    dy: sumBy(rows, row => row.抖音核销金额),
    card: sumBy(rows, row => row.微矩开卡 || row.开卡金额),
    recharge: sumBy(rows, row => row.微矩续充 || row.续充金额),
    good: sumBy(rows, row => row.新增好评),
    bad: sumBy(rows, row => row.新增差评),
    mtVisit: sumBy(rows, row => row.美团访问量),
    dyVisit: sumBy(rows, row => row.抖音访问量),
    mtScan: sumBy(rows, row => row.美团扫码),
    dyScan: sumBy(rows, row => row.抖音扫码),
  };
}

function trend(now, prev, lowerIsGood = false) {
  if (!prev) return `<span class="delta flat">无对比</span><span>上月为空</span>`;
  const diff = now - prev;
  const cls = Math.abs(diff) < .01 ? "flat" : lowerIsGood ? (diff <= 0 ? "up" : "down") : (diff >= 0 ? "up" : "down");
  return `<span class="delta ${cls}">${diff > 0 ? "+" : ""}${fmt(diff)}</span><span>较上月</span>`;
}

function kpiCard(label, value, foot) {
  return `<article class="card kpi-card">
    <div class="label">${label}</div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-foot">${foot}</div>
  </article>`;
}

function renderHeroAnalysis(data, t, prevData) {
  const p = totals(prevData);

  // --- 卡金分析 ---
  const cardTotal = t.card + t.recharge;
  const cardPrev = p.card + p.recharge;
  const cardDiff = cardTotal - cardPrev;
  const cardRatio = t.revenue > 0 ? (cardTotal / t.revenue * 100) : 0;

  let cardHtml;
  if (cardTotal === 0) {
    cardHtml = `<div class="ha-label"><span class="ha-dot" style="background:#f59e0b"></span>卡金分析</div>
      <div class="ha-metrics">本月无开卡/续充记录</div>
      <div class="ha-action">→ 充值意愿低，复购动力不足，需加强会员转化和复购引导</div>`;
  } else if (cardDiff < 0 || cardRatio < 5) {
    cardHtml = `<div class="ha-label"><span class="ha-dot" style="background:#ef4444"></span>卡金薄弱</div>
      <div class="ha-metrics">开卡<strong>${money(t.card)}</strong> 续充<strong>${money(t.recharge)}</strong> | 占营收<strong>${cardRatio.toFixed(1)}%</strong>${cardDiff < 0 ? ' | 较上月 <strong style="color:#fca5a5">' + money(cardDiff) + '</strong>' : ''}</div>
      <div class="ha-action">→ 充值转化不足，复购意愿弱，加强开卡权益和续充激励</div>`;
  } else {
    cardHtml = `<div class="ha-label"><span class="ha-dot" style="background:#22c55e"></span>卡金健康</div>
      <div class="ha-metrics">开卡<strong>${money(t.card)}</strong> 续充<strong>${money(t.recharge)}</strong> | 占比<strong>${cardRatio.toFixed(1)}%</strong> | 较上月 <strong>+${money(cardDiff)}</strong></div>
      <div class="ha-action">→ 会员现金流稳定，保持现有策略</div>`;
  }

  // --- 差评分析 ---
  const mtRating = avgBy(data, r => r.美团评分);
  const dyRating = avgBy(data, r => r.抖音评分);
  const mtRatingPrev = avgBy(prevData, r => r.美团评分);
  const mtDrop = mtRatingPrev > 0 ? mtRating - mtRatingPrev : 0;
  const badCount = t.bad;

  let reviewHtml;
  if (badCount > 0 && mtDrop < -0.05) {
    reviewHtml = `<div class="ha-label"><span class="ha-dot" style="background:#ef4444"></span>差评风险</div>
      <div class="ha-metrics">新增<strong>${badCount}条</strong>差评 | 美团<strong>${mtRating.toFixed(1)}</strong>（↓${Math.abs(mtDrop).toFixed(1)}）| 抖音<strong>${dyRating.toFixed(1)}</strong></div>
      <div class="ha-action">→ 差评拉低门店POI转化率，优先回访差评客户、管控服务质量</div>`;
  } else if (badCount > 0) {
    reviewHtml = `<div class="ha-label"><span class="ha-dot" style="background:#f59e0b"></span>差评关注</div>
      <div class="ha-metrics">新增<strong>${badCount}条</strong>差评 | 美团<strong>${mtRating.toFixed(1)}</strong> 抖音<strong>${dyRating.toFixed(1)}</strong></div>
      <div class="ha-action">→ 持续监控差评趋势，防止评分下降影响转化</div>`;
  } else if (mtDrop < -0.1) {
    reviewHtml = `<div class="ha-label"><span class="ha-dot" style="background:#f59e0b"></span>评分下滑</div>
      <div class="ha-metrics">美团<strong>${mtRating.toFixed(1)}</strong>（↓${Math.abs(mtDrop).toFixed(1)}）| 抖音<strong>${dyRating.toFixed(1)}</strong> | 0差评</div>
      <div class="ha-action">→ 无差评但评分在降，关注默认好评占比和评价质量</div>`;
  } else {
    reviewHtml = `<div class="ha-label"><span class="ha-dot" style="background:#22c55e"></span>评价健康</div>
      <div class="ha-metrics">0差评 | 美团<strong>${mtRating.toFixed(1)}</strong> 抖音<strong>${dyRating.toFixed(1)}</strong></div>
      <div class="ha-action">→ 口碑稳定，保持服务质量、鼓励好评积累</div>`;
  }

  // --- 回复率分析 ---
  const reply30s = avgBy(data, r => r["30s回复率"]);
  const reply5min = avgBy(data, r => r["5min回复率"]);

  let replyHtml;
  if (reply30s > 0 && reply30s < 0.5) {
    replyHtml = `<div class="ha-label"><span class="ha-dot" style="background:#ef4444"></span>回复率预警</div>
      <div class="ha-metrics">30s回复率 <strong style="color:#fca5a5">${pct(reply30s)}</strong> | 5min <strong>${pct(reply5min)}</strong> | 严重低于80%安全线</div>
      <div class="ha-action">→ 存在咨询客户大量流失风险，需立即提升在线响应速度</div>`;
  } else if (reply30s > 0 && reply30s < 0.8) {
    replyHtml = `<div class="ha-label"><span class="ha-dot" style="background:#f59e0b"></span>回复率偏低</div>
      <div class="ha-metrics">30s回复率 <strong>${pct(reply30s)}</strong> | 5min <strong>${pct(reply5min)}</strong> | 低于80%阈值</div>
      <div class="ha-action">→ 存在咨询客户流失可能，优化客服排班和快捷回复</div>`;
  } else if (reply30s >= 0.8) {
    replyHtml = `<div class="ha-label"><span class="ha-dot" style="background:#22c55e"></span>回复率达标</div>
      <div class="ha-metrics">30s回复率 <strong>${pct(reply30s)}</strong> | 5min <strong>${pct(reply5min)}</strong></div>
      <div class="ha-action">→ 响应速度良好，保持在线客服效率</div>`;
  } else {
    replyHtml = `<div class="ha-label"><span class="ha-dot" style="background:#94a3b8"></span>回复率数据</div>
      <div class="ha-metrics">暂无有效回复率数据</div>
      <div class="ha-action">→ 检查美团后台数据同步状态</div>`;
  }

  document.getElementById("heroAnalysis").innerHTML =
    `<div class="ha-item">${cardHtml}</div>
     <div class="ha-item">${reviewHtml}</div>
     <div class="ha-item">${replyHtml}</div>`;
}

function render() {
  document.getElementById("monthLabel").textContent = currentMonth || "-";
  const data = rowsForMonth(currentMonth);
  const prevData = rowsForMonth(previousMonth(currentMonth));
  if (!currentStore || !data.length) {
    document.getElementById("kpiGrid").innerHTML = "";
    document.getElementById("heroAnalysis").innerHTML = "";
    document.getElementById("detailBody").innerHTML = `<tr><td colspan="16" class="empty">该门店在 ${currentMonth || "-"} 暂无数据</td></tr>`;
    Object.values(charts).forEach(chart => chart.dispose());
    charts = {};
    return;
  }

  const t = totals(data);
  const p = totals(prevData);
  renderHeroAnalysis(data, t, prevData);
  document.getElementById("storeSubtitle").textContent = `${currentMonth} | ${data.length} 天 | 总业绩 ${money(t.revenue)}`;
  document.getElementById("kpiGrid").innerHTML = [
    kpiCard("总业绩", money(t.revenue), trend(t.revenue, p.revenue)),
    kpiCard("美团核销", money(t.mt), trend(t.mt, p.mt)),
    kpiCard("抖音核销", money(t.dy), trend(t.dy, p.dy)),
    kpiCard("会员收入", `${money(t.card + t.recharge)}`, `<span>开卡 ${money(t.card)} · 续充 ${money(t.recharge)}</span>`),
  ].join("");

  renderAnalysis(data, t);
  renderCharts(data);
  renderTable(data);
  document.getElementById("updated").textContent = `${currentStore} · ${currentMonth} · ${data.length} 天`;
}

function renderAnalysis(data, t) {
  const total = Math.max(t.revenue, t.mt + t.dy, 1);
  const other = Math.max(total - t.mt - t.dy, 0);
  const mix = document.getElementById("mixTrack");
  mix.style.setProperty("--mt-share", Math.max(t.mt / total * 100, 1) + "fr");
  mix.style.setProperty("--dy-share", Math.max(t.dy / total * 100, 1) + "fr");
  mix.style.setProperty("--other-share", Math.max(other / total * 100, 1) + "fr");
  document.getElementById("mixLegend").innerHTML = [
    `<div class="legend-row"><span><i class="dot" style="background:var(--orange)"></i>美团核销</span><strong>${money(t.mt)} · ${(t.mt / total * 100).toFixed(1)}%</strong></div>`,
    `<div class="legend-row"><span><i class="dot" style="background:var(--cyan)"></i>抖音核销</span><strong>${money(t.dy)} · ${(t.dy / total * 100).toFixed(1)}%</strong></div>`,
    `<div class="legend-row"><span><i class="dot" style="background:var(--teal)"></i>其他收入</span><strong>${money(other)} · ${(other / total * 100).toFixed(1)}%</strong></div>`,
  ].join("");

  document.getElementById("analysisList").innerHTML = [
    `<div class="quality-row"><span>平均评分</span><strong>美团 ${avgBy(data, row => row.美团评分).toFixed(1)} / 抖音 ${avgBy(data, row => row.抖音评分).toFixed(1)}</strong></div>`,
    `<div class="quality-row"><span>美团扫码</span><strong>${fmt(t.mtScan)}</strong></div>`,
    `<div class="quality-row"><span>抖音扫码</span><strong>${fmt(t.dyScan)}</strong></div>`,
  ].join("");
}

function chart(id) {
  if (charts[id]) charts[id].dispose();
  const instance = echarts.init(document.getElementById(id));
  charts[id] = instance;
  return instance;
}

function renderCharts(data) {
  const days = data.map(row => String(row.日期).slice(8));
  chart("revenueChart").setOption({
    ...chartTheme,
    xAxis: { ...chartTheme.xAxis, data: days, boundaryGap: false },
    yAxis: { ...chartTheme.yAxis, axisLabel: { color: "#94a3b8", fontSize: 10, formatter: value => "¥" + fmt(value) } },
    series: [
      { name: "总业绩", type: "line", smooth: true, symbol: "circle", symbolSize: 5, data: data.map(row => row.微矩总业绩 || row.总营业额 || 0),
        lineStyle: { color: "#2563eb", width: 3 }, itemStyle: { color: "#2563eb" },
        areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{ offset: 0, color: "rgba(37,99,235,.24)" }, { offset: 1, color: "rgba(37,99,235,0)" }]) } },
      { name: "美团核销", type: "line", smooth: true, symbol: "none", data: data.map(row => row.美团核销金额 || 0), lineStyle: { color: "#f97316", width: 2, type: "dashed" } },
      { name: "抖音核销", type: "line", smooth: true, symbol: "none", data: data.map(row => row.抖音核销金额 || 0), lineStyle: { color: "#0891b2", width: 2, type: "dashed" } },
    ]
  });

  chart("qualityChart").setOption({
    ...chartTheme,
    xAxis: { ...chartTheme.xAxis, data: days, boundaryGap: false },
    yAxis: [
      { ...chartTheme.yAxis, min: 3.5, max: 5 },
      { ...chartTheme.yAxis, min: 0, axisLabel: { color: "#94a3b8", fontSize: 10 } }
    ],
    series: [
      { name: "美团评分", type: "line", smooth: true, symbolSize: 5, data: data.map(row => row.美团评分 || null), connectNulls: true, lineStyle: { color: "#f97316", width: 2 }, itemStyle: { color: "#f97316" } },
      { name: "抖音评分", type: "line", smooth: true, symbolSize: 5, data: data.map(row => row.抖音评分 || null), connectNulls: true, lineStyle: { color: "#0891b2", width: 2 }, itemStyle: { color: "#0891b2" } },
      { name: "差评", type: "bar", yAxisIndex: 1, data: data.map(row => row.新增差评 || 0), itemStyle: { color: "#dc2626", borderRadius: [4,4,0,0] } },
    ]
  });

  chart("visitChart").setOption({
    ...chartTheme,
    xAxis: { ...chartTheme.xAxis, data: days, boundaryGap: false },
    yAxis: [
      { ...chartTheme.yAxis, axisLabel: { color: "#94a3b8", fontSize: 10 } },
      { ...chartTheme.yAxis, axisLabel: { color: "#94a3b8", fontSize: 10, formatter: value => value + "%" }, splitLine: { show: false } }
    ],
    series: [
      { name: "美团访问", type: "line", smooth: true, symbol: "circle", symbolSize: 4, data: data.map(row => row.美团访问量 || 0), lineStyle: { color: "#f97316", width: 2 }, itemStyle: { color: "#f97316" } },
      { name: "抖音访问", type: "line", smooth: true, symbol: "circle", symbolSize: 4, data: data.map(row => row.抖音访问量 || 0), lineStyle: { color: "#0891b2", width: 2 }, itemStyle: { color: "#0891b2" } },
      { name: "30s回复率", type: "line", smooth: true, symbol: "none", yAxisIndex: 1, data: data.map(row => (row["30s回复率"] || 0) * 100), lineStyle: { color: "#059669", width: 2, type: "dashed" } },
    ]
  });
}

function renderTable(data) {
  document.getElementById("detailBody").innerHTML = data.map(row => {
    const revenue = n(row.微矩总业绩 || row.总营业额);
    const mt = n(row.美团核销金额);
    const dy = n(row.抖音核销金额);
    const mtVisit = n(row.美团访问量);
    const dyVisit = n(row.抖音访问量);
    const mtPerVisit = mtVisit ? mt / mtVisit * 1000 : 0;
    const dyPerVisit = dyVisit ? dy / dyVisit * 1000 : 0;
    const bad = n(row.新增差评);
    return `<tr>
      <td>${String(row.日期).slice(5)}</td>
      <td class="money">${money(revenue)}</td>
      <td>${money(mt)}</td>
      <td>${money(dy)}</td>
      <td>${money(row.微矩开卡 || row.开卡金额)}</td>
      <td>${money(row.微矩续充 || row.续充金额)}</td>
      <td>${fmt(mtVisit)}</td>
      <td>${fmt(dyVisit)}</td>
      <td class="muted">${fmt(n(row.美团扫码))}</td>
      <td class="muted">${fmt(n(row.抖音扫码))}</td>
      <td class="${row["30s回复率"] != null && row["30s回复率"] > 0 && row["30s回复率"] < .5 ? "warn" : ""}">${row["30s回复率"] == null ? "-" : pct(row["30s回复率"])}</td>
      <td>${row.美团评分 ? Number(row.美团评分).toFixed(1) : "-"}</td>
      <td>${row.大众评分 ? Number(row.大众评分).toFixed(1) : "-"}</td>
      <td>${row.抖音评分 ? Number(row.抖音评分).toFixed(1) : "-"}</td>
      <td style="color:var(--green);font-weight:760">${fmt(row.新增好评)}</td>
      <td class="${bad > 0 ? "bad" : ""}">${fmt(bad)}</td>
    </tr>`;
  }).join("");
}

window.addEventListener("resize", () => Object.values(charts).forEach(instance => instance.resize()));
loadData();
