/* ============================================================
   config.js — Application configuration
   Change API_BASE_URL / USE_API when the PHP backend is ready.
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;

  DSS.config = {
    appName: "DSS — Specialization Decision Support System",
    organization: "University of Guelma · 3rd Year ISIL",

    /**
     * Data source switch.
     * false = use LocalStorage mock data (current prototype mode).
     * true  = use the centralized Fetch API service (backend integration).
     * The API is never called while USE_API is false.
     */
    USE_API: false,

    /** Base URL of the PHP backend, e.g. "https://example.edu/dss/api". */
    API_BASE_URL: "",

    /** Configurable endpoint paths (relative to API_BASE_URL). */
    endpoints: {
      students: "/students",
      specializations: "/specializations",
      criteria: "/criteria",
      evaluations: "/evaluations",
      results: "/results",
      dashboard: "/dashboard",
      weights: "/criteria/weights"
    },

    /** Request timeout in milliseconds. */
    API_TIMEOUT: 12000,

    /** Simulated latency for mock operations (ms). */
    MOCK_LATENCY: 180,

    /** Storage keys. */
    storageKeys: {
      students: "dss.students.v1",
      specializations: "dss.specializations.v1",
      criteria: "dss.criteria.v1",
      evaluations: "dss.evaluations.v1",
      activity: "dss.activity.v1",
      ui: "dss.ui.v1"
    },

    /** Decision method in use — must remain WSM. */
    decisionMethod: "Weighted Sum Model (WSM)",
    scoreMin: 1,
    scoreMax: 10,
    weightTolerance: 0.0005
  };
})(window);
