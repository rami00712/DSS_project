/* ============================================================
   views/results.js — WSM results, ranking, ties and breakdown
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const esc = DSS.escape;

  let cache = { evaluations: [], students: [] };
  let selectedId = null;
  let result = null;
  let containerRef = null;

  function isComplete(ev) {
    if (!ev || !ev.scores) return false;
    const specs = DSS.mockData.specializations;
    return specs.every(function (s) {
      return ev.scores[s.id] && Object.keys(ev.scores[s.id]).length > 0;
    });
  }

  function sanitizeId(requested) {
    if (requested && cache.evaluations.some(function (e) { return e.id === requested; })) return requested;
    const saved = cache.evaluations.filter(function (e) { return e.status === "saved" && isComplete(e); })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    return saved.length ? saved[0].id : (cache.evaluations[0] || {}).id || null;
  }

  function recommendationHtml() {
    if (!result) return "";
    const tie = result.tie.hasTie;
    const names = result.recommendation.names || [];
    const title = tie ? "Tied recommendation" : "Recommended specialization";
    const body = tie
      ? "<strong>" + names.map(esc).join(" <span class=\"muted\">and</span> ") + "</strong> share the highest WSM score. " +
        "Because the top scores are equal, the system does <strong>not</strong> declare a unique winner."
      : "<strong>" + esc(result.recommendation.name) + "</strong> has the highest WSM score (" +
        DSS.formatNumber(result.best.final * 100, 2) + " / 100) for this evaluation.";
    return '<div class="winner-banner ' + (tie ? "is-tie" : "") + '">' +
      '<span class="winner-banner__icon">' + DSS.icon(tie ? "scale" : "award") + "</span>" +
      "<div><h3>" + title + "</h3><p>" + body + "</p>" +
      '<div class="card__subtitle mt-1">' + esc(result.tie.message) + "</div></div></div>";
  }

  function rankingHtml() {
    const max = result.rows.length ? Math.max.apply(null, result.rows.map(function (r) { return r.final; }).concat([0.0001])) : 1;
    if (!result.rows.length) return DSS.ui.emptyState({ icon: "chart", title: "No ranking", message: "No alternatives to rank." });
    return result.rows.map(function (r, i) {
      const status = r.isWinner ? '<span class="badge badge--green">' + DSS.icon("award") + "Recommended</span>"
        : r.isTied ? '<span class="badge badge--amber">' + DSS.icon("scale") + "Tied 1st</span>"
          : '<span class="badge badge--gray">Rank ' + r.rank + "</span>";
      return '<div class="rank-row ' + (r.isWinner ? "is-winner" : r.isTied ? "is-tied" : "") + '">' +
        '<span class="rank-medal rank-medal--' + (r.rank <= 3 ? r.rank : "") + '">' + (r.rank === 1 && (r.isWinner || r.isTied) ? "1" : i + 1) + "</span>" +
        '<span class="card__icon" style="background:' + esc(r.color || "#2563eb") + '18;color:' + esc(r.color || "#2563eb") + '">' +
        DSS.icon(r.icon || "layers") + "</span>" +
        '<div class="rank-row__info"><div class="rank-row__name">' + esc(r.code) + " · " + esc(r.name) + "</div>" +
        '<div class="rank-row__meta">Final WSM score · ' + DSS.formatNumber(r.final, 4) + "</div></div>" +
        status +
        '<div class="rank-row__bar"><div class="weight-progress"><span style="width:' + DSS.clamp((r.final / max) * 100, 0, 100).toFixed(1) + '%;background:' +
        esc(r.color || "#2563eb") + '"></span></div></div>' +
        '<div class="rank-row__score">' + DSS.formatNumber(r.percent, 2) + "</div></div>";
    }).join("");
  }

  function breakdownHtml() {
    if (!result) return "";
    const criteria = result.criteria;
    return '<div class="matrix-scroll"><table class="matrix-table wsm-table"><thead><tr>' +
      "<th>Alternative / Criterion</th><th>Raw score<br><span class=\"muted\">1–10</span></th>" +
      "<th>Normalized<br><span class=\"muted\">0–1</span></th><th>Weight<br><span class=\"muted\">sum = 1.00</span></th>" +
      "<th>Weighted score<br><span class=\"muted\">norm × weight</span></th></tr></thead><tbody>" +
      result.rows.map(function (r) {
        const header = '<tr class="row-final"><td colspan="4">' + esc(r.code) + " · " + esc(r.name) +
          " — rank " + r.rank + "</td><td>" + DSS.formatNumber(r.final, 4) + "</td></tr>";
        const rows = criteria.map(function (c) {
          const isMin = c.type === "minimize";
          return "<tr><td>" + esc(c.code || c.id) + " · " + esc(c.name) +
            ' <span class="badge ' + (isMin ? "badge--amber" : "badge--green") + '" style="margin-left:6px">' +
            (isMin ? "min" : "max") + "</span></td>" +
            "<td>" + DSS.formatNumber(r.raw[c.id], 1) + " / 10</td>" +
            '<td class="' + (isMin ? "num-warn" : "num-good") + '">' + DSS.formatNumber(r.normalized[c.id], 4) + "</td>" +
            "<td>" + DSS.formatNumber(c.weight, 2) + "</td>" +
            "<td><strong>" + DSS.formatNumber(r.weighted[c.id], 4) + "</strong></td></tr>";
        }).join("");
        return header + rows;
      }).join("") + "</tbody></table></div>";
  }

  async function load(id) {
    DSS.dom.loading(true, "Computing WSM results…");
    try {
      selectedId = sanitizeId(id);
      if (!selectedId) throw new Error("No evaluations available. Save an evaluation first.");
      result = await DSS.data.results.compute(selectedId);
      result.source = (result.source === "api") ? "api" : "mock";
      await render(containerRef);
    } catch (error) {
      DSS.notify.error(error.message, "Could not load results");
      if (containerRef) containerRef.innerHTML = DSS.ui.errorState(error.message) +
        '<div class="mt-4"><button class="btn btn--primary" data-action="goto-evaluation">' + DSS.icon("clipboard") + "Go to evaluation</button></div>";
    } finally { DSS.dom.loading(false); }
  }

  async function render(container) {
    containerRef = container;
    if (!cache.evaluations.length) {
      const [evaluations, students] = await Promise.all([DSS.data.evaluations.list(), DSS.data.students.list()]);
      cache = { evaluations: evaluations, students: students };
    }
    if (!selectedId) selectedId = sanitizeId(null);
    if (!result) {
      if (!selectedId) {
        container.innerHTML = DSS.ui.pageHead({ title: "Results & Ranking", subtitle: "WSM analysis", breadcrumb: "Results & Ranking" }) +
          DSS.ui.emptyState({ icon: "chart", title: "No results yet", message: "Complete an evaluation to generate a WSM ranking.", action: '<button class="btn btn--primary" data-action="goto-evaluation">Start evaluation</button>' });
        DSS.dom.on(container, "click", "[data-action]", function (e, btn) { if (btn.getAttribute("data-action") === "goto-evaluation") DSS.router.navigate("evaluation"); });
        return;
      }
      result = await DSS.data.results.compute(selectedId);
      result.source = (result.source === "api") ? "api" : "mock";
    }

    const evaluation = cache.evaluations.find(function (e) { return e.id === selectedId; });
    const student = cache.students.find(function (s) { return s.id === evaluation.studentId; });
    const chart = result.rows.length ? DSS.Charts.bars(result.rows.map(function (r, i) {
      return { label: r.code + " · " + r.name, value: r.percent, color: r.color || DSS.Charts.palette[i % 4], display: DSS.formatNumber(r.percent, 2) + " / 100" };
    }), { max: 100, legend: false }) : "";

    const criteriaList = result.criteria.map(function (c) {
      return '<div class="eval-meta__row"><span>' + esc(c.name) + "</span><strong>" + DSS.formatNumber(c.weight, 2) +
        " · " + (c.type === "minimize" ? "Min" : "Max") + "</strong></div>";
    }).join("");

    container.innerHTML =
      DSS.ui.pageHead({
        title: "Results & Ranking",
        subtitle: "Weighted Sum Model analysis — sorted by final score",
        breadcrumb: "Results & Ranking",
        actions: [
          '<button class="btn btn--secondary" data-action="refresh">' + DSS.icon("refresh") + "Recalculate</button>",
          '<button class="btn btn--primary" data-action="goto-evaluation">' + DSS.icon("plus") + "New evaluation</button>"
        ].join("")
      }) +
      '<div class="info-strip mb-4"><div class="info-strip__left">' + DSS.icon("info") +
      "<span><strong>Sample calculation.</strong> Values below are computed locally for demonstration. The PHP backend will provide the authoritative results.</span></div>" +
      '<span class="badge badge--blue">' + esc(DSS.config.decisionMethod) + "</span></div>" +

      '<section class="card mb-4"><div class="toolbar"><div class="flex flex-wrap items-center gap-3">' +
      '<div class="field" style="min-width:260px"><label class="field__label" for="resultEvalSelect">Evaluation</label>' +
      '<select class="select" id="resultEvalSelect">' + cache.evaluations.map(function (ev) {
        return '<option value="' + esc(ev.id) + '"' + (ev.id === selectedId ? " selected" : "") + ">" +
          esc(ev.label + " · " + DSS.formatDate(ev.createdAt)) + "</option>";
      }).join("") + "</select></div>" +
      '<div class="kpi-inline" style="flex:1"><div class="kpi-inline__item"><small>Student</small><strong style="font-size:13px">' +
      esc(student ? student.fullName : (evaluation ? evaluation.studentId : "—")) + "</strong></div>" +
      '<div class="kpi-inline__item"><small>Saved</small><strong style="font-size:12px">' + DSS.formatDateTime(evaluation && evaluation.createdAt) + "</strong></div>" +
      '<div class="kpi-inline__item"><small>Source</small><strong style="font-size:12px">' +
      (result.source === "mock" ? "Local sample" : "API") + "</strong></div></div></div></div></section>" +

      '<div class="mb-4">' + recommendationHtml() + "</div>" +

      '<div class="grid grid--2 mb-4">' +
      '<section class="card">' + DSS.ui.cardHead("Overall ranking", "Alternatives sorted by final WSM score (descending)") +
      '<div class="card__body card__body--tight">' + rankingHtml() + "</div></section>" +
      '<section class="card">' + DSS.ui.cardHead("Score comparison", "Final scores on a 0–100 scale") +
      '<div class="card__body">' + chart + "</div></section></div>" +

      '<section class="card mb-4">' + DSS.ui.cardHead("WSM calculation breakdown", "Raw → normalized → weighted → final") +
      '<div class="card__body">' + breakdownHtml() +
      '<div class="note note--gray mt-4">' + DSS.icon("calculator") +
      "<div><strong>Normalization rule:</strong> maximize criteria use score ÷ best score; Difficulty (minimize) uses lowest score ÷ score. " +
      "Each normalized value is multiplied by its weight and summed for the final score.</div></div></div></section>" +

      '<div class="grid grid--2">' +
      '<section class="card">' + DSS.ui.cardHead("Criterion weights") + '<div class="card__body"><div class="eval-meta">' +
      criteriaList + "</div></div></section>" +
      '<section class="card">' + DSS.ui.cardHead("Tie information", "Never declares a unique winner on a tie") +
      '<div class="card__body">' +
      (result.tie.hasTie
        ? '<div class="note note--amber">' + DSS.icon("scale") + "<div><strong>" + esc(result.tie.message) +
          "</strong><p class=\"mt-1\">Tied alternatives: " + result.recommendation.names.map(esc).join(", ") + ". The recommendation is shared.</p></div></div>"
        : '<div class="note note--green">' + DSS.icon("checkCircle") + "<div><strong>No tie.</strong> " +
          esc(result.tie.message) + " The recommendation above is unique for this evaluation.</div></div>") +
      "</div></section></div>";

    const select = container.querySelector("#resultEvalSelect");
    if (select) select.addEventListener("change", function (e) {
      result = null;
      load(e.target.value);
    });
    DSS.dom.on(container, "click", "[data-action]", function (e, btn) {
      const action = btn.getAttribute("data-action");
      if (action === "goto-evaluation") DSS.router.navigate("evaluation");
      else if (action === "refresh") { result = null; load(selectedId); }
    });
  }

  DSS.views = DSS.views || {};
  DSS.views.results = { render: render, invalidate: function () { result = null; selectedId = null; cache = { evaluations: [], students: [] }; } };
})(window);
