/* ============================================================
   views/criteria.js — Official WSM criteria and editable weights
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const esc = DSS.escape;

  let cache = [];
  let draft = {};
  let containerRef = null;

  function total() {
    return cache.reduce(function (sum, c) { return sum + (Number(draft[c.id]) || 0); }, 0);
  }

  function isValid() {
    const eachValid = cache.every(function (c) {
      const n = Number(draft[c.id]);
      return isFinite(n) && n >= 0 && n <= 1;
    });
    return eachValid && Math.abs(total() - 1) <= DSS.config.weightTolerance;
  }

  function rowsHtml() {
    return cache.map(function (c, i) {
      const value = Number(draft[c.id]) || 0;
      const pct = DSS.clamp(value * 100, 0, 100);
      return "<tr data-criterion=\"" + esc(c.id) + "\">" +
        '<td><span class="badge badge--gray mono">' + esc(c.code || c.id) + "</span></td>" +
        '<td><div><strong>' + esc(c.name) + "</strong><p class=\"card__subtitle\">" + esc(c.description || "") + "</p></div></td>" +
        "<td>" + DSS.ui.typeBadge(c.type) + "</td>" +
        '<td><div class="flex items-center gap-3"><input class="input weight-input" type="number" min="0" max="1" step="0.01" ' +
        'value="' + DSS.formatNumber(value, 2) + '" data-weight="' + esc(c.id) + '" aria-label="Weight for ' + esc(c.name) + '" />' +
        '<div class="weight-bar"><span style="width:' + pct.toFixed(1) + '%;background:' + (c.type === "minimize" ? "var(--c-warning)" : "") + '"></span></div></div></td>' +
        '<td class="text-right fw-700">' + DSS.formatNumber(pct, 1) + "%</td></tr>";
    }).join("");
  }

  function refreshSummary() {
    if (!containerRef) return;
    const sum = total();
    const valid = isValid();
    const box = containerRef.querySelector("#weightSummary");
    const value = containerRef.querySelector("#weightTotal");
    const msg = containerRef.querySelector("#weightMessage");
    const bar = containerRef.querySelector("#weightProgressBar");
    const save = containerRef.querySelector("#saveWeights");

    if (box) box.className = "weight-summary " + (valid ? "is-valid" : Math.abs(sum - 1) > DSS.config.weightTolerance || sum > 1 ? "is-invalid" : "");
    if (value) { value.className = "weight-summary__value " + (valid ? "is-valid" : "is-invalid"); value.textContent = DSS.formatNumber(sum, 2) + " / 1.00"; }
    if (bar) {
      bar.className = "weight-progress" + (sum > 1 + DSS.config.weightTolerance ? " is-over" : valid ? " is-valid" : "");
      bar.querySelector("span").style.width = DSS.clamp(sum * 100, 0, 100).toFixed(2) + "%";
    }
    if (msg) {
      if (valid) msg.innerHTML = '<span class="badge badge--green">' + DSS.icon("checkCircle") + " Valid — weights total exactly 100%</span>";
      else if (sum > 1 + DSS.config.weightTolerance) msg.innerHTML = '<span class="badge badge--red">' + DSS.icon("alertTriangle") + " Total exceeds 100% — reduce a weight</span>";
      else msg.innerHTML = '<span class="badge badge--amber">' + DSS.icon("alert") + " Total must equal exactly 1.00 (100%)</span>";
    }
    if (save) save.disabled = !valid;

    containerRef.querySelectorAll("[data-criterion]").forEach(function (row) {
      const id = row.getAttribute("data-criterion");
      const input = row.querySelector("[data-weight]");
      const cell = row.querySelector("td:last-child");
      const bar = row.querySelector(".weight-bar span");
      const n = Number(draft[id]) || 0;
      if (cell) cell.textContent = DSS.formatNumber(DSS.clamp(n, 0, 1) * 100, 1) + "%";
      if (bar) bar.style.width = DSS.clamp(n * 100, 0, 100).toFixed(1) + "%";
      if (input) input.classList.toggle("has-error", !isFinite(n) || n < 0 || n > 1);
    });
  }

  async function save() {
    if (!isValid()) { DSS.notify.error("Weights must total exactly 1.00 before saving.", "Invalid weights"); return; }
    try {
      DSS.dom.loading(true, "Saving weights…");
      cache = await DSS.data.criteria.saveWeights(draft);
      draft = cache.reduce(function (a, c) { a[c.id] = c.weight; return a; }, {});
      DSS.notify.success("Weights saved and validated to 100%.", "Criteria updated");
      refreshSummary();
    } catch (error) { DSS.notify.error(error.message, "Could not save weights"); }
    finally { DSS.dom.loading(false); }
  }

  async function reset() {
    const ok = await DSS.modal.confirm({
      title: "Reset official weights?",
      message: "Restore the original six criteria and their official WSM weights (0.20, 0.15, 0.20, 0.20, 0.10, 0.15)?",
      confirmText: "Reset defaults"
    });
    if (!ok) return;
    try {
      DSS.dom.loading(true, "Restoring official defaults…");
      cache = await DSS.data.criteria.reset();
      draft = cache.reduce(function (a, c) { a[c.id] = c.weight; return a; }, {});
      DSS.notify.success("Official criteria and weights restored.", "Reset complete");
      await render(containerRef);
    } catch (error) { DSS.notify.error(error.message, "Could not reset"); }
    finally { DSS.dom.loading(false); }
  }

  async function render(container) {
    containerRef = container;
    cache = await DSS.data.criteria.list();
    draft = cache.reduce(function (a, c) { a[c.id] = c.weight; return a; }, {});

    container.innerHTML =
      DSS.ui.pageHead({
        title: "Criteria & Weights",
        subtitle: "Official evaluation criteria — Weighted Sum Model configuration",
        breadcrumb: "Criteria & Weights",
        actions: [
          '<button class="btn btn--secondary" data-action="reset">' + DSS.icon("refresh") + "Reset defaults</button>",
          '<button class="btn btn--primary" id="saveWeights" data-action="save">' + DSS.icon("save") + "Save weights</button>"
        ].join("")
      }) +
      '<div class="grid grid--main">' +
      '<div class="stack">' +
      '<section class="card"><div class="table-wrap"><table class="table criteria-table"><thead><tr>' +
      "<th>Code</th><th>Criterion</th><th>Objective</th><th>Weight</th><th class=\"text-right\">Share</th>" +
      '</tr></thead><tbody id="criteriaBody">' + rowsHtml() + "</tbody></table></div>" +
      '<div class="card__footer"><span class="muted" style="font-size:11px">Difficulty is the only minimized criterion — a lower score is better.</span></div></section>' +
      '<section class="card"><div class="card__body">' +
      '<div id="weightSummary" class="weight-summary"><div><p class="card__title">Total weight</p>' +
      '<p class="card__subtitle">Must equal exactly 1.00 (100%)</p></div>' +
      '<div class="flex-1"><div id="weightProgressBar" class="weight-progress"><span></span></div>' +
      '<div id="weightMessage" class="mt-2"></div></div>' +
      '<p class="weight-summary__value" id="weightTotal">1.00 / 1.00</p></div>' +
      '<div class="note note--blue mt-4">' + DSS.icon("calculator") +
      "<div><strong>How WSM uses these weights.</strong> Each raw score is normalized (lower-is-better for Difficulty), multiplied by its criterion weight, then summed to produce the final score. The PHP backend will perform the authoritative calculation.</div></div>" +
      "</div></section></div>" +

      '<div class="stack">' +
      '<section class="card">' + DSS.ui.cardHead("Method", "Decision model in use") +
      '<div class="card__body"><div class="kpi-inline"><div class="kpi-inline__item"><small>Method</small><strong style="font-size:13px">Weighted Sum Model</strong></div>' +
      '<div class="kpi-inline__item"><small>Criteria</small><strong>' + cache.length + "</strong></div>" +
      '<div class="kpi-inline__item"><small>Minimized</small><strong>' + cache.filter(function (c) { return c.type === "minimize"; }).length + "</strong></div></div>" +
      '<div class="note note--green mt-4">' + DSS.icon("shield") + "<div>Official criterion names, objectives and defaults are preserved. Reset restores them at any time.</div></div>" +
      "</div></section>" +
      '<section class="card">' + DSS.ui.cardHead("Objective legend") + '<div class="card__body stack" style="gap:12px">' +
      '<div class="flex items-center gap-3">' + DSS.ui.typeBadge("maximize") + '<span class="muted" style="font-size:11.5px">Higher scores improve the final score.</span></div>' +
      '<div class="flex items-center gap-3">' + DSS.ui.typeBadge("minimize") + '<span class="muted" style="font-size:11.5px">Lower scores improve the final score.</span></div>' +
      "</div></section></div></div>";

    container.querySelectorAll("[data-weight]").forEach(function (input) {
      input.addEventListener("input", function () {
        draft[input.getAttribute("data-weight")] = input.value === "" ? NaN : Number(input.value);
        refreshSummary();
      });
    });
    DSS.dom.on(container, "click", "[data-action]", function (e, btn) {
      const action = btn.getAttribute("data-action");
      if (action === "save") save();
      else if (action === "reset") reset();
    });
    refreshSummary();
  }

  DSS.views = DSS.views || {};
  DSS.views.criteria = { render: render };
})(window);
