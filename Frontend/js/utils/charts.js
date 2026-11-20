/* ============================================================
   charts.js — Lightweight dependency-free SVG/CSS charts
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const esc = DSS.escape;

  const PALETTE = ["#2563eb", "#7c3aed", "#0891b2", "#ea580c", "#059669", "#db2777"];

  function bars(data, options) {
    const opts = options || {};
    const max = opts.max || Math.max.apply(null, data.map(function (d) { return Math.abs(Number(d.value) || 0); }).concat([1]));
    const showLegend = opts.legend !== false;
    const html = data.map(function (d, i) {
      const value = Number(d.value) || 0;
      const pct = DSS.clamp((Math.abs(value) / max) * 100, 0, 100);
      const color = d.color || PALETTE[i % PALETTE.length];
      const display = d.display !== undefined ? d.display : DSS.formatNumber(value, opts.digits === undefined ? 2 : opts.digits);
      return '<div class="chart-bar">' +
        '<div class="chart-bar__top"><span>' + esc(d.label) + "</span><span>" + esc(display) + "</span></div>" +
        '<div class="chart-bar__track"><div class="chart-bar__fill" style="width:' + pct.toFixed(2) + "%;background:" + esc(color) + '"></div></div>' +
        "</div>";
    }).join("");
    const legend = showLegend ? '<div class="chart-legend">' + data.map(function (d, i) {
      return '<span class="chart-legend__item"><span class="chart-legend__swatch" style="background:' +
        esc(d.color || PALETTE[i % PALETTE.length]) + '"></span>' + esc(d.label) + "</span>";
    }).join("") + "</div>" : "";
    return '<div class="chart-bars">' + html + "</div>" + legend;
  }

  function donut(segments, centerValue, centerLabel) {
    const total = segments.reduce(function (sum, s) { return sum + (Number(s.value) || 0); }, 0) || 1;
    const radius = 58, circumference = 2 * Math.PI * radius;
    let offset = 0;
    const circles = segments.map(function (s, i) {
      const frac = (Number(s.value) || 0) / total;
      const len = frac * circumference;
      const color = s.color || PALETTE[i % PALETTE.length];
      const dash = len + " " + (circumference - len);
      const markup = '<circle cx="80" cy="80" r="' + radius + '" stroke="' + esc(color) +
        '" stroke-dasharray="' + dash + '" stroke-dashoffset="' + (-offset).toFixed(3) + '"><title>' +
        esc(s.label) + ": " + DSS.formatNumber(frac * 100, 1) + "%</title></circle>";
      offset += len;
      return markup;
    }).join("");
    return '<div class="donut-wrap"><div class="donut">' +
      '<svg viewBox="0 0 160 160" role="img" aria-label="Distribution chart">' + circles + "</svg>" +
      '<div class="donut__center"><strong>' + esc(centerValue) + "</strong><small>" + esc(centerLabel) + "</small></div>" +
      "</div><div class=\"chart-legend\">" + segments.map(function (s, i) {
        return '<span class="chart-legend__item"><span class="chart-legend__swatch" style="background:' +
          esc(s.color || PALETTE[i % PALETTE.length]) + '"></span>' + esc(s.label) + "</span>";
      }).join("") + "</div></div>";
  }

  function sparkline(values, color) {
    const max = Math.max.apply(null, values.concat([1]));
    return '<div class="mini-spark">' + values.map(function (v) {
      return '<span style="height:' + DSS.clamp((v / max) * 100, 8, 100) + "%;background:" + esc(color || "#bfdbfe") + '"></span>';
    }).join("") + "</div>";
  }

  DSS.Charts = { bars: bars, donut: donut, sparkline: sparkline, palette: PALETTE };
})(window);
