# DSS Frontend — Specialization Decision Support System

Professional, responsive **frontend-only** prototype for the university DSS project (3rd Year ISIL, University of Guelma).

> Built with **HTML5, CSS3 and Vanilla JavaScript only**. No frameworks, no build tools, no PHP and no SQL.

---

## 1. Quick start

No installation is required.

1. Open `frontend/index.html` in a modern browser (Chrome, Edge, Firefox, Safari).
   - Or serve it locally, e.g. `npx serve .` / VS Code "Live Server" from the `frontend` folder.
2. The app boots in **demo mode** using clearly labelled sample data stored in `localStorage`.
3. Use the sidebar to move between the six sections.

Fonts (Manrope / DM Sans) load from Google Fonts when online. Offline, the CSS falls back to system fonts — the app still works.

---

## 2. Sections

| # | Section | What it does |
|---|---------|--------------|
| 1 | Dashboard | Live counts, latest recommendation (tie-aware), best-performing specialization, ranking overview, score charts, activity feed, quick actions |
| 2 | Students | Table with search, program/status filters, add/edit/delete, validation, confirmation dialogs, CSV export |
| 3 | Specializations | The four official alternatives (P1–P4) as cards, plus add/edit/delete/search/filter for custom alternatives. Official ones are protected from deletion |
| 4 | Criteria & Weights | The six official criteria, editable weights, live total, exact 100% validation, reset to official defaults |
| 5 | Evaluation | Student selector, 4 × 6 score inputs, 1–10 validation, progress tracking, save draft, save & calculate |
| 6 | Results & Ranking | Descending ranking, recommendation status, tie detection, comparison charts and full WSM breakdown (raw / normalized / weight / weighted / final) |

---

## 3. Official model (do not change)

### Alternatives

| Code | Name |
|------|------|
| P1 | Artificial Intelligence |
| P2 | Cybersecurity |
| P3 | Data Science |
| P4 | Information Systems and Software Engineering |

### Criteria and default weights

| Criterion | Type | Weight |
|-----------|------|--------|
| Programming | Maximize | 0.20 |
| Mathematics | Maximize | 0.15 |
| Alignment with Student's Competencies | Maximize | 0.20 |
| Career Opportunities | Maximize | 0.20 |
| Difficulty | **Minimize** | 0.10 |
| Personal Interest | Maximize | 0.15 |

Sum = **1.00 (100%)**. The frontend blocks saving weights unless the total equals 1.00 within a small tolerance.

### Decision method — WSM only

`js/wsm.js` implements the presentation-layer Weighted Sum Model:

- Maximization: `normalized = score / bestScore`
- Minimization (Difficulty): `normalized = lowestScore / score`
- Weighted: `normalized × weight`
- Final: `sum of weighted values`
- Ranking: descending by final score
- Ties: alternatives within `1e-6` of the highest score share rank 1 and the UI **never** displays a unique winner.

**The PHP backend remains authoritative.** Frontend results are demonstration calculations, clearly labelled "Sample calculation" / "Mock".

---

## 4. Folder structure

```
frontend/
├── index.html                 # Single-page shell
├── css/
│   ├── variables.css          # Design tokens (colors, spacing, radius, shadows)
│   ├── base.css               # Reset, typography, forms, buttons, utilities
│   ├── layout.css             # Sidebar, topbar, content, grids
│   ├── components.css         # Cards, tables, charts, modals, toasts, states
│   └── responsive.css         # Tablet & mobile breakpoints
├── js/
│   ├── core.js                # Namespace, icon library, shared helpers
│   ├── config.js              # API / storage / method configuration
│   ├── router.js              # Hash-based SPA routing
│   ├── app.js                 # Bootstrap + global chrome interactions
│   ├── wsm.js                 # WSM presentation calculations + tie logic
│   ├── data/
│   │   ├── mockData.js        # All sample data (separate from UI)
│   │   └── storage.js         # LocalStorage wrapper (mock only)
│   ├── services/
│   │   ├── api.js             # Central Fetch API service (disabled by default)
│   │   └── dataService.js     # Data abstraction used by views
│   ├── utils/
│   │   ├── dom.js             # DOM + form helpers
│   │   ├── validation.js      # Reusable validators
│   │   └── charts.js          # Dependency-free CSS/SVG charts
│   ├── ui/
│   │   ├── notifications.js   # Toast notifications
│   │   ├── modal.js           # Modal dialogs + confirmations
│   │   └── components.js      # Reusable markup helpers
│   └── views/
│       ├── dashboard.js
│       ├── students.js
│       ├── specializations.js
│       ├── criteria.js
│       ├── evaluation.js
│       └── results.js
├── assets/                    # Static assets (icons are inline SVG in core.js)
├── docs/
│   └── API_INTEGRATION.md     # Contract for the PHP developer
└── README.md                  # This file
```

---

## 5. Architecture / separation of concerns

- **Views** (`js/views/*`) only render markup and handle UI events. They never read `localStorage` or call `fetch`.
- **Data service** (`js/services/dataService.js`) is the only module views use for data. It switches between mock and API mode.
- **Storage** (`js/data/storage.js`) owns LocalStorage persistence of sample data.
- **Mock data** (`js/data/mockData.js`) is a single source of truth for sample records and official defaults.
- **API service** (`js/services/api.js`) centralizes all Fetch calls, configurable endpoints, JSON parsing, timeouts and errors.
- **WSM module** (`js/wsm.js`) isolates calculation/demo logic and tie handling.

Scripts are classic (non-module) scripts so the app runs by simply opening `index.html` — no server or bundler required.

---

## 6. Mock data & LocalStorage

- All records shown are **sample data** generated in `mockData.js`.
- They are persisted in `localStorage` under keys prefixed `dss.*` (see `js/config.js`).
- The sidebar shows **"Frontend demo mode"**, the topbar shows **"Sample data"**, and mock records are chipped with **"Mock"**.
- **Reset demo data** (sidebar footer or Dashboard quick action) restores the official defaults.
- No operation claims to write to a database. Toast messages say "saved locally" / "sample data".

---

## 7. Future backend integration

See [`docs/API_INTEGRATION.md`](docs/API_INTEGRATION.md) for endpoints and JSON structures.

To switch on the backend later:

```js
// js/config.js
DSS.config.USE_API = true;
DSS.config.API_BASE_URL = "https://your-domain.example/dss/api";
```

Nothing else in the views needs to change. Until then, `DSS.api` is never called.

---

## 8. Compatibility notes

- Responsive: desktop, tablet and mobile (off-canvas sidebar below 900px).
- Accessible: semantic landmarks, labelled controls, focus states, keyboard-dismissable modal, `aria-live` notifications.
- No third-party JS, CSS framework, chart library or jQuery.
