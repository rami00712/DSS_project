/* ============================================================
   components.js — Reusable UI markup helpers
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const esc = DSS.escape;

  function pageHead(config) {
    const crumb = config.breadcrumb
      ? '<div class="breadcrumb">' + DSS.icon("grid") + "<span>DSS</span>" + DSS.icon("chevronRight") +
        "<strong>" + esc(config.breadcrumb) + "</strong></div>"
      : "";
    const actionsHtml = Array.isArray(config.actions) ? config.actions.join("") : (config.actions || "");
    const actions = actionsHtml
      ? '<div class="page-head__actions">' + actionsHtml + "</div>"
      : "";
    return '<div class="page-head"><div>' + crumb +
      '<h2 class="page-head__title">' + esc(config.title) + "</h2>" +
      '<p class="page-head__subtitle">' + esc(config.subtitle || "") + "</p></div>" + actions + "</div>";
  }

  function statCard(config) {
    const tone = config.tone || "";
    return '<article class="card stat-card card--hover">' +
      '<div class="stat-card__top"><div>' +
      '<p class="stat-card__label">' + esc(config.label) + "</p>" +
      '<p class="stat-card__value">' + esc(config.value) + "</p></div>" +
      '<span class="stat-card__icon ' + (tone ? "stat-card__icon--" + tone : "") + '">' + DSS.icon(config.icon || "chart") + "</span></div>" +
      '<div class="stat-card__foot">' + (config.footIcon ? DSS.icon(config.footIcon) : "") +
      "<span>" + (config.foot || "") + "</span></div></article>";
  }

  function cardHead(title, subtitle, actions, plain) {
    return '<div class="card__head' + (plain ? " card__head--plain" : "") + '"><div>' +
      '<h3 class="card__title">' + esc(title) + "</h3>" +
      (subtitle ? '<p class="card__subtitle">' + esc(subtitle) + "</p>" : "") +
      "</div>" + (actions ? '<div class="flex items-center gap-2">' + actions + "</div>" : "") + "</div>";
  }

  function emptyState(config) {
    return '<div class="empty-state"><span class="empty-state__icon">' + DSS.icon(config.icon || "file") + "</span>" +
      "<h3>" + esc(config.title || "No data available") + "</h3>" +
      "<p>" + esc(config.message || "") + "</p>" +
      (config.action || "") + "</div>";
  }

  function errorState(message) {
    return '<div class="error-state">' + DSS.icon("alertTriangle") + "<div><strong>Something went wrong</strong>" +
      "<p>" + esc(message || "Unknown error.") + "</p></div></div>";
  }

  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2)
      .map(function (p) { return p.charAt(0).toUpperCase(); }).join("");
  }

  const AVATAR_TONES = ["", "avatar--purple", "avatar--teal", "avatar--orange"];
  function avatar(name, index) {
    const tone = AVATAR_TONES[(index || 0) % AVATAR_TONES.length];
    return '<span class="avatar ' + tone + '">' + esc(initials(name)) + "</span>";
  }

  function typeBadge(type) {
    const maximize = type === "maximize";
    return '<span class="badge tag-' + (maximize ? "maximize" : "minimize") + '">' +
      DSS.icon(maximize ? "arrowUp" : "minimize") + (maximize ? "Maximize" : "Minimize") + "</span>";
  }

  function mockChip() {
    return '<span class="badge badge--amber" title="Generated locally — not stored in a database">' + DSS.icon("info") + " Mock</span>";
  }

  function statusBadge(status) {
    const active = status === "active";
    return '<span class="badge badge--' + (active ? "green" : "gray") + '">' +
      DSS.icon(active ? "checkCircle" : "close") + (active ? "Active" : "Inactive") + "</span>";
  }

  function progress(value, max, modifier) {
    const pct = max ? DSS.clamp((value / max) * 100, 0, 100) : 0;
    return '<div class="weight-progress ' + (modifier || "") + '"><span style="width:' + pct.toFixed(2) + '%"></span></div>';
  }

  DSS.ui = {
    pageHead: pageHead, statCard: statCard, cardHead: cardHead,
    emptyState: emptyState, errorState: errorState,
    initials: initials, avatar: avatar, typeBadge: typeBadge,
    mockChip: mockChip, statusBadge: statusBadge, progress: progress
  };
})(window);
