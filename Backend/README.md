Backend — Wassim Azzouz

Project: DSS for University Specialization Selection
University: University of Guelma · 3rd Year ISIL

1. Technologies and Tools

- PHP 8 (Object-Oriented Programming).
- JSON.
- Sessions.
- PHPUnit (Testing).

2. Responsibilities

1. Create the Router and Controllers for:
   
   - Students.
   - Specializations.
   - Criteria.
   - Evaluations.
   - Decision.

2. Implement the Weighted Sum Model (WSM), including:
   
   - Normalization (Max / Min).
   - Weighted Sum.
   - Ranking.
   - Tie Detection.
   - Recommendation.

3. Validate all inputs on the server:
   
   - Scores must be between 1 and 10.
   - Weights must sum to 1.
   - Required fields must be present.

4. Return responses to the Frontend in JSON format.

5. Secure the website using:
   
   - Administrator Login.
   - Password Hashing.
   - CSRF Token.
   - Output Escaping (XSS Protection).

6. Write calculation tests using the following example:
   
   - AI = 0.8056.
   - Data Science = ISSE = 0.6944.

3. Files and Folders

app/Core/
app/Controllers/
app/Services/
config/
tests/

4. Deliverables

- Backend API routes and JSON response formats for the Frontend.
- Communication with the Database through Repositories.

5. Coordination

- Coordinate with the Frontend developer on API routes and JSON formats.
- Coordinate with the Database developer on table and column names.
- Use the Repositories provided by the Database layer.

---

Responsible Member: Wassim Azzouz
Role: Backend Developer
