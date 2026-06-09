import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath);
}

const db = new Database(path.join(dbPath, 'database.sqlite'));

db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS subjects (
    subjectId TEXT PRIMARY KEY,
    title TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chapters (
    chapterId TEXT PRIMARY KEY,
    subjectId TEXT NOT NULL,
    title TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sessionId TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    targetDuration INTEGER NOT NULL,
    status TEXT NOT NULL,
    failReason TEXT,
    completedAt INTEGER NOT NULL,
    serverProcessed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tasks (
    taskId TEXT PRIMARY KEY,
    subjectId TEXT NOT NULL,
    chapterId TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    lamportClock INTEGER NOT NULL,
    deviceId TEXT NOT NULL,
    deleted INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS student_state (
    studentId TEXT PRIMARY KEY,
    coins INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    lastStreakDate TEXT,
    todayFocusMinutes INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS processed_sessions (
    sessionId TEXT PRIMARY KEY,
    processedAt INTEGER NOT NULL
  );

  -- Seed Data
  INSERT OR IGNORE INTO student_state (studentId, coins, streak, lastStreakDate, todayFocusMinutes)
  VALUES ('student-1', 0, 0, NULL, 0);

  INSERT OR IGNORE INTO subjects (subjectId, title) VALUES ('sub-math', 'Mathematics');
  INSERT OR IGNORE INTO subjects (subjectId, title) VALUES ('sub-science', 'Science');

  INSERT OR IGNORE INTO chapters (chapterId, subjectId, title) VALUES ('ch-math-1', 'sub-math', 'Algebra');
  INSERT OR IGNORE INTO chapters (chapterId, subjectId, title) VALUES ('ch-math-2', 'sub-math', 'Geometry');
  INSERT OR IGNORE INTO chapters (chapterId, subjectId, title) VALUES ('ch-sci-1', 'sub-science', 'Physics');

  -- Provide some initial tasks so we have something to sync and toggle
  INSERT OR IGNORE INTO tasks (taskId, subjectId, chapterId, title, status, lamportClock, deviceId, deleted)
  VALUES ('task-1', 'sub-math', 'ch-math-1', 'Linear Equations', 'not_started', 1, 'server', 0);
  INSERT OR IGNORE INTO tasks (taskId, subjectId, chapterId, title, status, lamportClock, deviceId, deleted)
  VALUES ('task-2', 'sub-math', 'ch-math-2', 'Triangles', 'not_started', 1, 'server', 0);
  INSERT OR IGNORE INTO tasks (taskId, subjectId, chapterId, title, status, lamportClock, deviceId, deleted)
  VALUES ('task-3', 'sub-science', 'ch-sci-1', 'Kinematics', 'not_started', 1, 'server', 0);
`);

export default db;
