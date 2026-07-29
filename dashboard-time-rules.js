(function initDashboardTimeRules(root, factory) {
  const rules = factory();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  else root.DashboardTimeRules = rules;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createDashboardTimeRules() {
  function sortedDates(values = []) {
    return [...new Set(values.filter(Boolean))].sort();
  }

  function recentDates(dates, end, count) {
    const endIndex = dates.indexOf(end);
    return endIndex >= 0
      ? dates.slice(Math.max(0, endIndex - count + 1), endIndex + 1)
      : [];
  }

  function presetDates(dates, grain, preset) {
    const latest = dates[dates.length - 1] || '';
    if (!latest) return [];
    if (preset === 'latestMonth') return [latest];
    if (preset === 'latestQuarter') return dates.slice(grain === 'daily' ? -7 : -3);
    if (preset === 'ytd') {
      const prefix = grain === 'daily' ? latest.substring(0, 7) : latest.substring(0, 4);
      return dates.filter((date) => date.startsWith(prefix));
    }
    if (preset === 'all') return dates;
    return null;
  }

  function manualDates(dates, grain, period, controls = {}) {
    if (period === 'day') {
      const date = controls.day || dates[dates.length - 1];
      return date ? dates.filter((value) => value === date) : [];
    }
    if (period === 'week') {
      const end = controls.weekEnd || dates[dates.length - 1];
      return recentDates(dates, end, 7);
    }
    if (period === 'month') {
      const month = controls.month || '';
      if (!month) return [];
      return grain === 'daily'
        ? dates.filter((date) => date.startsWith(month.substring(0, 7)))
        : dates.filter((date) => date === month);
    }
    if (period === 'quarter') {
      const months = {
        Q1: ['01', '02', '03'],
        Q2: ['04', '05', '06'],
        Q3: ['07', '08', '09'],
        Q4: ['10', '11', '12'],
      }[controls.quarter] || [];
      return dates.filter((date) =>
        date.startsWith(`${controls.year}-`) && months.includes(date.substring(5, 7))
      );
    }
    if (period === 'year') {
      return controls.year ? dates.filter((date) => date.startsWith(controls.year)) : [];
    }
    if (period === 'range') {
      return controls.from && controls.to
        ? dates.filter((date) => date >= controls.from && date <= controls.to)
        : dates;
    }
    return dates;
  }

  function resolveTimeSelection({
    grain,
    period,
    availableDates,
    preset = null,
    controls = {},
  }) {
    const dates = sortedDates(availableDates);
    const presetRange = preset ? presetDates(dates, grain, preset) : null;
    const rangeDates = presetRange || manualDates(dates, grain, period, controls);
    let trendDates = rangeDates;

    if (grain === 'daily' && period === 'day' && rangeDates.length === 1) {
      trendDates = recentDates(dates, rangeDates[0], 7);
    } else if (grain === 'monthly' && period === 'month' && rangeDates.length === 1) {
      const year = rangeDates[0].substring(0, 4);
      const yearDates = dates.filter((date) => date.startsWith(`${year}-`));
      trendDates = yearDates.length > 1 ? yearDates : rangeDates;
    }

    return Object.freeze({
      controls: Object.freeze({ ...controls }),
      grain,
      period,
      preset,
      rangeDates: Object.freeze([...rangeDates]),
      trendDates: Object.freeze([...trendDates]),
    });
  }

  function shiftIsoDays(date, offset) {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  }

  function shiftIsoMonths(date, offset) {
    const [year, month, day] = date.split('-').map(Number);
    const target = new Date(Date.UTC(year, month - 1 + offset, 1, 12));
    const lastDay = new Date(Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth() + 1,
      0,
      12,
    )).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target.toISOString().slice(0, 10);
  }

  function shiftIsoYears(date, offset) {
    return shiftIsoMonths(date, offset * 12);
  }

  function monthSpan(dates) {
    const first = dates[0];
    const last = dates[dates.length - 1];
    return ((Number(last.slice(0, 4)) - Number(first.slice(0, 4))) * 12)
      + Number(last.slice(5, 7)) - Number(first.slice(5, 7)) + 1;
  }

  function daySpan(dates) {
    const first = new Date(`${dates[0]}T12:00:00Z`);
    const last = new Date(`${dates[dates.length - 1]}T12:00:00Z`);
    return Math.round((last - first) / 86400000) + 1;
  }

  function resolveComparisonSelection({
    grain,
    period,
    preset = null,
    rangeDates = [],
  }) {
    const dates = sortedDates(rangeDates);
    if (!dates.length || preset === 'all') {
      return Object.freeze({
        previousDates: Object.freeze([]),
        previousYearDates: Object.freeze([]),
      });
    }

    let previousDates;
    if (grain === 'monthly') {
      const offset = period === 'quarter' || preset === 'latestQuarter'
        ? -3
        : period === 'year' || preset === 'ytd'
          ? -12
          : period === 'range'
            ? -monthSpan(dates)
            : -1;
      previousDates = dates.map(date => shiftIsoMonths(date, offset));
    } else {
      if (preset === 'ytd') {
        previousDates = dates.map(date => shiftIsoMonths(date, -1));
      } else {
        const offset = period === 'week' || preset === 'latestQuarter'
          ? -7
          : period === 'range'
            ? -daySpan(dates)
            : -1;
        previousDates = dates.map(date => shiftIsoDays(date, offset));
      }
    }

    return Object.freeze({
      previousDates: Object.freeze(sortedDates(previousDates)),
      previousYearDates: Object.freeze(sortedDates(dates.map(date => shiftIsoYears(date, -1)))),
    });
  }

  return Object.freeze({ resolveComparisonSelection, resolveTimeSelection });
}));
