Database — Rami Mouarcia

Project: DSS for University Specialization Selection
University: University of Guelma · 3rd Year ISIL

1. Technologies and Tools

- MySQL / MariaDB.
- SQL.
- phpMyAdmin.
- PHP PDO (only for the Repositories).

2. Responsibilities

1. Design the database model (ER Diagram), including:
   
   - Students.
   - Specializations.
   - Criteria.
   - Evaluations.
   - Decision History.

2. Create "schema.sql" containing:
   
   - Database tables.
   - Primary Keys.
   - Foreign Keys.
   - UNIQUE constraints.
   - CHECK constraints (scores from 1 to 10).

3. Create "seed.sql" containing initial sample data:
   
   - The 4 specializations.
   - The 6 criteria with their type and weight.
   - One sample student.

4. Write SQL queries for:
   
   - INSERT.
   - UPDATE.
   - DELETE.
   - SELECT.
   - JOIN.

5. Create PHP Repositories to execute SQL queries using Prepared Statements.

6. Create the tables used to store decision results:
   
   - "decision_runs".
   - "decision_results".

7. Prepare test data and a database export (Backup) for the project demonstration (Demo).

3. Files and Folders

database/schema.sql
database/seed.sql
app/Repositories/
app/Models/

4. Deliverables

- Final database table and column names.
- Database schema and SQL scripts.
- PHP Repositories used by the Backend.

5. Coordination

- Coordinate with the Backend developer on table and column names.
- Provide the final database schema and Repositories so the Backend can access the data.

---

Responsible Member: Rami Mouarcia
Role: Database Developer
