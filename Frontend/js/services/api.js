/* ============================================================
   api.js — Centralized API service layer (Fetch API)
   ------------------------------------------------------------
   This file is READY for the PHP backend but is NOT used while
   DSS.config.USE_API === false. The backend does not need to
   exist for the frontend prototype to run.

   To integrate later:
     1. Set DSS.config.USE_API = true
     2. Set DSS.config.API_BASE_URL = "https://your-host/dss/api"
     3. Adjust endpoint paths / payload keys if the PHP API differs
        (see docs/API_INTEGRATION.md).
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;

  function ApiError(message, status, payload) {
    this.name = "ApiError";
    this.message = message || "API request failed.";
    this.status = status || 0;
    this.payload = payload || null;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function urlFor(path) {
    const base = String(DSS.config.API_BASE_URL || "").replace(/\/$/, "");
    if (/^https?:\/\//i.test(path)) return path;
    return base + path;
  }

  function parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.indexOf("application/json") >= 0) return response.json();
    return response.text().then(function (text) {
      if (!text) return null;
      try { return JSON.parse(text); } catch (e) { return { message: text }; }
    });
  }

  function normalizeEnvelope(payload) {
    // Supports common PHP shapes: {data: ...}, {success:true,data:...}, or raw arrays.
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      if (Object.prototype.hasOwnProperty.call(payload, "data")) {
        return { data: payload.data, message: payload.message || null, meta: payload.meta || null };
      }
    }
    return { data: payload, message: null, meta: null };
  }

  async function request(method, path, body, options) {
    const opts = options || {};
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, DSS.config.API_TIMEOUT);

    const init = {
      method: method.toUpperCase(),
      headers: { Accept: "application/json" },
      signal: controller.signal
    };
    if (body !== undefined && body !== null && method.toUpperCase() !== "GET") {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    if (opts.headers) Object.assign(init.headers, opts.headers);

    try {
      const response = await fetch(urlFor(path), init);
      const payload = await parseResponse(response);
      if (!response.ok) {
        const msg = (payload && (payload.message || payload.error)) || ("Request failed with status " + response.status);
        throw new ApiError(msg, response.status, payload);
      }
      return normalizeEnvelope(payload);
    } catch (error) {
      if (error.name === "AbortError") throw new ApiError("Request timed out. Please try again.", 0, null);
      if (error instanceof ApiError) throw error;
      throw new ApiError("Network error — the backend may be unavailable.", 0, null);
    } finally {
      clearTimeout(timer);
    }
  }

  // Read endpoints at call time so they stay configurable at runtime.
  const ep = new Proxy({}, { get: function (_target, key) { return DSS.config.endpoints[key]; } });

  const api = {
    ApiError: ApiError,
    enabled: function () { return !!DSS.config.USE_API; },
    request: request,

    get: function (path, options) { return request("GET", path, null, options); },
    post: function (path, body, options) { return request("POST", path, body, options); },
    put: function (path, body, options) { return request("PUT", path, body, options); },
    del: function (path, options) { return request("DELETE", path, null, options); },

    /* ---- Resource helpers ---- */
    getDashboard: function () { return request("GET", ep.dashboard); },
    getStudents: function () { return request("GET", ep.students); },
    createStudent: function (payload) { return request("POST", ep.students, payload); },
    updateStudent: function (id, payload) { return request("PUT", ep.students + "/" + encodeURIComponent(id), payload); },
    deleteStudent: function (id) { return request("DELETE", ep.students + "/" + encodeURIComponent(id)); },

    getSpecializations: function () { return request("GET", ep.specializations); },
    createSpecialization: function (payload) { return request("POST", ep.specializations, payload); },
    updateSpecialization: function (id, payload) { return request("PUT", ep.specializations + "/" + encodeURIComponent(id), payload); },
    deleteSpecialization: function (id) { return request("DELETE", ep.specializations + "/" + encodeURIComponent(id)); },

    getCriteria: function () { return request("GET", ep.criteria); },
    updateWeights: function (payload) { return request("PUT", ep.weights, payload); },

    getEvaluations: function () { return request("GET", ep.evaluations); },
    createEvaluation: function (payload) { return request("POST", ep.evaluations, payload); },
    updateEvaluation: function (id, payload) { return request("PUT", ep.evaluations + "/" + encodeURIComponent(id), payload); },
    deleteEvaluation: function (id) { return request("DELETE", ep.evaluations + "/" + encodeURIComponent(id)); },

    getResults: function (evaluationId) {
      return request("GET", ep.results + (evaluationId ? "?evaluation_id=" + encodeURIComponent(evaluationId) : ""));
    },
    calculate: function (evaluationId) { return request("POST", ep.results + "/calculate", { evaluation_id: evaluationId }); }
  };

  DSS.api = api;
})(window);
