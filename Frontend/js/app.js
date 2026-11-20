/* ============================================================
   app.js — Application bootstrap and global chrome interactions
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const esc = DSS.escape;

  function openSidebar() {
    const sidebar = DSS.$("#sidebar");
    const overlay = DSS.$("#sidebarOverlay");
    const btn = DSS.$("#menuBtn");
    if (!sidebar) return;
    sidebar.classList.add("is-open");
    if (overlay) overlay.hidden = false;
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    const sidebar = DSS.$("#sidebar");
    const overlay = DSS.$("#sidebarOverlay");
    const btn = DSS.$("#menuBtn");
    if (sidebar) sidebar.classList.remove("is-open");
    if (overlay) overlay.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function updateNavCounts() {
    const students = DSS.storage.get("students", []);
    const evaluations = DSS.storage.get("evaluations", []);
    const s = DSS.$('[data-nav-count="students"]');
    const e = DSS.$('[data-nav-count="evaluation"]');
    if (s) s.textContent = String(students.length);
    if (e) e.textContent = String(evaluations.length);
  }

  function showActivity() {
    const activity = DSS.data.activity().slice(0, 12);
    DSS.modal.open({
      title: "Recent activity",
      subtitle: "Local prototype activity log",
      size: "lg",
      hideFooter: true,
      body: activity.length
        ? '<div class="activity-list">' + activity.map(function (a) {
          return '<div class="activity-item"><span class="activity-item__icon">' + DSS.icon("activity") + "</span>" +
            '<div class="activity-item__body"><p>' + a.text + '</p><small>' + DSS.formatDateTime(a.at) + "</small></div></div>";
        }).join("") + "</div>"
        : DSS.ui.emptyState({ icon: "activity", title: "No activity", message: "Actions you perform will appear here." })
    });
  }

  function showProfile() {
    DSS.modal.open({
      title: "Project information",
      subtitle: DSS.config.organization,
      size: "sm",
      hideFooter: true,
      body: '<div class="eval-meta">' +
        '<div class="eval-meta__row"><span>Application</span><strong>Decision Support System</strong></div>' +
        '<div class="eval-meta__row"><span>Method</span><strong>Weighted Sum Model</strong></div>' +
        '<div class="eval-meta__row"><span>Data source</span><strong>' + esc(DSS.data.modeLabel()) + "</strong></div>" +
        '<div class="eval-meta__row"><span>Scope</span><strong>Frontend prototype</strong></div></div>' +
        '<div class="note note--blue mt-4">' + DSS.icon("info") +
        "<div>No PHP or database connection is active in this prototype. Backend integration is prepared but disabled.</div></div>"
    });
  }

  async function resetDemo() {
    const ok = await DSS.modal.confirm({
      title: "Reset demo data?",
      message: "Restore all local sample students, specializations, criteria, weights, evaluations and activity to their original state? Your browser-stored changes will be lost.",
      confirmText: "Reset everything", danger: true
    });
    if (!ok) return;
    DSS.dom.loading(true, "Restoring demo data…");
    DSS.storage.reset();
    if (DSS.views.results && DSS.views.results.invalidate) DSS.views.results.invalidate();
    updateNavCounts();
    DSS.router.render();
    DSS.dom.loading(false);
    DSS.notify.success("Demo data restored to official defaults.", "Reset complete");
  }

  function bindGlobal() {
    const menu = DSS.$("#menuBtn");
    const close = DSS.$("#sidebarClose");
    const overlay = DSS.$("#sidebarOverlay");
    if (menu) menu.addEventListener("click", function () {
      const open = DSS.$("#sidebar").classList.contains("is-open");
      open ? closeSidebar() : openSidebar();
    });
    if (close) close.addEventListener("click", closeSidebar);
    if (overlay) overlay.addEventListener("click", closeSidebar);
    DSS.onEscape(closeSidebar);

    DSS.dom.on(document, "click", "[data-route]", function (e, btn) {
      DSS.router.navigate(btn.getAttribute("data-route"));
    });

    const refresh = DSS.$("#refreshBtn");
    if (refresh) refresh.addEventListener("click", function () {
      DSS.router.render();
      DSS.notify.info("Current section reloaded from the local data layer.", "Refreshed");
    });

    const notification = DSS.$("#notificationBtn");
    if (notification) notification.addEventListener("click", showActivity);
    const user = DSS.$("#userBtn");
    if (user) user.addEventListener("click", showProfile);

    const reset = DSS.$("#resetDemoBtn");
    if (reset) reset.addEventListener("click", resetDemo);

    DSS.storage.onChange(updateNavCounts);
  }

  function init() {
    DSS.data.init();
    DSS.hydrateIcons(document);
    bindGlobal();
    DSS.router.init();
    // Nav markup is created by router.init(), so counts are applied afterwards.
    updateNavCounts();
    console.info("[DSS] Frontend prototype ready. Data source: " + DSS.data.modeLabel() +
      ". PHP backend integration stays disabled until config.USE_API is set to true.");
  }

  DSS.closeSidebar = closeSidebar;
  DSS.app = { init: init, resetDemo: resetDemo, closeSidebar: closeSidebar };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
