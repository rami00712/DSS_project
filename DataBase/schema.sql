CREATE DATABASE IF NOT EXISTS dss CHARACTER SET utf8mb4;
USE dss;
CREATE TABLE students(
  id INT AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(100) NOT NULL, email VARCHAR(100),
  academic_average DECIMAL(4,2) CHECK (academic_average BETWEEN 0 AND 20));
CREATE TABLE specializations(
  id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL, description VARCHAR(255));
CREATE TABLE criteria(
  id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
  type ENUM('MAX','MIN') NOT NULL, weight DECIMAL(4,3) NOT NULL CHECK (weight BETWEEN 0 AND 1));
CREATE TABLE evaluations(
  id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, specialization_id INT NOT NULL,
  criterion_id INT NOT NULL, value TINYINT NOT NULL CHECK (value BETWEEN 1 AND 10),
  UNIQUE(student_id, specialization_id, criterion_id),
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY(specialization_id) REFERENCES specializations(id) ON DELETE CASCADE,
  FOREIGN KEY(criterion_id) REFERENCES criteria(id) ON DELETE CASCADE);

INSERT INTO specializations(code,name) VALUES
 ('P1','Artificial Intelligence'),('P2','Cybersecurity'),('P3','Data Science'),
 ('P4','Information Systems and Software Engineering');
INSERT INTO criteria(name,type,weight) VALUES
 ('Programming','MAX',0.20),('Mathematics','MAX',0.15),('Alignment with competencies','MAX',0.20),
 ('Career opportunities','MAX',0.20),('Difficulty','MIN',0.10),('Personal interest','MAX',0.15);
INSERT INTO students(full_name,email,academic_average) VALUES ('Sample Student','sample@univ.dz',14.50);
-- Sample evaluations (spec, criterion order: Prog, Math, Align, Career, Diff, Interest). P3 and P4 tie.
INSERT INTO evaluations(student_id,specialization_id,criterion_id,value) VALUES
 (1,1,1,9),(1,1,2,10),(1,1,3,8),(1,1,4,9),(1,1,5,9),(1,1,6,9),
 (1,2,1,8),(1,2,2,6),(1,2,3,7),(1,2,4,9),(1,2,5,7),(1,2,6,7),
 (1,3,1,8),(1,3,2,9),(1,3,3,6),(1,3,4,8),(1,3,5,8),(1,3,6,8),
 (1,4,1,9),(1,4,2,5),(1,4,3,8),(1,4,4,8),(1,4,5,5),(1,4,6,6);
