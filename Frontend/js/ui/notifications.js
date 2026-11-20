/* ============================================================
   notifications.js — Toast notifications
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;

  const ICONS = { success: "checkCircle", error: "alertTriangle", warning: "alert", info: "info" };

  function toast(message, type, title, duration) {
    const root = DSS.$("#toastRoot");
    if (!root) return;
    const kind = ICONS[type] ? type : "info";
    const el = document.createElement("div");
    el.className = "toast toast--" + kind;
    el.setAttribute("role", kind === "error" ? "alert" : "status");
    el.innerHTML =
      '<span class="toast__icon">' + DSS.icon(ICONS[kind]) + "</span>" +
      '<div class="toast__body"><strong>' + DSS.escape(title || (kind === "success" ? "Success" : kind === "error" ? "Error" : kind === "warning" ? "Warning" : "Information")) + "</strong>" +
      "<p>" + DSS.escape(message) + "</p></div>" +
      '<button class="toast__close" type="button" aria-label="Dismiss">' + DSS.icon("close") + "</button>";
    root.appendChild(el);

    let timer;
    const dismiss = function () {
      clearTimeout(timer);
      el.classList.add("is-leaving");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    };
    el.querySelector(".toast__close").addEventListener("click", dismiss);
    timer = setTimeout(dismiss, duration || 4200);
  }

  DSS.notify = {
    success: function (msg, title) { toast(msg, "success", title); },
    error: function (msg, title) { toast(msg, "error", title); },
    warning: function (msg, title) { toast(msg, "warning", title); },
    info: function (msg, title) { toast(msg, "info", title); }
  };
})(window);
