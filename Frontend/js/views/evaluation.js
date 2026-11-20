/* ============================================================
   views/evaluation.js — WSM score entry for all 4 alternatives
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const esc = DSS.escape;

  let cache = { students: [], specializations: [], criteria: [], evaluations: [] };
  let containerRef = null;
  const invalidKeys = new Set();
  const state = { studentId: "", activeSpecId: "P1", scores: {}, loadedId: null };

  function spec() { return cache.specializations.find(function (s) { return s.id === state.activeSpecId; }) || cache.specializations[0]; }
  function student() { return cache.students.find(function (s) { return s.id === state.studentId; }); }

  function emptyScores() {
    const obj = {};
    cache.specializations.forEach(function (s) { obj[s.id] = {}; });
    return obj;
  }

  function totalInputs() { return cache.specializations.length * cache.criteria.length; }

  function filledCount() {
    let count = 0;
    cache.specializations.forEach(function (s) {
      cache.criteria.forEach(function (c) {
        const v = state.scores[s.id] && state.scores[s.id][c.id];
        if (v !== undefined && v !== "" && !DSS.validation.score(v)) count++;
      });
    });
    return count;
  }

  function specComplete(id) {
    return cache.criteria.every(function (c) {
      const v = state.scores[id] && state.scores[id][c.id];
      return v !== undefined && v !== "" && !DSS.validation.score(v);
    });
  }

  function loadEvaluation(id) {
    const ev = cache.evaluations.find(function (e) { return e.id === id; });
    if (!ev) return;
    state.loadedId = ev.id;
    state.studentId = ev.studentId;
    invalidKeys.clear();
    state.scores = emptyScores();
    cache.specializations.forEach(function (s) {
      cache.criteria.forEach(function (c) {
        if (ev.scores && ev.scores[s.id] && ev.scores[s.id][c.id] !== undefined) state.scores[s.id][c.id] = ev.scores[s.id][c.id];
      });
    });
  }

  function scoreGridHtml() {
    const s = spec();
    if (!s) return DSS.ui.emptyState({ icon: "layers", title: "No alternative available", message: "Add a specialization before evaluating." });
    return '<div class="score-grid">' + cache.criteria.map(function (c) {
      const value = (state.scores[s.id] && state.scores[s.id][c.id]) || "";
      const minimize = c.type === "minimize";
      return '<div class="score-item' + (invalidKeys.has(s.id + "|" + c.id) ? " is-invalid" : "") +
        '" data-score-item="' + esc(s.id) + "-" + esc(c.id) + '">' +
        '<div class="score-item__head"><span class="score-item__name">' + esc(c.name) + "</span>" +
        '<span class="score-item__type ' + (minimize ? "tag-minimize" : "tag-maximize") + '">' +
        (minimize ? "MIN" : "MAX") + "</span></div>" +
        '<div class="score-item__input-wrap"><input class="score-input" type="number" min="1" max="10" step="0.5" ' +
        'value="' + esc(value) + '" data-score="' + esc(s.id) + "|" + esc(c.id) + '" aria-label="' + esc(c.name) + ' score for ' + esc(s.name) + '" placeholder="1 – 10" />' +
        '<span class="score-item__unit">/ 10</span></div>' +
        '<p class="score-item__msg">Enter a score between 1 and 10.</p></div>';
    }).join("") + "</div>";
  }

  function renderTabs() {
    if (!containerRef) return;
    const tabs = containerRef.querySelector("#evalTabs");
    if (!tabs) return;
    tabs.innerHTML = cache.specializations.map(function (s) {
      const done = specComplete(s.id);
      return '<button class="eval-tab ' + (s.id === state.activeSpecId ? "is-active" : "") + (done ? " is-complete" : "") +
        '" type="button" data-tab="' + esc(s.id) + '"><span class="eval-tab__dot"></span>' +
        esc(s.code) + " · " + esc(s.name) + (done ? " ✓" : "") + "</button>";
    }).join("");
  }

  function renderPanel() {
    if (!containerRef) return;
    const grid = containerRef.querySelector("#scoreGrid");
    if (grid) grid.innerHTML = scoreGridHtml();
    const title = containerRef.querySelector("#activeSpecName");
    if (title && spec()) title.textContent = spec().name;
    const subtitle = containerRef.querySelector("#activeSpecDesc");
    if (subtitle && spec()) subtitle.textContent = spec().description || "";
    renderTabs();
    refreshProgress();
  }

  function refreshProgress() {
    if (!containerRef) return;
    const done = filledCount(), total = totalInputs();
    const label = containerRef.querySelector("#progressLabel");
    const bar = containerRef.querySelector("#progressBar");
    const count = containerRef.querySelector("#progressCount");
    if (label) label.innerHTML = "<span>Evaluation progress</span><span>" + done + " / " + total + "</span>";
    if (bar) bar.querySelector("span").style.width = (total ? (done / total) * 100 : 0).toFixed(1) + "%";
    if (count) {
      const complete = cache.specializations.filter(function (s) { return specComplete(s.id); }).length;
      count.textContent = complete + " of " + cache.specializations.length + " alternatives complete";
    }
  }

  function validateInput(input) {
    const parts = input.getAttribute("data-score").split("|");
    const item = input.closest(".score-item");
    const error = DSS.validation.score(input.value);
    if (item) item.classList.toggle("is-invalid", !!error);
    if (error) { invalidKeys.add(parts[0] + "|" + parts[1]); state.scores[parts[0]][parts[1]] = input.value; }
    else { invalidKeys.delete(parts[0] + "|" + parts[1]); state.scores[parts[0]][parts[1]] = Number(input.value); }
    return !error;
  }

  function validateAll() {
    let ok = true;
    let firstBadTab = null;
    invalidKeys.clear();
    if (!containerRef) return false;
    containerRef.querySelectorAll("[data-score]").forEach(function (input) {
      const valid = validateInput(input);
      if (!valid && !firstBadTab) firstBadTab = input.getAttribute("data-score").split("|")[0];
      if (!valid) ok = false;
    });
    if (!state.studentId) { DSS.notify.error("Select a student before calculating.", "Missing student"); return false; }
    if (!ok) {
      if (firstBadTab) state.activeSpecId = firstBadTab;
      renderPanel();
      DSS.notify.error("All 24 scores must be numbers between 1 and 10.", "Invalid scores");
      return false;
    }
    return true;
  }

  async function saveDraft() {
    if (!state.studentId) { DSS.notify.error("Select a student first.", "Missing student"); return; }
    try {
      DSS.dom.loading(true, "Saving draft…");
      const s = student();
      await DSS.data.evaluations.create({
        studentId: state.studentId,
        studentName: s ? s.fullName : state.studentId,
        label: "Draft evaluation — " + (s ? s.fullName : state.studentId),
        status: "draft",
        scores: DSS.clone(state.scores)
      });
      DSS.notify.success("Draft saved locally with the current scores.", "Draft saved");
    } catch (error) { DSS.notify.error(error.message, "Could not save draft"); }
    finally { DSS.dom.loading(false); }
  }

  async function calculate() {
    if (!validateAll()) return;
    try {
      DSS.dom.loading(true, "Calculating WSM scores…");
      const s = student();
      const record = await DSS.data.evaluations.create({
        studentId: state.studentId,
        studentName: s ? s.fullName : state.studentId,
        label: "Evaluation — " + (s ? s.fullName : state.studentId),
        status: "saved",
        scores: DSS.clone(state.scores)
      });
      await DSS.data.results.compute(record.id);
      DSS.notify.success("WSM calculation complete. Results are ready.", "Calculated");
      DSS.router.navigate("results", "evaluation=" + encodeURIComponent(record.id));
    } catch (error) { DSS.notify.error(error.message, "Calculation failed"); }
    finally { DSS.dom.loading(false); }
  }

  function resetScores() {
    const ok = DSS.modal.confirm({
      title: "Clear all scores?",
      message: "Reset every score input for this evaluation. Saved evaluations are not affected.",
      confirmText: "Clear scores"
    });
    ok.then(function (confirmed) {
      if (!confirmed) return;
      state.scores = emptyScores();
      state.loadedId = null;
      invalidKeys.clear();
      renderPanel();
      DSS.notify.info("All score inputs cleared.", "Reset");
    });
  }

  async function render(container) {
    containerRef = container;
    const [students, specializations, criteria, evaluations] = await Promise.all([
      DSS.data.students.list(), DSS.data.specializations.list(),
      DSS.data.criteria.list(), DSS.data.evaluations.list()
    ]);
    cache = { students: students, specializations: specializations, criteria: criteria, evaluations: evaluations };

    const params = new URLSearchParams((global.location.hash.split("?")[1] || ""));
    const requestedStudent = params.get("student");
    if (!state.studentId || (requestedStudent && students.some(function (s) { return s.id === requestedStudent; }))) {
      state.studentId = requestedStudent || (students.find(function (s) { return s.status === "active"; }) || students[0] || {}).id || "";
    }
    if (!state.scores || !Object.keys(state.scores).length) state.scores = emptyScores();
    else specializations.forEach(function (s) { if (!state.scores[s.id]) state.scores[s.id] = {}; });
    if (!specializations.some(function (s) { return s.id === state.activeSpecId; })) state.activeSpecId = (specializations[0] || {}).id || "";

    const s = student();
    container.innerHTML =
      DSS.ui.pageHead({
        title: "Evaluation",
        subtitle: "Score every specialization against all six WSM criteria",
        breadcrumb: "Evaluation",
        actions: [
          '<button class="btn btn--secondary" data-action="load">' + DSS.icon("download") + "Load sample</button>",
          '<button class="btn btn--primary" data-action="calculate">' + DSS.icon("calculator") + "Calculate results</button>"
        ].join("")
      }) +
      '<div class="grid grid--2 mb-4"><div class="info-strip"><div class="info-strip__left">' +
      DSS.icon("info") + "<span>Scores range from <strong>1 to 10</strong>. Difficulty is a <strong>minimizing</strong> criterion — enter a lower score when it is less difficult.</span></div></div>" +
      '<div class="info-strip"><div class="info-strip__left">' + DSS.icon("calculator") +
      "<span><strong>" + esc(DSS.config.decisionMethod) + "</strong> — normalized × weight, summed per alternative.</span></div></div></div>" +

      '<div class="eval-layout">' +
      '<aside class="eval-side stack">' +
      '<section class="card eval-student-card"><div class="eval-student-card__head">' +
      '<div class="flex items-center gap-3"><span class="eval-student-card__avatar">' + esc(DSS.ui.initials(s ? s.fullName : "?")) + "</span>" +
      '<div><p class="card__subtitle">Evaluating student</p><h3>' + esc(s ? s.fullName : "No student selected") + "</h3></div></div></div>" +
      '<div class="eval-meta">' +
      '<div class="eval-meta__row"><span>Student ID</span><strong class="mono">' + esc(s ? s.studentId : "—") + "</strong></div>" +
      '<div class="eval-meta__row"><span>Program</span><strong>' + esc(s ? s.program : "—") + "</strong></div>" +
      '<div class="eval-meta__row"><span>Average</span><strong>' + (s ? DSS.formatNumber(s.average, 2) + " / 20" : "—") + "</strong></div></div>" +
      '<div class="field mt-4"><label class="field__label" for="studentSelect">Select student <span class="req">*</span></label>' +
      '<select class="select" id="studentSelect">' + students.map(function (st) {
        return '<option value="' + esc(st.id) + '"' + (st.id === state.studentId ? " selected" : "") + ">" +
          esc(st.studentId + " · " + st.fullName) + "</option>";
      }).join("") + "</select></div>" +
      '<div class="eval-progress"><div class="eval-progress__label" id="progressLabel"></div>' +
      '<div class="weight-progress" id="progressBar"><span></span></div>' +
      '<p class="card__subtitle mt-2" id="progressCount"></p></div></section>' +

      '<section class="card"><div class="card__body"><h3 class="mb-3">Score entry</h3>' +
      '<div class="note note--amber">' + DSS.icon("alertTriangle") +
      "<div><strong>Remember:</strong> for Difficulty (minimize), 1 means easy and 10 means very difficult. Lower values are preferred by WSM.</div></div>" +
      '<button class="btn btn--ghost btn--block mt-3" data-action="reset">' + DSS.icon("refresh") + "Clear all scores</button>" +
      "</div></section></aside>" +

      '<section class="card"><div class="card__head"><div><h3 class="card__title" id="activeSpecName"></h3>' +
      '<p class="card__subtitle" id="activeSpecDesc"></p></div><span class="badge badge--blue">' + DSS.icon("sliders") +
      " " + cache.criteria.length + " criteria</span></div>" +
      '<div class="eval-tabs" id="evalTabs"></div>' +
      '<div class="card__body"><div id="scoreGrid"></div>' +
      '<div class="note note--gray mt-4">' + DSS.icon("info") +
      "<div>Select another tab to enter scores for the remaining alternatives. Progress is tracked automatically and kept while you switch pages.</div></div>" +
      '<div class="flex flex-wrap justify-between gap-3 mt-4">' +
      '<button class="btn btn--secondary" data-action="save-draft">' + DSS.icon("save") + "Save draft</button>" +
      '<div class="flex gap-2"><button class="btn btn--ghost" data-action="clear-current">' + DSS.icon("close") + "Clear tab</button>" +
      '<button class="btn btn--primary" data-action="calculate">' + DSS.icon("calculator") + "Save &amp; calculate</button></div></div>" +
      "</div></section></div>";

    renderPanel();

    container.querySelector("#studentSelect").addEventListener("change", function (e) { state.studentId = e.target.value; });

    DSS.dom.on(container, "click", "[data-tab]", function (e, btn) {
      state.activeSpecId = btn.getAttribute("data-tab");
      renderPanel();
    });

    container.addEventListener("input", function (e) {
      if (!e.target.hasAttribute("data-score")) return;
      validateInput(e.target);
      renderTabs();
      refreshProgress();
    });

    DSS.dom.on(container, "click", "[data-action]", function (e, btn) {
      const action = btn.getAttribute("data-action");
      if (action === "calculate") calculate();
      else if (action === "save-draft") saveDraft();
      else if (action === "reset") resetScores();
      else if (action === "clear-current") {
        state.scores[state.activeSpecId] = {};
        Array.from(invalidKeys).forEach(function (key) { if (key.indexOf(state.activeSpecId + "|") === 0) invalidKeys.delete(key); });
        renderPanel();
        DSS.notify.info("Scores cleared for this alternative.", "Tab cleared");
      } else if (action === "load") {
        const saved = evaluations.filter(function (ev) { return ev.status === "saved" && ev.scores; });
        const body = saved.length
          ? '<div class="field"><label class="field__label" for="loadEval">Choose a sample evaluation</label><select class="select" id="loadEval">' +
            saved.map(function (ev) { return '<option value="' + esc(ev.id) + '">' + esc(ev.label) + " · " + DSS.formatDate(ev.createdAt) + "</option>"; }).join("") +
            "</select></div><div class=\"note note--amber mt-3\">" + DSS.icon("info") +
            "<div>Loading replaces the scores currently shown in the form. Nothing is deleted.</div></div>"
          : DSS.ui.emptyState({ icon: "clipboard", title: "No saved evaluations", message: "Save or calculate an evaluation first." });
        DSS.modal.open({
          title: "Load sample evaluation", subtitle: "Pre-fill the form with stored sample scores", body: body,
          confirmText: "Load scores",
          onConfirm: function (form) {
            const select = form.querySelector("#loadEval");
            if (!select) return false;
            loadEvaluation(select.value);
            renderPanel();
            DSS.notify.success("Sample scores loaded into the form.", "Loaded");
            return true;
          }
        });
      }
    });
  }

  DSS.views = DSS.views || {};
  DSS.views.evaluation = { render: render };
})(window);
