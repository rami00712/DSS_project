/* ============================================================
   views/dashboard.js — Overview, statistics and insights
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const esc = DSS.escape;

  function winnerBanner(result, evaluation) {
    const tie = result.tie.hasTie;
    const names = result.recommendation.names || [];
    const title = tie
      ? "Tie — " + names.length + " specializations share the top rank"
      : "Recommended: " + result.recommendation.name;
    const detail = tie
      ? result.tie.message + " Review the full WSM breakdown before making a decision."
      : "Highest WSM score: " + DSS.formatNumber((result.best ? result.best.final : 0) * 100, 2) +
        "/100 for " + evaluation.label + ".";
    return '<div class="winner-banner ' + (tie ? "is-tie" : "") + '">' +
      '<span class="winner-banner__icon">' + DSS.icon(tie ? "scale" : "award") + "</span>" +
      "<div><h3>" + esc(title) + "</h3><p>" + esc(detail) + "</p>" +
      '<div class="card__subtitle mt-1">' + esc(evaluation.label) + " · " + DSS.formatDate(evaluation.createdAt) + " · " +
      (evaluation.source === "mock" ? "Sample evaluation" : "Saved evaluation") + "</div></div></div>";
  }

  async function render(container) {
    const [students, specializations, criteria, evaluations] = await Promise.all([
      DSS.data.students.list(), DSS.data.specializations.list(),
      DSS.data.criteria.list(), DSS.data.evaluations.list()
    ]);

    const sortedEvals = evaluations.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    const latest = sortedEvals[0];
    const aggregate = DSS.wsm.aggregate(evaluations, criteria, specializations);
    const latestResult = latest ? DSS.wsm.compute(latest, criteria, specializations) : null;
    const activity = DSS.data.activity().slice(0, 5);

    const stats = [
      DSS.ui.statCard({ label: "Total students", value: students.length, icon: "users", tone: "", foot: students.filter(function (s) { return s.status === "active"; }).length + " active records" }),
      DSS.ui.statCard({ label: "Specializations", value: specializations.length, icon: "layers", tone: "purple", foot: specializations.filter(function (s) { return s.predefined; }).length + " official alternatives" }),
      DSS.ui.statCard({ label: "Criteria", value: criteria.length, icon: "sliders", tone: "teal", foot: criteria.filter(function (c) { return c.type === "minimize"; }).length + " minimized criterion" }),
      DSS.ui.statCard({ label: "Evaluations", value: evaluations.length, icon: "clipboard", tone: "amber", foot: "All calculated with WSM" })
    ].join("");

    const quickActions = [
      { label: "Add student", icon: "plus", action: "add-student", cls: "btn--primary" },
      { label: "New evaluation", icon: "clipboard", action: "goto-evaluation", cls: "btn--secondary" },
      { label: "View ranking", icon: "chart", action: "goto-results", cls: "btn--ghost" },
      { label: "Reset demo data", icon: "refresh", action: "reset-demo", cls: "btn--ghost" }
    ];

    const bestCard = aggregate.best
      ? '<div class="flex items-center gap-3 mb-4">' +
        '<span class="card__icon" style="background:' + esc(aggregate.best.color || "#2563eb") + '18;color:' + esc(aggregate.best.color || "#2563eb") + '">' +
        DSS.icon(aggregate.best.icon || "award") + "</span><div><h3>" + esc(aggregate.best.name) + "</h3>" +
        '<p class="card__subtitle">' + esc(aggregate.best.code || "") + " · Average across all evaluations</p></div></div>" +
        '<div class="kpi-inline"><div class="kpi-inline__item"><small>Average WSM score</small><strong>' +
        DSS.formatNumber(aggregate.best.percent, 2) + " / 100</strong></div>" +
        '<div class="kpi-inline__item"><small>Evaluations</small><strong>' + evaluations.length + "</strong></div></div>" +
        (aggregate.hasTie ? '<div class="note note--amber mt-4">' + DSS.icon("scale") +
          "<div><strong>Tie in aggregated ranking.</strong> The top position is shared; no unique best specialization.</div></div>" : "")
      : DSS.ui.emptyState({ icon: "award", title: "No evaluations yet", message: "Save an evaluation to see the best-performing specialization." });

    const rankingBars = aggregate.rows.length
      ? DSS.Charts.bars(aggregate.rows.map(function (r, i) {
        return { label: r.code + " · " + r.name, value: r.percent, color: r.color || DSS.Charts.palette[i % 4], display: DSS.formatNumber(r.percent, 2) + " / 100" };
      }), { max: 100, legend: false })
      : DSS.ui.emptyState({ icon: "chart", title: "No ranking available", message: "Results appear after the first evaluation." });

    const scoreDistribution = aggregate.rows.length
      ? DSS.Charts.bars(aggregate.rows.map(function (r, i) {
        return { label: r.name, value: r.final, color: r.color || DSS.Charts.palette[i % 4], display: DSS.formatNumber(r.final, 4) };
      }), { max: Math.max.apply(null, aggregate.rows.map(function (r) { return r.final; }).concat([0.01])), legend: false })
      : "";

    const activityHtml = activity.length
      ? '<div class="activity-list">' + activity.map(function (a) {
        const icon = a.type === "evaluation" ? "clipboard" : a.type === "criteria" ? "sliders" : a.type === "specialization" ? "layers" : "users";
        return '<div class="activity-item"><span class="activity-item__icon">' + DSS.icon(icon) + "</span>" +
          '<div class="activity-item__body"><p>' + a.text + "</p><small>" + DSS.timeAgo(a.at) + "</small></div></div>";
      }).join("") + "</div>"
      : DSS.ui.emptyState({ icon: "activity", title: "No activity yet", message: "Actions will be recorded here." });

    const donutSegments = specializations.map(function (s, i) {
      return { label: s.code, value: evaluations.filter(function (e) { return !!e.scores && e.scores[s.id]; }).length, color: s.color || DSS.Charts.palette[i % 4] };
    });

    container.innerHTML =
      DSS.ui.pageHead({
        title: "Dashboard",
        subtitle: "Decision-support overview for specialization recommendation",
        breadcrumb: "Dashboard",
        actions: [
          '<button class="btn btn--primary" data-action="goto-evaluation">' + DSS.icon("clipboard") + "New evaluation</button>",
          '<button class="btn btn--secondary" data-action="add-student">' + DSS.icon("plus") + "Add student</button>"
        ].join("")
      }) +
      '<div class="info-strip mb-4"><div class="info-strip__left">' + DSS.icon("info") +
      "<span>Prototype mode: figures below use <strong>local sample data</strong>. The PHP backend will provide authoritative WSM results.</span></div>" +
      '<span class="badge badge--blue">' + esc(DSS.config.decisionMethod) + "</span></div>" +
      '<div class="grid grid--4 mb-4">' + stats + "</div>" +

      '<div class="grid grid--main mb-4"><div class="stack">' +
      '<section class="card">' + DSS.ui.cardHead("Latest recommendation", "Most recent WSM evaluation") +
      '<div class="card__body">' +
      (latestResult ? winnerBanner(latestResult, latest) + '<div class="mt-4 flex gap-2 flex-wrap">' +
        '<button class="btn btn--soft btn--sm" data-action="view-latest-result">' + DSS.icon("eye") + "View WSM breakdown</button>" +
        '<button class="btn btn--ghost btn--sm" data-action="goto-results">All results</button></div>'
        : DSS.ui.emptyState({ icon: "award", title: "No recommendation yet", message: "Create an evaluation to generate a WSM-based recommendation.", action: '<button class="btn btn--primary btn--sm" data-action="goto-evaluation">Start evaluation</button>' })) +
      "</div></section>" +

      '<section class="card">' + DSS.ui.cardHead("Ranking overview", "Average WSM score across evaluations") +
      '<div class="card__body">' + rankingBars + "</div></section></div>" +

      '<div class="stack">' +
      '<section class="card"><div class="card__body">' + bestCard + "</div></section>" +
      '<section class="card">' + DSS.ui.cardHead("Recent activity") + '<div class="card__body">' + activityHtml + "</div></section>" +
      "</div></div>" +

      '<div class="grid grid--2">' +
      '<section class="card">' + DSS.ui.cardHead("Score chart", "Normalized WSM scores (average)") +
      '<div class="card__body">' + (scoreDistribution || DSS.ui.emptyState({ icon: "chart", title: "No chart data", message: "Scores will appear after an evaluation is saved." })) + "</div></section>" +

      '<section class="card">' + DSS.ui.cardHead("Quick actions & coverage", "Evaluation coverage by alternative") +
      '<div class="card__body">' + DSS.Charts.donut(donutSegments, String(evaluations.length), "evaluations") +
      '<div class="eval-meta mt-4">' + quickActions.map(function (a) {
        return '<button class="btn ' + a.cls + ' btn--block" data-action="' + a.action + '">' + DSS.icon(a.icon) + a.label + "</button>";
      }).join("") + "</div></div></section></div>";

    // Events
    DSS.dom.on(container, "click", "[data-action]", function (e, el) {
      const action = el.getAttribute("data-action");
      if (action === "add-student" && DSS.views.students.openForm) DSS.views.students.openForm();
      else if (action === "goto-evaluation") DSS.router.navigate("evaluation");
      else if (action === "goto-results") DSS.router.navigate("results");
      else if (action === "reset-demo" && DSS.app.resetDemo) DSS.app.resetDemo();
      else if (action === "view-latest-result" && latest) DSS.router.navigate("results", "evaluation=" + encodeURIComponent(latest.id));
    });
  }

  DSS.views = DSS.views || {};
  DSS.views.dashboard = { render: render };
})(window);
