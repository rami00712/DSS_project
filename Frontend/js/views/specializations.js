/* ============================================================
   views/specializations.js — Four official alternatives + custom ones
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const esc = DSS.escape;

  const ICONS = ["sparkles", "shield", "database", "code", "bookOpen", "target", "zap", "layersSmall"];
  const COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#ea580c", "#059669", "#db2777"];
  const state = { search: "", filter: "all" };
  let cache = [];
  let containerRef = null;

  function filtered() {
    const q = state.search.trim().toLowerCase();
    return cache.filter(function (s) {
      const matchQ = !q || [s.code, s.name, s.description].some(function (v) { return String(v || "").toLowerCase().indexOf(q) >= 0; });
      const matchF = state.filter === "all" || (state.filter === "official" ? s.predefined : !s.predefined);
      return matchQ && matchF;
    });
  }

  function nextCode() {
    let n = 5;
    while (cache.some(function (s) { return s.code === "P" + n; })) n++;
    return "P" + n;
  }

  function cardsHtml(list) {
    if (!list.length) {
      return DSS.ui.emptyState({
        icon: "layers", title: "No specializations found",
        message: "Adjust your search or add a new alternative. The four official alternatives are always preserved.",
        action: '<button class="btn btn--primary btn--sm" data-action="add">' + DSS.icon("plus") + "Add specialization</button>"
      });
    }
    return '<div class="spec-grid">' + list.map(function (s) {
      const color = s.color || "#2563eb";
      return '<article class="card spec-card card--hover">' +
        '<span class="spec-card__accent" style="background:' + esc(color) + '"></span>' +
        '<div class="spec-card__top">' +
        '<span class="spec-card__icon" style="background:' + esc(color) + '18;color:' + esc(color) + '">' + DSS.icon(s.icon || "layers") + "</span>" +
        '<div class="flex-1"><p class="spec-card__code">' + esc(s.code) + (s.predefined ? " · OFFICIAL" : " · CUSTOM") + "</p>" +
        '<h3 class="spec-card__title">' + esc(s.name) + "</h3></div>" +
        (s.predefined ? '<span class="badge badge--purple">' + DSS.icon("shield") + "Default</span>" : "") +
        "</div><p class=\"spec-card__desc\">" + esc(s.description) + "</p>" +
        '<div class="spec-card__foot"><span class="spec-card__score">' + DSS.icon("clipboard") +
        "<strong>" + cacheEvalCount(s.id) + "</strong>&nbsp;evaluations</span>" +
        '<div class="actions">' +
        '<button class="icon-btn btn--icon btn--sm" data-action="edit" data-id="' + esc(s.id) + '" title="Edit">' + DSS.icon("edit") + "</button>" +
        (s.predefined
          ? '<button class="icon-btn btn--icon btn--sm" data-action="locked" title="Official alternatives cannot be deleted">' + DSS.icon("shield") + "</button>"
          : '<button class="icon-btn btn--icon btn--sm" data-action="delete" data-id="' + esc(s.id) + '" title="Delete">' + DSS.icon("trash") + "</button>") +
        "</div></div></article>";
    }).join("") + "</div>";
  }

  function cacheEvalCount(id) {
    return (cacheEvaluations || []).filter(function (e) { return e.scores && e.scores[id]; }).length;
  }
  let cacheEvaluations = [];

  function updateCards() {
    if (!containerRef) return;
    const list = filtered();
    const grid = containerRef.querySelector("#specGrid");
    if (grid) grid.innerHTML = cardsHtml(list);
    const counter = containerRef.querySelector("#specCount");
    if (counter) counter.textContent = "Showing " + list.length + " of " + cache.length + " alternatives";
  }

  function formBody(spec) {
    const iconOptions = ICONS.map(function (i) { return { value: i, label: i }; });
    return '<div class="form-grid">' +
      DSS.dom.field({ name: "code", label: "Code", value: spec ? spec.code : nextCode(), required: true, attrs: spec && spec.predefined ? " readonly" : "" }) +
      DSS.dom.field({ name: "icon", label: "Icon", type: "select", value: spec ? spec.icon : "layers", options: iconOptions }) +
      DSS.dom.field({ name: "name", label: "Name", value: spec ? spec.name : "", placeholder: "e.g. Human-Computer Interaction", required: true, className: "form-span-2" }) +
      DSS.dom.field({ name: "description", label: "Description", type: "textarea", value: spec ? spec.description : "", placeholder: "Describe this specialization…", required: true, className: "form-span-2" }) +
      '<div class="field"><label class="field__label">Accent color</label><div class="flex flex-wrap gap-2 mt-1">' +
      COLORS.map(function (c) {
        const selected = (spec ? spec.color : COLORS[0]) === c;
        return '<label class="chart-legend__item" style="cursor:pointer"><input type="radio" name="color" value="' + c + '"' +
          (selected ? " checked" : "") + ' /><span class="chart-legend__swatch" style="width:20px;height:20px;border-radius:6px;background:' + c + '"></span></label>';
      }).join("") + "</div></div>" +
      "</div>" +
      (spec && spec.predefined ? '<div class="note note--blue mt-4">' + DSS.icon("shield") +
        "<div><strong>Official alternative.</strong> Its code (P1–P4) is locked, but you may update the name, description, icon or color for presentation.</div></div>" : "");
  }

  function openForm(spec) {
    const editing = !!spec;
    DSS.modal.open({
      title: editing ? "Edit specialization" : "Add specialization",
      subtitle: editing ? "Update how this alternative is presented." : "Add a custom alternative to the decision model.",
      confirmText: editing ? "Save changes" : "Add alternative",
      size: "lg",
      body: formBody(spec),
      onConfirm: async function (form) {
        DSS.dom.clearErrors(form);
        const colorEl = form.querySelector('input[name="color"]:checked');
        const payload = {
          code: DSS.dom.getValue(form, "code").toUpperCase(),
          name: DSS.dom.getValue(form, "name"),
          description: DSS.dom.getValue(form, "description"),
          icon: DSS.dom.getValue(form, "icon"),
          color: colorEl ? colorEl.value : COLORS[0]
        };
        const errors = {
          code: DSS.validation.required(payload.code, "Code"),
          name: DSS.validation.name(payload.name),
          description: DSS.validation.description(payload.description)
        };
        if (DSS.validation.show(form, errors)) return false;
        if (!/^[A-Za-z0-9\-]{1,8}$/.test(payload.code)) { DSS.dom.setFieldError(form, "code", "Use up to 8 letters, numbers or dashes."); return false; }
        try {
          DSS.dom.loading(true, "Saving specialization…");
          if (editing) await DSS.data.specializations.update(spec.id, payload);
          else await DSS.data.specializations.create(payload);
          DSS.notify.success(editing ? "Specialization updated." : "Alternative added.", "Saved");
          await render(containerRef);
          return true;
        } catch (error) {
          DSS.notify.error(error.message, "Could not save");
          return false;
        } finally { DSS.dom.loading(false); }
      }
    });
  }

  async function removeSpec(id) {
    const spec = cache.find(function (s) { return s.id === id; });
    if (!spec) return;
    if (spec.predefined) { DSS.notify.warning("P1–P4 are official alternatives and cannot be deleted.", "Protected item"); return; }
    const ok = await DSS.modal.confirm({
      title: "Delete alternative?",
      message: "Remove <strong>" + esc(spec.name) + "</strong> from the local alternatives list? Existing evaluations that reference it will keep their stored scores.",
      html: true, danger: true, confirmText: "Delete alternative"
    });
    if (!ok) return;
    try {
      DSS.dom.loading(true, "Deleting alternative…");
      await DSS.data.specializations.remove(id);
      DSS.notify.success("Alternative deleted.", "Deleted");
      await render(containerRef);
    } catch (error) { DSS.notify.error(error.message, "Could not delete"); }
    finally { DSS.dom.loading(false); }
  }

  async function render(container) {
    containerRef = container;
    const [specs, evaluations] = await Promise.all([
      DSS.data.specializations.list(), DSS.data.evaluations.list()
    ]);
    cache = specs; cacheEvaluations = evaluations;

    container.innerHTML =
      DSS.ui.pageHead({
        title: "Specializations",
        subtitle: "The four official alternatives plus any locally added options",
        breadcrumb: "Specializations",
        actions: ['<button class="btn btn--primary" data-action="add">' + DSS.icon("plus") + "Add specialization</button>"].join("")
      }) +
      '<div class="note note--blue mb-4">' + DSS.icon("shield") +
      "<div><strong>Official alternatives are protected.</strong> P1–P4 are always preserved. They can be edited for presentation, but not deleted.</div></div>" +
      '<section class="card">' +
      '<div class="toolbar"><div class="search-box">' + DSS.icon("search") +
      '<input class="input" type="search" id="specSearch" placeholder="Search code, name or description…" value="' + esc(state.search) + '" aria-label="Search specializations" /></div>' +
      '<div class="toolbar__filters"><select class="select" id="specFilter" aria-label="Filter alternatives">' +
      '<option value="all">All alternatives</option><option value="official">Official (P1–P4)</option><option value="custom">Custom</option></select>' +
      '<span class="toolbar__result" id="specCount"></span></div></div>' +
      '<div class="card__body" id="specGrid"></div>' +
      '<div class="card__footer">' + DSS.ui.mockChip() + " Stored locally for demonstration purposes.</div></section>";

    container.querySelector("#specFilter").value = state.filter;
    updateCards();

    const search = container.querySelector("#specSearch");
    search.addEventListener("input", DSS.debounce(function () { state.search = search.value; updateCards(); }, 150));
    container.querySelector("#specFilter").addEventListener("change", function (e) { state.filter = e.target.value; updateCards(); });

    DSS.dom.on(container, "click", "[data-action]", function (e, btn) {
      const action = btn.getAttribute("data-action");
      if (action === "add") openForm();
      else if (action === "edit") {
        const spec = cache.find(function (s) { return s.id === btn.getAttribute("data-id"); });
        if (spec) openForm(spec);
      } else if (action === "delete") removeSpec(btn.getAttribute("data-id"));
      else if (action === "locked") DSS.notify.warning("P1–P4 are official alternatives and cannot be deleted.", "Protected item");
    });
  }

  DSS.views = DSS.views || {};
  DSS.views.specializations = { render: render, openForm: openForm };
})(window);
