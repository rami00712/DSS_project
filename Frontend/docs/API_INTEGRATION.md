# API Integration Contract — Frontend ↔ PHP Backend

**Status:** prepared, not active. The frontend runs entirely on local mock data.

This document is for the PHP developer. It describes exactly what the frontend expects when `DSS.config.USE_API` is switched to `true`.

---

## 1. Enabling the API

In `js/config.js`:

```js
DSS.config.USE_API = true;
DSS.config.API_BASE_URL = "https://your-host.example/dss/api";
DSS.config.endpoints = {
  students: "/students",
  specializations: "/specializations",
  criteria: "/criteria",
  evaluations: "/evaluations",
  results: "/results",
  dashboard: "/dashboard",
  weights: "/criteria/weights"
};
```

No view code changes are needed. `js/services/dataService.js` routes every operation through `js/services/api.js`.

---

## 2. Transport rules

- All requests use `fetch()` with `Accept: application/json`.
- Request bodies are `application/json`.
- Response should be JSON with `Content-Type: application/json`.
- Accepted response envelopes (all supported):

```json
{ "data": { } }
{ "success": true, "data": [ ], "message": "OK" }
[ ... raw array ... ]
```

- Errors should return a non-2xx status and ideally:

```json
{ "message": "Human-readable error", "errors": { "email": "Invalid email" } }
```

- The frontend handles loading state globally and shows errors as toast notifications. It never assumes a write succeeded unless the response is 2xx.

---

## 3. Endpoints

### GET `/api/dashboard`

Returns counts and summary data.

```json
{
  "data": {
    "totals": { "students": 8, "specializations": 4, "criteria": 6, "evaluations": 3 },
    "latestRecommendation": {
      "evaluationId": "E-1001",
      "unique": true,
      "name": "Artificial Intelligence",
      "score": 0.8734,
      "tie": false,
      "tiedNames": []
    },
    "bestSpecialization": { "id": "P1", "name": "Artificial Intelligence", "score": 0.8512 },
    "ranking": [ { "id": "P1", "name": "Artificial Intelligence", "score": 0.8512 } ],
    "activity": [ { "id": "A1", "text": "...", "at": "2026-11-20T10:00:00Z" } ]
  }
}
```

### Students

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/students` | — | `data: Student[]` |
| POST | `/students` | Student (without `id`) | `data: Student` |
| PUT | `/students/{id}` | Student | `data: Student` |
| DELETE | `/students/{id}` | — | `data: { success: true }` |

`Student`:

```json
{
  "id": "S001",
  "studentId": "S001",
  "fullName": "Amelia Chen",
  "email": "amelia.chen@univ-guelma.dz",
  "program": "Computer Science",
  "level": "Licence 3",
  "average": 17.25,
  "status": "active"
}
```

Validation mirrored by the frontend: unique `studentId`, valid email, average 0–20.

### Specializations

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/specializations` | — | `data: Specialization[]` |
| POST | `/specializations` | Specialization | `data: Specialization` |
| PUT | `/specializations/{id}` | Specialization | `data: Specialization` |
| DELETE | `/specializations/{id}` | — | `data: { success: true }` |

`Specialization`:

```json
{
  "id": "P1",
  "code": "P1",
  "name": "Artificial Intelligence",
  "description": "Machine learning, deep learning…",
  "icon": "sparkles",
  "color": "#2563eb",
  "predefined": true
}
```

The backend should reject deletion of the four predefined alternatives (`P1`–`P4`).

### Criteria

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/criteria` | — | `data: Criterion[]` |
| PUT | `/criteria/weights` | `{ "weights": { "C1": 0.2, … }, "reset": false }` | `data: Criterion[]` |

`Criterion`:

```json
{
  "id": "C1",
  "code": "C1",
  "name": "Programming",
  "type": "maximize",
  "weight": 0.20,
  "description": "…"
}
```

Official defaults (must be preserved server-side):

| id | name | type | weight |
|----|------|------|--------|
| C1 | Programming | maximize | 0.20 |
| C2 | Mathematics | maximize | 0.15 |
| C3 | Alignment with Student's Competencies | maximize | 0.20 |
| C4 | Career Opportunities | maximize | 0.20 |
| C5 | Difficulty | **minimize** | 0.10 |
| C6 | Personal Interest | maximize | 0.15 |

The backend must validate `sum(weights) == 1.00` and reject otherwise. `reset: true` should restore the official defaults.

### Evaluations

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/evaluations` | — | `data: Evaluation[]` |
| POST | `/evaluations` | Evaluation | `data: Evaluation` |
| PUT | `/evaluations/{id}` | Evaluation | `data: Evaluation` |
| DELETE | `/evaluations/{id}` | — | `data: { success: true }` |

`Evaluation`:

```json
{
  "id": "E-1004",
  "studentId": "S001",
  "studentName": "Amelia Chen",
  "label": "Evaluation — Amelia Chen",
  "status": "saved",
  "createdAt": "2026-11-20T10:00:00Z",
  "scores": {
    "P1": { "C1": 9, "C2": 8, "C3": 9, "C4": 9, "C5": 5, "C6": 9 },
    "P2": { "C1": 7, "C2": 6, "C3": 7, "C4": 9, "C5": 7, "C6": 7 },
    "P3": { "C1": 8, "C2": 9, "C3": 8, "C4": 8, "C5": 4, "C6": 8 },
    "P4": { "C1": 8, "C2": 6, "C3": 9, "C4": 8, "C5": 3, "C6": 6 }
  }
}
```

Every score is a number in the range **1–10**. `C5` (Difficulty) is minimized.

### Results / WSM

| Method | Path | Body / query | Response |
|--------|------|--------------|----------|
| GET | `/results?evaluation_id=E-1004` | — | `data: WsmResult` |
| POST | `/results/calculate` | `{ "evaluation_id": "E-1004" }` | `data: WsmResult` |

`WsmResult` (authoritative WSM output):

```json
{
  "method": "WSM",
  "evaluationId": "E-1004",
  "studentId": "S001",
  "criteria": [ { "id": "C1", "weight": 0.20, "type": "maximize" } ],
  "rows": [
    {
      "id": "P1", "code": "P1", "name": "Artificial Intelligence",
      "raw": { "C1": 9 },
      "normalized": { "C1": 1 },
      "weighted": { "C1": 0.20 },
      "final": 0.8734,
      "rank": 1,
      "isWinner": true,
      "isTied": false
    }
  ],
  "tie": { "hasTie": false, "ids": [], "names": [], "message": "No tie detected." },
  "recommendation": { "unique": true, "id": "P1", "name": "Artificial Intelligence", "ids": ["P1"], "names": ["Artificial Intelligence"] }
}
```

**Critical rule:** if multiple alternatives share the highest final score (within tolerance), `tie.hasTie` must be `true`, `recommendation.unique` must be `false`, and `recommendation.id/name` must be `null`. The frontend already enforces this for local calculations.

---

## 4. Frontend-side normalization used in demo mode

For transparency, `js/wsm.js` uses:

- `maximize`: `score / max(score across alternatives)`
- `minimize`: `min(score across alternatives) / score`
- `final = Σ(normalized × weight)`

The backend may use a different but WSM-compatible scaling as long as the returned shape above is respected. Do **not** substitute TOPSIS, AHP or another MCDM method.

---

## 5. CORS & deployment

- If the PHP API is on another origin, enable CORS for the frontend origin and allow `GET, POST, PUT, DELETE, OPTIONS` plus `Content-Type` and `Accept`.
- Keep `API_BASE_URL` configurable — no endpoints are hard-coded in views.
- Until `USE_API` is set to `true`, the frontend never issues a network request.
