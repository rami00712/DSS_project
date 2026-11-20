/* ============================================================
   modal.js — Accessible modal dialogs and confirmations
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;

  let activeModal = null;
  let lastFocused = null;

  function close() {
    if (!activeModal) return;
    const overlay = activeModal.overlay;
    overlay.classList.remove("is-open");
    overlay.remove();
    activeModal = null;
    document.body.style.overflow = "";
    if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
  }

  /**
   * Open a modal.
   * options: { title, subtitle, body, confirmText, cancelText, size, onConfirm(form), onOpen(modal), hideFooter }
   */
  function open(options) {
    close();
    lastFocused = document.activeElement;
    const opts = options || {};
    const root = DSS.$("#modalRoot");
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML =
      '<div class="modal ' + (opts.size ? "modal--" + opts.size : "") + '" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
      '<div class="modal__head"><div><h2 id="modalTitle">' + DSS.escape(opts.title || "Dialog") + "</h2>" +
      (opts.subtitle ? '<p>' + DSS.escape(opts.subtitle) + "</p>" : "") + "</div>" +
      '<button class="icon-btn" type="button" data-modal-close aria-label="Close dialog">' + DSS.icon("close") + "</button></div>" +
      '<form class="modal__form" novalidate><div class="modal__body">' + (opts.body || "") + "</div>" +
      (opts.hideFooter ? "" :
        '<div class="modal__foot">' +
        '<button class="btn btn--secondary" type="button" data-modal-close>' + DSS.escape(opts.cancelText || "Cancel") + "</button>" +
        '<button class="btn btn--primary" type="submit">' + DSS.icon(opts.confirmIcon || "check") + DSS.escape(opts.confirmText || "Save") + "</button>" +
        "</div>") +
      "</form></div>";
    root.appendChild(overlay);
    document.body.style.overflow = "hidden";

    const form = overlay.querySelector(".modal__form");
    overlay.querySelectorAll("[data-modal-close]").forEach(function (btn) { btn.addEventListener("click", close); });
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay && opts.closeOnBackdrop !== false) close(); });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (typeof opts.onConfirm !== "function") { close(); return; }
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        const result = await opts.onConfirm(form, close);
        if (result !== false) close();
      } catch (error) {
        DSS.notify.error(error.message || "Unexpected error.", "Could not save");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    activeModal = { overlay: overlay, form: form };
    if (typeof opts.onOpen === "function") opts.onOpen(form, overlay);

    setTimeout(function () {
      const first = overlay.querySelector("input, select, textarea, [data-autofocus]");
      if (first) first.focus();
    }, 60);
    return activeModal;
  }

  /** Custom confirmation dialog (replaces window.confirm). */
  function confirm(options) {
    const opts = typeof options === "string" ? { message: options } : (options || {});
    return new Promise(function (resolve) {
      open({
        title: opts.title || "Confirm action",
        subtitle: opts.subtitle || "",
        size: "sm",
        confirmText: opts.confirmText || "Confirm",
        confirmIcon: opts.danger ? "trash" : "check",
        body: '<div class="note note--' + (opts.danger ? "red" : "blue") + '">' +
          DSS.icon(opts.danger ? "alertTriangle" : "info") + "<div>" + (opts.html ? opts.message : DSS.escape(opts.message || "Are you sure?")) + "</div></div>",
        onOpen: function (form) {
          const submit = form.querySelector('button[type="submit"]');
          if (submit && opts.danger) submit.className = "btn btn--danger";
        },
        onConfirm: function () { resolve(true); return true; }
      });
      // Handle cancel/backdrop/close as a rejection.
      const overlay = DSS.$("#modalRoot .modal-overlay");
      if (overlay) {
        overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) resolve(false); });
        overlay.querySelectorAll("[data-modal-close]").forEach(function (btn) { btn.addEventListener("click", function () { resolve(false); }); });
      }
    });
  }

  DSS.modal = { open: open, close: close, confirm: confirm };
})(window);
