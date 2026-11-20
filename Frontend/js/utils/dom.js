/* ============================================================
   dom.js — DOM helpers
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;

  const dom = {
    $: function (selector, root) { return (root || document).querySelector(selector); },
    $$: function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); },

    html: function (selector, markup, root) {
      const el = dom.$(selector, root);
      if (el) el.innerHTML = markup;
      return el;
    },

    on: function (target, event, selector, handler) {
      if (!target) return;
      target.addEventListener(event, function (e) {
        const match = e.target.closest(selector);
        if (match && target.contains(match)) handler.call(match, e, match);
      });
    },

    setValue: function (root, name, value) {
      const el = root.querySelector('[name="' + name + '"]');
      if (el) el.value = value === null || value === undefined ? "" : value;
    },

    getValue: function (root, name) {
      const el = root.querySelector('[name="' + name + '"]');
      return el ? el.value.trim() : "";
    },

    /** Render a field with label, error slot and hint. */
    field: function (config) {
      const esc = DSS.escape;
      const required = config.required ? '<span class="req">*</span>' : "";
      const hint = config.hint ? '<span class="field__hint">' + esc(config.hint) + "</span>" : "";
      let control = "";
      if (config.type === "select") {
        const options = (config.options || []).map(function (o) {
          const value = typeof o === "object" ? o.value : o;
          const label = typeof o === "object" ? o.label : o;
          return '<option value="' + esc(value) + '"' + (String(config.value) === String(value) ? " selected" : "") + ">" + esc(label) + "</option>";
        }).join("");
        control = '<select class="select" id="field-' + esc(config.name) + '" name="' + esc(config.name) + '"' + (config.attrs || "") + ">" + options + "</select>";
      } else if (config.type === "textarea") {
        control = '<textarea class="input" id="field-' + esc(config.name) + '" name="' + esc(config.name) + '" placeholder="' + esc(config.placeholder || "") + '"' + (config.attrs || "") + ">" + esc(config.value || "") + "</textarea>";
      } else {
        control = '<input class="input" id="field-' + esc(config.name) + '" type="' + esc(config.type || "text") + '" name="' + esc(config.name) +
          '" value="' + esc(config.value || "") + '" placeholder="' + esc(config.placeholder || "") + '"' + (config.attrs || "") + " />";
      }
      return '<div class="field' + (config.className ? " " + config.className : "") + '" data-field="' + esc(config.name) + '">' +
        '<label class="field__label" for="field-' + esc(config.name) + '">' + esc(config.label) + required + "</label>" +
        control + hint + '<span class="field__error" data-error-for="' + esc(config.name) + '"></span></div>';
    },

    /** Show a validation error on a field. */
    setFieldError: function (form, name, message) {
      const wrap = form.querySelector('[data-field="' + name + '"]');
      if (!wrap) return;
      wrap.classList.toggle("has-error", !!message);
      const slot = wrap.querySelector('[data-error-for="' + name + '"]');
      if (slot) slot.textContent = message || "";
    },

    clearErrors: function (form) {
      if (!form) return;
      form.querySelectorAll(".has-error").forEach(function (el) { el.classList.remove("has-error"); });
      form.querySelectorAll("[data-error-for]").forEach(function (el) { el.textContent = ""; });
    },

    /** Show/hide the global loading overlay. */
    loading: function (show, message) {
      const overlay = DSS.$("#loadingOverlay");
      if (!overlay) return;
      overlay.hidden = !show;
      const label = DSS.$("#loadingMessage");
      if (label && message) label.textContent = message;
    },

    /** Escape key handler registration helper. */
    onEscape: function (handler) {
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") handler(e); });
    }
  };

  DSS.dom = dom;
  // Short aliases used throughout the app.
  DSS.$ = dom.$;
  DSS.$$ = dom.$$;
  DSS.onEscape = dom.onEscape;
})(window);
