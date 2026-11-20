/* ============================================================
   views/students.js — Student management (CRUD, search, filters)
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;
  const esc = DSS.escape;

  const PROGRAMS = ["Computer Science", "Software Engineering", "Information Systems", "Other"];
  const LEVELS = ["Licence 1", "Licence 2", "Licence 3", "Master 1", "Master 2"];

  const state = { search: "", program: "all", status: "all" };
  let cache = [];
  let containerRef = null;

  function filtered() {
    const q = state.search.trim().toLowerCase();
    return cache.filter(function (s) {
      const matchQ = !q || [s.studentId, s.fullName, s.email, s.program].some(function (v) { return String(v || "").toLowerCase().indexOf(q) >= 0; });
      const matchP = state.program === "all" || s.program === state.program;
      const matchS = state.status === "all" || s.status === state.status;
      return matchQ && matchP && matchS;
    });
  }

  function rowsHtml(list) {
    if (!list.length) {
      return '<tr><td colspan="6" class="table__empty">' +
        DSS.ui.emptyState({
          icon: "users", title: "No students found",
          message: "Try a different search or filter, or add a new student record.",
          action: '<button class="btn btn--primary btn--sm" data-action="add">' + DSS.icon("plus") + "Add student</button>"
        }) + "</td></tr>";
    }
    return list.map(function (s, i) {
      return "<tr>" +
        '<td><div class="cell-person">' + DSS.ui.avatar(s.fullName, i) +
        "<div><strong>" + esc(s.fullName) + "</strong><small>" + esc(s.email) + "</small></div></div></td>" +
        '<td class="mono fw-700">' + esc(s.studentId) + "</td>" +
        "<td><div class=\"flex flex-wrap gap-1 items-center\"><span class=\"badge badge--blue\">" + esc(s.program) + "</span>" +
        '<span class="muted" style="font-size:11px">' + esc(s.level) + "</span></div></td>" +
        "<td><strong>" + DSS.formatNumber(s.average, 2) + '</strong> <span class="muted">/ 20</span></td>' +
        "<td>" + DSS.ui.statusBadge(s.status) + "</td>" +
        '<td><div class="row-actions">' +
        '<button class="icon-btn btn--icon btn--sm" data-action="edit" data-id="' + esc(s.id) + '" title="Edit student" aria-label="Edit ' + esc(s.fullName) + '">' + DSS.icon("edit") + "</button>" +
        '<button class="icon-btn btn--icon btn--sm" data-action="delete" data-id="' + esc(s.id) + '" title="Delete student" aria-label="Delete ' + esc(s.fullName) + '">' + DSS.icon("trash") + "</button>" +
        "</div></td></tr>";
    }).join("");
  }

  function updateTable() {
    if (!containerRef) return;
    const list = filtered();
    const body = containerRef.querySelector("#studentsTableBody");
    if (body) body.innerHTML = rowsHtml(list);
    const counter = containerRef.querySelector("#studentsCount");
    if (counter) counter.textContent = "Showing " + list.length + " of " + cache.length + " students";
  }

  function formBody(student) {
    return '<div class="form-grid">' +
      DSS.dom.field({ name: "studentId", label: "Student ID", value: student ? student.studentId : "", placeholder: "e.g. S009", required: true }) +
      DSS.dom.field({ name: "fullName", label: "Full name", value: student ? student.fullName : "", placeholder: "First and last name", required: true }) +
      DSS.dom.field({ name: "email", label: "Email", type: "email", value: student ? student.email : "", placeholder: "name@univ-guelma.dz", required: true, className: "form-span-2" }) +
      DSS.dom.field({ name: "program", label: "Program", type: "select", value: student ? student.program : PROGRAMS[0], options: PROGRAMS, required: true }) +
      DSS.dom.field({ name: "level", label: "Academic level", type: "select", value: student ? student.level : "Licence 3", options: LEVELS, required: true }) +
      DSS.dom.field({ name: "average", label: "Academic average (/20)", type: "number", value: student ? student.average : "", placeholder: "0 – 20", required: true, attrs: ' min="0" max="20" step="0.01"' }) +
      DSS.dom.field({ name: "status", label: "Status", type: "select", value: student ? student.status : "active", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }], required: true }) +
      "</div>";
  }

  function openForm(student) {
    const editing = !!student;
    DSS.modal.open({
      title: editing ? "Edit student" : "Add new student",
      subtitle: editing ? "Update the academic record below." : "Create a local sample student record.",
      confirmText: editing ? "Save changes" : "Add student",
      body: formBody(student),
      onConfirm: async function (form) {
        DSS.dom.clearErrors(form);
        const payload = {
          studentId: DSS.dom.getValue(form, "studentId").toUpperCase(),
          fullName: DSS.dom.getValue(form, "fullName"),
          email: DSS.dom.getValue(form, "email").toLowerCase(),
          program: DSS.dom.getValue(form, "program"),
          level: DSS.dom.getValue(form, "level"),
          average: Number(DSS.dom.getValue(form, "average")),
          status: DSS.dom.getValue(form, "status")
        };
        const errors = {
          studentId: DSS.validation.studentId(payload.studentId),
          fullName: DSS.validation.name(payload.fullName),
          email: DSS.validation.email(payload.email),
          average: DSS.validation.gpa(payload.average)
        };
        if (DSS.validation.show(form, errors)) return false;
        try {
          DSS.dom.loading(true, editing ? "Updating student…" : "Adding student…");
          if (editing) await DSS.data.students.update(student.id, payload);
          else await DSS.data.students.create(payload);
          DSS.notify.success(editing ? "Student record updated." : "Student added successfully.", "Saved");
          await render(containerRef);
          return true;
        } catch (error) {
          DSS.notify.error(error.message, "Could not save student");
          return false;
        } finally {
          DSS.dom.loading(false);
        }
      }
    });
  }

  async function removeStudent(id) {
    const student = cache.find(function (s) { return s.id === id; });
    if (!student) return;
    const ok = await DSS.modal.confirm({
      title: "Delete student?",
      message: "This will remove <strong>" + esc(student.fullName) + "</strong> (" + esc(student.studentId) + ") from the local sample data. This action cannot be undone.",
      html: true, danger: true, confirmText: "Delete student"
    });
    if (!ok) return;
    try {
      DSS.dom.loading(true, "Deleting student…");
      await DSS.data.students.remove(id);
      DSS.notify.success("Student record deleted.", "Deleted");
      await render(containerRef);
    } catch (error) {
      DSS.notify.error(error.message, "Could not delete");
    } finally {
      DSS.dom.loading(false);
    }
  }

  function exportCsv() {
    const list = filtered();
    if (!list.length) { DSS.notify.warning("No students to export with the current filters.", "Export"); return; }
    const header = ["Student ID", "Full Name", "Email", "Program", "Level", "Average", "Status"];
    const lines = [header].concat(list.map(function (s) {
      return [s.studentId, s.fullName, s.email, s.program, s.level, s.average, s.status];
    }));
    const csv = lines.map(function (row) {
      return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url; a.download = "dss-students.csv"; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    DSS.notify.success("CSV file downloaded.", "Export complete");
  }

  async function render(container) {
    containerRef = container;
    cache = await DSS.data.students.list();
    const programs = Array.from(new Set(cache.map(function (s) { return s.program; }).concat(PROGRAMS)));

    container.innerHTML =
      DSS.ui.pageHead({
        title: "Students",
        subtitle: "Manage student records used by the evaluation workflow",
        breadcrumb: "Students",
        actions: [
          '<button class="btn btn--secondary" data-action="export">' + DSS.icon("download") + "Export CSV</button>",
          '<button class="btn btn--primary" data-action="add">' + DSS.icon("plus") + "Add student</button>"
        ].join("")
      }) +
      '<section class="card">' +
      '<div class="toolbar">' +
      '<div class="search-box">' + DSS.icon("search") +
      '<input class="input" type="search" id="studentSearch" placeholder="Search by name, ID or email…" value="' + esc(state.search) + '" aria-label="Search students" /></div>' +
      '<div class="toolbar__filters">' +
      '<select class="select" id="programFilter" aria-label="Filter by program"><option value="all">All programs</option>' +
      programs.map(function (p) { return '<option value="' + esc(p) + '"' + (state.program === p ? " selected" : "") + ">" + esc(p) + "</option>"; }).join("") + "</select>" +
      '<select class="select" id="statusFilter" aria-label="Filter by status"><option value="all">All statuses</option>' +
      '<option value="active"' + (state.status === "active" ? " selected" : "") + ">Active</option>" +
      '<option value="inactive"' + (state.status === "inactive" ? " selected" : "") + ">Inactive</option></select>" +
      '<span class="toolbar__result" id="studentsCount"></span></div></div>' +
      '<div class="table-wrap"><table class="table" id="studentsTable"><thead><tr>' +
      "<th>Student</th><th>Student ID</th><th>Academic information</th><th>Average</th><th>Status</th><th class=\"text-right\">Actions</th>" +
      "</tr></thead><tbody id=\"studentsTableBody\"></tbody></table></div>" +
      '<div class="card__footer"><span class="muted" style="font-size:11px">' + DSS.ui.mockChip() +
      " Records are stored in your browser for this prototype.</span></div></section>";

    updateTable();

    const search = container.querySelector("#studentSearch");
    search.addEventListener("input", DSS.debounce(function () { state.search = search.value; updateTable(); }, 160));
    container.querySelector("#programFilter").addEventListener("change", function (e) { state.program = e.target.value; updateTable(); });
    container.querySelector("#statusFilter").addEventListener("change", function (e) { state.status = e.target.value; updateTable(); });

    DSS.dom.on(container, "click", "[data-action]", function (e, btn) {
      const action = btn.getAttribute("data-action");
      if (action === "add") openForm();
      else if (action === "edit") {
        const student = cache.find(function (s) { return s.id === btn.getAttribute("data-id"); });
        if (student) openForm(student);
      } else if (action === "delete") removeStudent(btn.getAttribute("data-id"));
      else if (action === "export") exportCsv();
    });
  }

  DSS.views = DSS.views || {};
  DSS.views.students = { render: render, openForm: openForm };
})(window);
