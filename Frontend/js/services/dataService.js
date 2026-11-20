/* ============================================================
   dataService.js — Data access layer used by UI views.
   Hides the difference between LocalStorage mock data and the
   future PHP API. Views never touch storage or fetch directly.
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const api = DSS.api;

  function useApi() { return api.enabled(); }

  function mockList(name) { return DSS.storage.get(name, []); }

  async function maybeRemote(remoteFn, localFn) {
    if (useApi()) {
      const result = await remoteFn();
      return result.data;
    }
    await DSS.delay(DSS.config.MOCK_LATENCY);
    return localFn();
  }

  function requireUnique(list, key, value, ignoreId, label) {
    const found = list.some(function (item) {
      return String(item[key]).toLowerCase() === String(value).toLowerCase() && item.id !== ignoreId;
    });
    if (found) throw new Error((label || "Record") + " with this " + key + " already exists.");
  }

  const service = {
    init: function () { DSS.storage.init(); },
    isMock: function () { return !useApi(); },
    modeLabel: function () { return useApi() ? "Live API data" : "Mock data (LocalStorage)"; },

    /* ---------------- Students ---------------- */
    students: {
      list: function () {
        return maybeRemote(api.getStudents, function () { return mockList("students"); });
      },
      create: function (payload) {
        return maybeRemote(
          function () { return api.createStudent(payload); },
          function () {
            const list = mockList("students");
            requireUnique(list, "studentId", payload.studentId, null, "Student");
            const record = Object.assign({ id: payload.studentId || DSS.uid("S") }, payload, { source: "mock" });
            list.unshift(record);
            DSS.storage.set("students", list);
            DSS.storage.addActivity("Student record created for <strong>" + DSS.escape(payload.fullName) + "</strong>", "student");
            return record;
          }
        );
      },
      update: function (id, payload) {
        return maybeRemote(
          function () { return api.updateStudent(id, payload); },
          function () {
            const list = mockList("students");
            requireUnique(list, "studentId", payload.studentId, id, "Student");
            const index = list.findIndex(function (s) { return s.id === id; });
            if (index < 0) throw new Error("Student not found.");
            list[index] = Object.assign({}, list[index], payload);
            DSS.storage.set("students", list);
            DSS.storage.addActivity("Student record updated for <strong>" + DSS.escape(payload.fullName) + "</strong>", "student");
            return list[index];
          }
        );
      },
      remove: function (id) {
        return maybeRemote(
          function () { return api.deleteStudent(id); },
          function () {
            const list = mockList("students");
            const target = list.find(function (s) { return s.id === id; });
            if (!target) throw new Error("Student not found.");
            DSS.storage.set("students", list.filter(function (s) { return s.id !== id; }));
            DSS.storage.addActivity("Student record removed: <strong>" + DSS.escape(target.fullName) + "</strong>", "student");
            return true;
          }
        );
      }
    },

    /* ---------------- Specializations ---------------- */
    specializations: {
      list: function () {
        return maybeRemote(api.getSpecializations, function () { return mockList("specializations"); });
      },
      create: function (payload) {
        return maybeRemote(
          function () { return api.createSpecialization(payload); },
          function () {
            const list = mockList("specializations");
            requireUnique(list, "code", payload.code, null, "Specialization");
            const record = Object.assign({ id: payload.code || DSS.uid("P"), predefined: false, source: "mock" }, payload);
            list.push(record);
            DSS.storage.set("specializations", list);
            DSS.storage.addActivity("Specialization added: <strong>" + DSS.escape(payload.name) + "</strong>", "specialization");
            return record;
          }
        );
      },
      update: function (id, payload) {
        return maybeRemote(
          function () { return api.updateSpecialization(id, payload); },
          function () {
            const list = mockList("specializations");
            requireUnique(list, "code", payload.code, id, "Specialization");
            const index = list.findIndex(function (s) { return s.id === id; });
            if (index < 0) throw new Error("Specialization not found.");
            const next = Object.assign({}, list[index], payload);
            if (list[index].predefined) next.code = list[index].code; // official codes are immutable
            list[index] = next;
            DSS.storage.set("specializations", list);
            DSS.storage.addActivity("Specialization updated: <strong>" + DSS.escape(payload.name) + "</strong>", "specialization");
            return next;
          }
        );
      },
      remove: function (id) {
        return maybeRemote(
          function () { return api.deleteSpecialization(id); },
          function () {
            const list = mockList("specializations");
            const target = list.find(function (s) { return s.id === id; });
            if (!target) throw new Error("Specialization not found.");
            if (target.predefined) throw new Error("The four official alternatives cannot be deleted.");
            DSS.storage.set("specializations", list.filter(function (s) { return s.id !== id; }));
            DSS.storage.addActivity("Specialization removed: <strong>" + DSS.escape(target.name) + "</strong>", "specialization");
            return true;
          }
        );
      }
    },

    /* ---------------- Criteria ---------------- */
    criteria: {
      list: function () {
        return maybeRemote(api.getCriteria, function () { return mockList("criteria"); });
      },
      saveWeights: function (weights) {
        return maybeRemote(
          function () { return api.updateWeights({ weights: weights }); },
          function () {
            const list = mockList("criteria");
            const next = list.map(function (c) { return Object.assign({}, c, { weight: DSS.round(Number(weights[c.id]), 4) }); });
            DSS.storage.set("criteria", next);
            DSS.storage.addActivity("Criterion weights updated and validated to <strong>100%</strong>", "criteria");
            return next;
          }
        );
      },
      reset: function () {
        const fresh = DSS.mockData.fresh().criteria;
        if (useApi()) return api.updateWeights({ weights: fresh.reduce(function (a, c) { a[c.id] = c.weight; return a; }, {}), reset: true }).then(function () { return fresh; });
        DSS.storage.set("criteria", fresh);
        DSS.storage.addActivity("Criteria reset to <strong>official WSM defaults</strong>", "criteria");
        return Promise.resolve(fresh);
      }
    },

    /* ---------------- Evaluations ---------------- */
    evaluations: {
      list: function () {
        return maybeRemote(api.getEvaluations, function () { return mockList("evaluations"); });
      },
      get: function (id) {
        return service.evaluations.list().then(function (list) {
          const found = list.find(function (e) { return e.id === id; });
          if (!found) throw new Error("Evaluation not found.");
          return found;
        });
      },
      create: function (payload) {
        return maybeRemote(
          function () { return api.createEvaluation(payload); },
          function () {
            const list = mockList("evaluations");
            const record = Object.assign({ id: DSS.uid("E"), createdAt: new Date().toISOString(), source: "mock" }, payload);
            list.unshift(record);
            DSS.storage.set("evaluations", list);
            DSS.storage.addActivity("New evaluation saved for <strong>" + DSS.escape(payload.studentName || payload.studentId) + "</strong>", "evaluation");
            return record;
          }
        );
      }
    },

    /* ---------------- Results ---------------- */
    results: {
      /** Compute WSM locally for demonstration; backend remains authoritative in API mode. */
      compute: async function (evaluationId) {
        if (useApi()) {
          const remote = await api.calculate(evaluationId);
          return Object.assign({ source: "api" }, remote.data);
        }
        await DSS.delay(DSS.config.MOCK_LATENCY);
        const evaluation = await service.evaluations.get(evaluationId);
        const criteria = await service.criteria.list();
        const specializations = await service.specializations.list();
        const result = DSS.wsm.compute(evaluation, criteria, specializations);
        return Object.assign(result, { source: "mock", computedAt: new Date().toISOString() });
      }
    },

    activity: function () { return DSS.storage.get("activity", []); }
  };

  DSS.data = service;
})(window);
