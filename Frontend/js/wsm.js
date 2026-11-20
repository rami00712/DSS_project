/* ============================================================
   wsm.js — Weighted Sum Model presentation logic (frontend demo)
   ------------------------------------------------------------
   The PHP backend is authoritative for production calculations.
   This module only reproduces WSM so the prototype can display
   raw, normalized, weighted and final scores consistently.

   Maximization: r = score / max(score across alternatives)
   Minimization: r = min(score across alternatives) / score
   Weighted:     w = r * criterionWeight
   Final:        S = sum(w)
   Ties:         alternatives within EPS of the highest S share rank 1
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const EPS = 1e-9;

  function safeNumber(value, fallback) {
    const n = Number(value);
    return isFinite(n) ? n : (fallback || 0);
  }

  function compute(evaluation, criteria, specializations) {
    const critical = criteria.slice();
    const alts = specializations.filter(function (s) { return evaluation.scores && evaluation.scores[s.id]; });

    const extrema = {};
    critical.forEach(function (c) {
      const values = alts.map(function (a) { return safeNumber(evaluation.scores[a.id][c.id], 0); });
      extrema[c.id] = {
        max: Math.max.apply(null, values.concat([0])),
        min: Math.min.apply(null, values.concat([DSS.config.scoreMax]))
      };
    });

    const rows = alts.map(function (alt) {
      const raw = {}, normalized = {}, weighted = {};
      let final = 0;
      critical.forEach(function (c) {
        const value = safeNumber(evaluation.scores[alt.id][c.id], 0);
        raw[c.id] = value;
        let norm = 0;
        if (c.type === "minimize") {
          const min = extrema[c.id].min;
          norm = value > 0 ? min / value : (min === 0 ? 1 : 0);
        } else {
          const max = extrema[c.id].max;
          norm = max > 0 ? value / max : 0;
        }
        norm = DSS.clamp(norm, 0, 1);
        normalized[c.id] = norm;
        weighted[c.id] = norm * safeNumber(c.weight, 0);
        final += weighted[c.id];
      });
      return {
        id: alt.id, code: alt.code || alt.id, name: alt.name, icon: alt.icon, color: alt.color,
        raw: raw, normalized: normalized, weighted: weighted, final: DSS.round(final, 6)
      };
    });

    rows.sort(function (a, b) { return b.final - a.final || String(a.code).localeCompare(String(b.code)); });

    const highest = rows.length ? rows[0].final : 0;
    const topRows = rows.filter(function (r) { return Math.abs(r.final - highest) < Math.max(EPS, 1e-6); });
    const hasTie = topRows.length > 1;

    rows.forEach(function (r, index) {
      r.rank = hasTie && Math.abs(r.final - highest) < Math.max(EPS, 1e-6) ? 1 : index + 1;
      r.isTied = hasTie && r.rank === 1;
      r.isWinner = !hasTie && r.rank === 1;
      r.percent = DSS.round(r.final * 100, 2);
    });

    return {
      method: "WSM",
      methodLabel: DSS.config.decisionMethod,
      evaluationId: evaluation.id,
      evaluationLabel: evaluation.label || "Evaluation",
      studentId: evaluation.studentId,
      criteria: critical,
      rows: rows,
      ranking: rows,
      best: rows[0] || null,
      tie: {
        hasTie: hasTie,
        ids: topRows.map(function (r) { return r.id; }),
        names: topRows.map(function (r) { return r.name; }),
        message: hasTie
          ? "Tie detected: " + topRows.length + " alternatives share the highest score (" +
            DSS.formatNumber(highest * 100, 2) + "/100). No unique recommendation can be issued."
          : "No tie detected — a single highest-scoring alternative exists."
      },
      recommendation: {
        unique: !hasTie,
        id: hasTie ? null : (rows[0] && rows[0].id),
        name: hasTie ? null : (rows[0] && rows[0].name),
        ids: topRows.map(function (r) { return r.id; }),
        names: topRows.map(function (r) { return r.name; })
      }
    };
  }

  /** Average final scores across evaluations for dashboard-level insights. */
  function aggregate(evaluations, criteria, specializations) {
    const totals = {}, counts = {};
    specializations.forEach(function (s) { totals[s.id] = 0; counts[s.id] = 0; });
    evaluations.forEach(function (e) {
      const result = compute(e, criteria, specializations);
      result.rows.forEach(function (r) {
        if (totals[r.id] !== undefined) { totals[r.id] += r.final; counts[r.id] += 1; }
      });
    });
    const rows = specializations.map(function (s) {
      const avg = counts[s.id] ? totals[s.id] / counts[s.id] : 0;
      return Object.assign({}, s, { final: DSS.round(avg, 6), percent: DSS.round(avg * 100, 2) });
    }).sort(function (a, b) { return b.final - a.final; });
    const highest = rows.length ? rows[0].final : 0;
    const tied = rows.filter(function (r) { return Math.abs(r.final - highest) < 1e-6; });
    return { rows: rows, best: rows[0] || null, hasTie: tied.length > 1, tiedIds: tied.map(function (r) { return r.id; }) };
  }

  DSS.wsm = { compute: compute, aggregate: aggregate };
})(window);
