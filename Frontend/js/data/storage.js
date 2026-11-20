/* ============================================================
   storage.js — LocalStorage persistence for the mock data layer.
   Only mock data is stored here; this is NOT a database.
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const KEYS = DSS.config.storageKeys;

  let memoryFallback = {};
  const listeners = [];

  function available() {
    try {
      const k = "__dss_test__";
      global.localStorage.setItem(k, "1");
      global.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  const canUseLS = available();

  function read(key, fallback) {
    try {
      const raw = canUseLS ? global.localStorage.getItem(key) : memoryFallback[key];
      if (raw === null || raw === undefined) return DSS.clone(fallback);
      const parsed = JSON.parse(raw);
      return parsed === null ? DSS.clone(fallback) : parsed;
    } catch (e) {
      console.warn("[DSS storage] Could not read", key, e);
      return DSS.clone(fallback);
    }
  }

  function write(key, value) {
    const raw = JSON.stringify(value);
    try {
      if (canUseLS) global.localStorage.setItem(key, raw);
      else memoryFallback[key] = raw;
    } catch (e) {
      console.warn("[DSS storage] Could not persist", key, e);
      memoryFallback[key] = raw;
    }
    notify();
    return value;
  }

  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) { console.warn(e); } }); }

  function seedIfEmpty() {
    const sample = DSS.mockData.fresh();
    if (!read(KEYS.students, null)) write(KEYS.students, sample.students);
    if (!read(KEYS.specializations, null)) write(KEYS.specializations, sample.specializations);
    if (!read(KEYS.criteria, null)) write(KEYS.criteria, sample.criteria);
    if (!read(KEYS.evaluations, null)) write(KEYS.evaluations, sample.evaluations);
    if (!read(KEYS.activity, null)) write(KEYS.activity, sample.activity);
  }

  DSS.storage = {
    isPersistent: canUseLS,

    init: seedIfEmpty,

    get: function (name, fallback) {
      const key = KEYS[name];
      if (!key) return DSS.clone(fallback);
      return read(key, fallback);
    },

    set: function (name, value) {
      const key = KEYS[name];
      if (!key) return value;
      return write(key, value);
    },

    reset: function () {
      const sample = DSS.mockData.fresh();
      write(KEYS.students, sample.students);
      write(KEYS.specializations, sample.specializations);
      write(KEYS.criteria, sample.criteria);
      write(KEYS.evaluations, sample.evaluations);
      write(KEYS.activity, sample.activity);
      write(KEYS.ui, {});
      return sample;
    },

    addActivity: function (text, type) {
      const list = read(KEYS.activity, []);
      list.unshift({ id: DSS.uid("A"), type: type || "general", text: text, at: new Date().toISOString() });
      write(KEYS.activity, list.slice(0, 40));
    },

    onChange: function (fn) { listeners.push(fn); return function () { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },

    ui: {
      get: function (key, fallback) { const ui = read(KEYS.ui, {}); return Object.prototype.hasOwnProperty.call(ui, key) ? ui[key] : fallback; },
      set: function (key, value) { const ui = read(KEYS.ui, {}); ui[key] = value; write(KEYS.ui, ui); }
    }
  };
})(window);
