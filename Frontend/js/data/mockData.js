/* ============================================================
   mockData.js — Local sample data (clearly labelled as mock)
   IMPORTANT: This is frontend demonstration data only.
   No PHP / MySQL operations are performed by this application.
   ============================================================ */
(function (global) {
  "use strict";
  const DSS = global.DSS;

  /** Official criteria — DO NOT change names, types or default weights. */
  const DEFAULT_CRITERIA = [
    { id: "C1", code: "C1", name: "Programming", type: "maximize", weight: 0.20, description: "Programming and algorithmic skills required by the specialization." },
    { id: "C2", code: "C2", name: "Mathematics", type: "maximize", weight: 0.15, description: "Mathematical and quantitative foundation of the specialization." },
    { id: "C3", code: "C3", name: "Alignment with Student's Competencies", type: "maximize", weight: 0.20, description: "Fit between the student's current skills and the specialization." },
    { id: "C4", code: "C4", name: "Career Opportunities", type: "maximize", weight: 0.20, description: "Professional and employment outlook after graduation." },
    { id: "C5", code: "C5", name: "Difficulty", type: "minimize", weight: 0.10, description: "Perceived difficulty — LOWER scores are preferred (minimized)." },
    { id: "C6", code: "C6", name: "Personal Interest", type: "maximize", weight: 0.15, description: "Student's personal interest and motivation." }
  ];

  /** The four official predefined alternatives — DO NOT remove. */
  const DEFAULT_SPECIALIZATIONS = [
    {
      id: "P1", code: "P1", name: "Artificial Intelligence", icon: "sparkles", color: "#2563eb", predefined: true,
      description: "Machine learning, deep learning, natural language processing and intelligent systems design."
    },
    {
      id: "P2", code: "P2", name: "Cybersecurity", icon: "shield", color: "#7c3aed", predefined: true,
      description: "Network security, cryptography, penetration testing and digital threat protection."
    },
    {
      id: "P3", code: "P3", name: "Data Science", icon: "database", color: "#0891b2", predefined: true,
      description: "Data analysis, statistics, data engineering, visualization and predictive modeling."
    },
    {
      id: "P4", code: "P4", name: "Information Systems and Software Engineering", icon: "code", color: "#ea580c", predefined: true,
      description: "Software architecture, requirements engineering, databases and enterprise information systems."
    }
  ];

  const DEFAULT_STUDENTS = [
    { id: "S001", studentId: "S001", fullName: "Amelia Chen", email: "amelia.chen@univ-guelma.dz", program: "Computer Science", level: "Licence 3", average: 17.25, status: "active" },
    { id: "S002", studentId: "S002", fullName: "Karim Benali", email: "karim.benali@univ-guelma.dz", program: "Software Engineering", level: "Licence 3", average: 15.80, status: "active" },
    { id: "S003", studentId: "S003", fullName: "Sofia Martins", email: "sofia.martins@univ-guelma.dz", program: "Information Systems", level: "Licence 3", average: 16.40, status: "active" },
    { id: "S004", studentId: "S004", fullName: "Yacine Brahimi", email: "yacine.brahimi@univ-guelma.dz", program: "Computer Science", level: "Licence 3", average: 14.20, status: "active" },
    { id: "S005", studentId: "S005", fullName: "Lina Haddad", email: "lina.haddad@univ-guelma.dz", program: "Software Engineering", level: "Licence 3", average: 18.10, status: "active" },
    { id: "S006", studentId: "S006", fullName: "Omar Zerrouki", email: "omar.zerrouki@univ-guelma.dz", program: "Information Systems", level: "Licence 3", average: 13.75, status: "active" },
    { id: "S007", studentId: "S007", fullName: "Nour El Idrissi", email: "nour.elidrissi@univ-guelma.dz", program: "Computer Science", level: "Licence 3", average: 16.90, status: "active" },
    { id: "S008", studentId: "S008", fullName: "Malik Bouzid", email: "malik.bouzid@univ-guelma.dz", program: "Software Engineering", level: "Licence 3", average: 12.60, status: "inactive" }
  ];

  /* Sample score matrices: each specialization has 6 scores (one per criterion). */
  const scoresA = {
    P1: { C1: 9, C2: 8, C3: 9, C4: 9, C5: 5, C6: 9 },
    P2: { C1: 7, C2: 6, C3: 7, C4: 9, C5: 7, C6: 7 },
    P3: { C1: 8, C2: 9, C3: 8, C4: 8, C5: 4, C6: 8 },
    P4: { C1: 8, C2: 6, C3: 9, C4: 8, C5: 3, C6: 6 }
  };
  const scoresB = {
    P1: { C1: 7, C2: 7, C3: 6, C4: 8, C5: 6, C6: 6 },
    P2: { C1: 8, C2: 6, C3: 9, C4: 9, C5: 5, C6: 9 },
    P3: { C1: 8, C2: 8, C3: 7, C4: 8, C5: 7, C6: 7 },
    P4: { C1: 9, C2: 5, C3: 9, C4: 8, C5: 4, C6: 8 }
  };
  /* Deliberate tie: P1 and P3 have identical rows -> identical WSM final scores. */
  const scoresTie = {
    P1: { C1: 8, C2: 8, C3: 8, C4: 8, C5: 6, C6: 8 },
    P2: { C1: 6, C2: 7, C3: 7, C4: 8, C5: 5, C6: 7 },
    P3: { C1: 8, C2: 8, C3: 8, C4: 8, C5: 6, C6: 8 },
    P4: { C1: 7, C2: 6, C3: 8, C4: 7, C5: 4, C6: 6 }
  };

  const DEFAULT_EVALUATIONS = [
    { id: "E-1003", studentId: "S005", label: "Sample evaluation — Lina Haddad", source: "mock", status: "saved", createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), scores: scoresTie },
    { id: "E-1002", studentId: "S002", label: "Sample evaluation — Karim Benali", source: "mock", status: "saved", createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), scores: scoresB },
    { id: "E-1001", studentId: "S001", label: "Sample evaluation — Amelia Chen", source: "mock", status: "saved", createdAt: new Date(Date.now() - 8 * 86400000).toISOString(), scores: scoresA }
  ];

  const DEFAULT_ACTIVITY = [
    { id: "A1", type: "evaluation", text: "Sample evaluation saved for <strong>Lina Haddad</strong>", at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: "A2", type: "criteria", text: "Criteria weights aligned with the <strong>official WSM configuration</strong>", at: new Date(Date.now() - 6 * 86400000).toISOString() },
    { id: "A3", type: "student", text: "Student record created for <strong>Amelia Chen</strong>", at: new Date(Date.now() - 9 * 86400000).toISOString() }
  ];

  DSS.mockData = {
    isMock: true,
    criteria: DEFAULT_CRITERIA,
    specializations: DEFAULT_SPECIALIZATIONS,
    students: DEFAULT_STUDENTS,
    evaluations: DEFAULT_EVALUATIONS,
    activity: DEFAULT_ACTIVITY,

    fresh: function () {
      return {
        criteria: DSS.clone(DEFAULT_CRITERIA),
        specializations: DSS.clone(DEFAULT_SPECIALIZATIONS),
        students: DSS.clone(DEFAULT_STUDENTS),
        evaluations: DSS.clone(DEFAULT_EVALUATIONS),
        activity: DSS.clone(DEFAULT_ACTIVITY)
      };
    }
  };
})(window);
