/* ============================================================
   validation.js — Reusable form validators
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const studentIdRe = /^[A-Za-z0-9\-_]{3,20}$/;

  const validation = {
    required: function (value, label) {
      if (!String(value === null || value === undefined ? "" : value).trim()) return (label || "This field") + " is required.";
      return null;
    },

    studentId: function (value) {
      const v = String(value || "").trim();
      if (!v) return "Student ID is required.";
      if (!studentIdRe.test(v)) return "Use 3–20 letters, numbers, dashes or underscores.";
      return null;
    },

    name: function (value) {
      const v = String(value || "").trim();
      if (!v) return "Full name is required.";
      if (v.length < 3) return "Full name must be at least 3 characters.";
      if (v.length > 80) return "Full name must be at most 80 characters.";
      return null;
    },

    email: function (value) {
      const v = String(value || "").trim();
      if (!v) return "Email is required.";
      if (!emailRe.test(v)) return "Enter a valid email address (e.g. name@univ-guelma.dz).";
      return null;
    },

    gpa: function (value) {
      const v = String(value || "").trim();
      if (!v) return "Academic average is required.";
      const n = Number(v);
      if (!isFinite(n) || n < 0 || n > 20) return "Average must be between 0 and 20.";
      return null;
    },

    weight: function (value) {
      const v = String(value || "").trim();
      if (!v) return "Weight is required.";
      const n = Number(v);
      if (!isFinite(n) || n < 0 || n > 1) return "Weight must be between 0 and 1.";
      return null;
    },

    score: function (value) {
      const v = String(value || "").trim();
      if (!v) return "Required";
      const n = Number(v);
      if (!isFinite(n)) return "Number required";
      if (n < DSS.config.scoreMin || n > DSS.config.scoreMax) return "1–10 only";
      return null;
    },

    description: function (value) {
      const v = String(value || "").trim();
      if (!v) return "Description is required.";
      if (v.length < 10) return "Description must be at least 10 characters.";
      return null;
    },

    /** Apply a map of { fieldName: errorMessage } to a form. */
    show: function (form, errors) {
      DSS.dom.clearErrors(form);
      let firstInvalid = null;
      Object.keys(errors || {}).forEach(function (name) {
        if (!errors[name]) return;
        DSS.dom.setFieldError(form, name, errors[name]);
        if (!firstInvalid) firstInvalid = form.querySelector('[name="' + name + '"]');
      });
      if (firstInvalid) firstInvalid.focus();
      return Object.keys(errors || {}).some(function (k) { return !!errors[k]; });
    }
  };

  DSS.validation = validation;
})(window);
