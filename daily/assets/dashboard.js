let allData = [];
let currentDate = "";
let availableDates = [];

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
  document.getElementById("detailBody").innerHTML = `<tr><td colspan="13" class="empty">未能读取 daily_data.json</td></tr>`;
}

function initApp() {
  availableDates = [...new Set(allData.map(row => row.日期).filter(Boolean))].sort().reverse();
  currentDate = availableDates[0] || "";
  const picker = document.getElementById("datePicker");
  picker.value = currentDate;
  picker.min = availableDates[availableDates.length - 1] || "";
  picker.max = availableDates[0] || "";
  renderAll();
}

function navDate(delta) {
  const index = availableDates.indexOf(currentDate);
  const next = index + delta;
  if (next < 0 || next >= availableDates.length) return;
  currentDate = availableDates[next];
  document.getElementById("datePicker").value = currentDate;
  renderAll();
}

function onDateChange(value) {
  currentDate = value;
  renderAll();
}

function resetDate() {
  currentDate = availableDates[0] || "";
  document.getElementById("datePicker").value = currentDate;
  renderAll();
}

function totals(rows) {
  return {
    revenue: sumBy(rows, row => row.微矩总业绩 || row.总营业额),
    mt: sumBy(rows, row => row.美团核销金额),
    dy: sumBy(rows, row => row.抖音核销金额),
    good: sumBy(rows, row => row.新增好评),
    bad: sumBy(rows, row => row.新增差评),
    mtVisit: sumBy(rows, row => row.美团访问量),
    dyVisit: sumBy(rows, row => row.抖音访问量),
  };
}

function buildRows(rows) {
  return rows.map(row => {
    const revenue = n(row.微矩总业绩 || row.总营业额);
    const mt = n(row.美团核销金额);
    const dy = n(row.抖音核销金额);
    const mtVisit = n(row.美团访问量);
    const dyVisit = n(row.抖音访问量);
    return {
      raw: row,
      name: row.门店名称 || "",
      revenue,
      mt,
      dy,
      mtVisit,
      dyVisit,
      mtPerVisit: mtVisit ? mt / mtVisit * 1000 : 0,
      dyPerVisit: dyVisit ? dy / dyVisit * 1000 : 0,
      mtScan: n(row.美团扫码),
      dyScan: n(row.抖音扫码),
      reply30: row["30s回复率"],
      reply5min: row["5min回复率"],
      mtScore: n(row.美团评分),
      dzdpScore: n(row.大众评分),
      dyScore: n(row.抖音评分),
      good: n(row.新增好评),
      bad: n(row.新增差评),
      mtGap: n(row.美团核销差额),
      dyGap: n(row.抖音核销差额),
    };
  });
}

function trend(now, prev, lowerIsGood = false) {
  if (!prev) return `<span class="delta flat">无对比</span><span>前一日为空</span>`;
  const diff = now - prev;
  const cls = Math.abs(diff) < 0.01 ? "flat" : lowerIsGood ? (diff <= 0 ? "up" : "down") : (diff >= 0 ? "up" : "down");
  return `<span class="delta ${cls}">${diff > 0 ? "+" : ""}${fmt(diff)}</span><span>较前一日</span>`;
}

function kpiCard(label, value, foot, accent, chip = "") {
  return `<article class="card kpi-card" style="--accent:${accent}">
    <div class="label-row"><span>${label}</span>${chip ? `<span class="chip">${chip}</span>` : ""}</div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-foot">${foot}</div>
  </article>`;
}

function renderAll() {
  const dayData = allData.filter(row => row.日期 === currentDate);
  const prevDate = availableDates[availableDates.indexOf(currentDate) + 1];
  const prevData = prevDate ? allData.filter(row => row.日期 === prevDate) : [];
  if (!dayData.length) {
    document.getElementById("detailBody").innerHTML = `<tr><td colspan="13" class="empty">该日期暂无数据</td></tr>`;
    return;
  }
  const t = totals(dayData);
  const p = totals(prevData);
  const rows = buildRows(dayData);
  const storeCount = new Set(dayData.map(row => row.门店名称)).size;
  const health = calcHealth(rows, t);

  document.getElementById("heroSubtitle").textContent = `${currentDate} | ${storeCount} 家门店 | 今日总业绩 ${money(t.revenue)}`;
  document.getElementById("heroStats").innerHTML = [
    `<div class="hero-stat"><span>门店数</span><strong>${storeCount}</strong></div>`,
    `<div class="hero-stat"><span>美团 + 抖音</span><strong>${money(t.mt + t.dy)}</strong></div>`,
    `<div class="hero-stat"><span>好评 / 差评</span><strong>${fmt(t.good)} / ${fmt(t.bad)}</strong></div>`,
    `<div class="hero-stat"><span>经营健康度</span><strong>${health.score}</strong></div>`,
  ].join("");

  document.getElementById("kpiGrid").innerHTML = [
    kpiCard("总业绩", money(t.revenue), trend(t.revenue, p.revenue), "var(--brand)", "总盘"),
    kpiCard("美团核销", money(t.mt), trend(t.mt, p.mt), "var(--orange)", "平台"),
    kpiCard("抖音核销", money(t.dy), trend(t.dy, p.dy), "var(--cyan)", "平台"),
    kpiCard("新增好评", fmt(t.good), trend(t.good, p.good), "var(--green)", "口碑"),
    kpiCard("新增差评", fmt(t.bad), trend(t.bad, p.bad, true), "var(--red)", "风险"),
  ].join("");

  renderAlerts(rows, prevData);
  renderTrendChart();
  renderTable(rows);
  document.getElementById("updated").textContent = `数据日期：${currentDate} | 门店数：${storeCount}`;
}

function calcHealth(rows, t) {
  const badPenalty = Math.min(t.bad * 8, 28);
  const lowReplyPenalty = rows.filter(r => r.reply30 != null && n(r.reply30) > 0 && n(r.reply30) < .5).length * 5;
  const lowScorePenalty = rows.filter(r => (r.mtScore && r.mtScore < 4.5) || (r.dyScore && r.dyScore < 4.5)).length * 3;
  const zeroRevenuePenalty = rows.filter(r => r.revenue <= 0).length * 2;
  const score = Math.max(0, Math.round(100 - badPenalty - lowReplyPenalty - lowScorePenalty - zeroRevenuePenalty));
  return { score, color: score >= 82 ? "var(--green)" : score >= 68 ? "var(--amber)" : "var(--red)" };
}

function renderAlerts(rows, prevData) {
  const badStores = rows.filter(row => row.bad > 0);
  const lowReply = rows.filter(row => row.reply30 != null && n(row.reply30) > 0 && n(row.reply30) < .5);
  const gapStores = rows.filter(row => Math.abs(row.mtGap) >= 100 || Math.abs(row.dyGap) >= 100);
  const lowEfficiency = rows.filter(row => (row.mtVisit > 30 && row.mtPerVisit < 80) || (row.dyVisit > 30 && row.dyPerVisit < 80));
  const scoreDropStores = [];
  if (prevData.length) {
    const prevMap = new Map(prevData.map(r => [r.门店名称, r]));
    for (const row of rows) {
      if (!row.name) continue;
      const prev = prevMap.get(row.raw.门店名称);
      if (!prev) continue;
      const drops = [];
      if (n(row.mtScore) && n(prev.美团评分) && n(row.mtScore) < n(prev.美团评分)) drops.push(`美团${n(prev.美团评分).toFixed(1)}→${n(row.mtScore).toFixed(1)}`);
      if (n(row.dzdpScore) && n(prev.大众评分) && n(row.dzdpScore) < n(prev.大众评分)) drops.push(`大众${n(prev.大众评分).toFixed(1)}→${n(row.dzdpScore).toFixed(1)}`);
      if (n(row.dyScore) && n(prev.抖音评分) && n(row.dyScore) < n(prev.抖音评分)) drops.push(`抖音${n(prev.抖音评分).toFixed(1)}→${n(row.dyScore).toFixed(1)}`);
      if (drops.length) scoreDropStores.push({ name: row.name, drops });
    }
  }
  const items = [
    { title: "新增差评", desc: badStores.slice(0, 4).map(row => `${row.name} ${fmt(row.bad)}条`).join("、") || "无", count: badStores.length, bad: true },
    { title: "评分下降", desc: scoreDropStores.slice(0, 4).map(s => `${s.name}(${s.drops.join(",")})`).join("、") || "无", count: scoreDropStores.length, bad: true },
    { title: "30s回复率低", desc: lowReply.slice(0, 4).map(row => `${row.name} ${pct(row.reply30)}`).join("、") || "无", count: lowReply.length },
    { title: "核销差额异常", desc: gapStores.slice(0, 4).map(row => row.name).join("、") || "无", count: gapStores.length },
    { title: "访问转化偏低", desc: lowEfficiency.slice(0, 4).map(row => row.name).join("、") || "无", count: lowEfficiency.length },
  ];
  document.getElementById("alertList").innerHTML = items.map(item => `<div class="alert ${item.bad ? "bad" : ""}">
    <span class="mark"></span>
    <div><h3>${item.title}</h3><p>${item.desc}</p></div>
    <span class="alert-count">${item.count}</span>
  </div>`).join("");
}

function renderTable(rows) {
  const keyword = document.getElementById("storeSearch").value.trim();
  const sort = document.getElementById("sortSelect").value;
  let visible = keyword ? rows.filter(row => row.name.includes(keyword)) : rows;
  const sorters = {
    revenue: (a, b) => b.revenue - a.revenue,
    mt: (a, b) => b.mt - a.mt,
    dy: (a, b) => b.dy - a.dy,
    bad: (a, b) => b.bad - a.bad,
    reply: (a, b) => n(a.reply30) - n(b.reply30),
  };
  visible = [...visible].sort(sorters[sort] || sorters.revenue);
  if (!visible.length) {
    document.getElementById("detailBody").innerHTML = `<tr><td colspan="13" class="empty">没有匹配门店</td></tr>`;
    return;
  }
  document.getElementById("detailBody").innerHTML = visible.map((row, index) => `<tr>
    <td class="muted">${index + 1}</td>
    <td><a class="store-link" href="store.html?store=${encodeURIComponent(row.name)}&month=${currentDate.slice(0, 7)}">${row.name}</a></td>
    <td class="money">${money(row.revenue)}</td>
    <td>${money(row.mt)}</td>
    <td>${money(row.dy)}</td>

    <td class="muted">${fmt(row.mtVisit)}</td>
    <td class="muted">${fmt(row.dyVisit)}</td>
    <td class="muted">${fmt(row.mtScan)}</td>
    <td class="muted">${fmt(row.dyScan)}</td>
    <td class="${row.reply30 != null && row.reply30 > 0 && row.reply30 < .5 ? "reply-low" : ""}">${row.reply30 == null ? "-" : pct(row.reply30)}</td>
    <td class="${row.reply5min != null && row.reply5min > 0 && row.reply5min < .5 ? "reply-low" : ""}">${row.reply5min == null ? "-" : pct(row.reply5min)}</td>
    <td style="color:var(--green);font-weight:760">${fmt(row.good)}</td>
    <td class="${row.bad > 0 ? "bad-cell" : ""}">${fmt(row.bad)}</td>
  </tr>`).join("");
}

// === Dark mode ===
function toggleDark() {
  const on = document.documentElement.classList.toggle("dark");
  document.getElementById("themeBtn").textContent = on ? "☀️" : "🌙";
  try { localStorage.setItem("dark", on ? "1" : "0"); } catch(_) {}
  if (trendInstance) trendInstance.resize();
}
(function initTheme() {
  try {
    if (localStorage.getItem("dark") === "1") {
      document.documentElement.classList.add("dark");
      document.getElementById("themeBtn").textContent = "☀️";
    }
  } catch(_) {}
})();

// === Trend chart ===
let trendInstance = null;
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

function renderTrendChart() {
  const el = document.getElementById("trendChart");
  if (!el) return;
  if (trendInstance) trendInstance.dispose();
  trendInstance = echarts.init(el);

  const idx = availableDates.indexOf(currentDate);
  const recentDates = availableDates.slice(Math.max(idx, 0), Math.max(idx, 0) + 7).reverse();

  const revenue = [], mtArr = [], dyArr = [], mtVisit = [], dyVisit = [];
  for (const d of recentDates) {
    const dayRows = allData.filter(row => row.日期 === d);
    revenue.push(sumBy(dayRows, row => row.微矩总业绩 || row.总营业额));
    mtArr.push(sumBy(dayRows, row => row.美团核销金额));
    dyArr.push(sumBy(dayRows, row => row.抖音核销金额));
    mtVisit.push(sumBy(dayRows, row => row.美团访问量));
    dyVisit.push(sumBy(dayRows, row => row.抖音访问量));
  }

  trendInstance.setOption({
    ...chartTheme,
    legend: { ...chartTheme.legend, data: ["总业绩", "美团核销", "抖音核销", "美团访问量", "抖音访问量"] },
    xAxis: { ...chartTheme.xAxis, data: recentDates.map(d => d.slice(5)), boundaryGap: false },
    yAxis: [
      { ...chartTheme.yAxis, axisLabel: { color: "#94a3b8", fontSize: 10, formatter: v => "¥" + fmt(v) } },
      { ...chartTheme.yAxis, axisLabel: { color: "#94a3b8", fontSize: 10, formatter: v => fmt(v) + "次" } },
    ],
    series: [
      { name: "总业绩", type: "line", yAxisIndex: 0, smooth: true, symbol: "circle", symbolSize: 6, data: revenue,
        lineStyle: { color: "#2563eb", width: 3 }, itemStyle: { color: "#2563eb" },
        areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{ offset: 0, color: "rgba(37,99,235,.22)" }, { offset: 1, color: "rgba(37,99,235,0)" }]) } },
      { name: "美团核销", type: "line", yAxisIndex: 0, smooth: true, symbol: "none", data: mtArr, lineStyle: { color: "#f97316", width: 2, type: "dashed" } },
      { name: "抖音核销", type: "line", yAxisIndex: 0, smooth: true, symbol: "none", data: dyArr, lineStyle: { color: "#0891b2", width: 2, type: "dashed" } },
      { name: "美团访问量", type: "bar", yAxisIndex: 1, data: mtVisit, barWidth: 12, itemStyle: { color: "rgba(249,115,22,.28)", borderRadius: [4,4,0,0] } },
      { name: "抖音访问量", type: "bar", yAxisIndex: 1, data: dyVisit, barWidth: 12, itemStyle: { color: "rgba(8,145,178,.28)", borderRadius: [4,4,0,0] } },
    ]
  });
}

window.addEventListener("resize", () => { if (trendInstance) trendInstance.resize(); });

loadData();
