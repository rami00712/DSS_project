/* ============================================================
   router.js — Tiny hash-based SPA router (six sections)
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const esc = DSS.escape;

  const ROUTES = [
    { id: "dashboard", label: "Dashboard", icon: "grid", eyebrow: "Overview" },
    { id: "students", label: "Students", icon: "users", eyebrow: "Data management" },
    { id: "specializations", label: "Specializations", icon: "layers", eyebrow: "Alternatives" },
    { id: "criteria", label: "Criteria & Weights", icon: "sliders", eyebrow: "Decision model" },
    { id: "evaluation", label: "Evaluation", icon: "clipboard", eyebrow: "Scoring" },
    { id: "results", label: "Results & Ranking", icon: "chart", eyebrow: "WSM analysis" }
  ];

  let currentId = null;
  let rendering = false;

  function parseHash() {
    const raw = (global.location.hash || "").replace(/^#\/?/, "").split("?")[0];
    return ROUTES.some(function (r) { return r.id === raw; }) ? raw : "dashboard";
  }

  function setNavState(id) {
    DSS.$$("#mainNav .nav__item").forEach(function (item) {
      const active = item.getAttribute("data-route") === id;
      item.classList.toggle("is-active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
  }

  function updateTopbar(route) {
    const title = DSS.$("#topbarTitle");
    const eyebrow = DSS.$("#topbarEyebrow");
    if (title) title.textContent = route.label;
    if (eyebrow) eyebrow.textContent = route.eyebrow;
    document.title = route.label + " — DSS | University of Guelma";
  }

  async function render() {
    if (rendering) return;
    rendering = true;
    const id = parseHash();
    const route = ROUTES.find(function (r) { return r.id === id; });
    const container = DSS.$("#content");
    currentId = id;
    setNavState(id);
    updateTopbar(route);

    if (container) {
      container.innerHTML = '<div class="card card__body"><div class="skeleton" style="height:28px;width:40%;margin-bottom:16px"></div>' +
        '<div class="skeleton" style="height:120px"></div></div>';
    }

    try {
      const view = DSS.views && DSS.views[id];
      if (!view || typeof view.render !== "function") throw new Error("View not available: " + id);
      await view.render(container);
    } catch (error) {
      console.error("[DSS router]", error);
      if (container) container.innerHTML = DSS.ui.errorState(error.message || "Unable to render this section.");
      DSS.notify.error(error.message || "Unable to render this section.", "Page error");
    } finally {
      rendering = false;
      DSS.closeSidebar && DSS.closeSidebar();
      global.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
    }
  }

  function navigate(id, params) {
    const target = ROUTES.some(function (r) { return r.id === id; }) ? id : "dashboard";
    const hash = "#/" + target + (params ? "?" + params : "");
    if (global.location.hash === hash) render();
    else global.location.hash = hash;
  }

  function init() {
    const nav = DSS.$("#mainNav");
    if (nav) {
      nav.innerHTML = ROUTES.map(function (r) {
        return '<button class="nav__item" type="button" data-route="' + r.id + '">' +
          DSS.icon(r.icon) + "<span>" + esc(r.label) + "</span>" +
          (r.id === "students" || r.id === "evaluation" ? '<span class="nav__count" data-nav-count="' + r.id + '">0</span>' : "") +
          "</button>";
      }).join("");
    }
    global.addEventListener("hashchange", render);
    render();
  }

  DSS.router = { routes: ROUTES, init: init, render: render, navigate: navigate, current: function () { return currentId; } };
})(window);
