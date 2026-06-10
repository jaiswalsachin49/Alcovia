import express from 'express';
import cors from 'cors';
import db from './db';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

app.get('/state', (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const tasks = db.prepare('SELECT * FROM tasks').all();
  const sessions = db.prepare('SELECT * FROM sessions').all();
  const studentState = db.prepare('SELECT * FROM student_state WHERE studentId = ?').get('student-1');
  const subjects = db.prepare('SELECT * FROM subjects').all();
  const chapters = db.prepare('SELECT * FROM chapters').all();

  res.json({
    tasks,
    sessions,
    studentState,
    subjects,
    chapters
  });
});

app.post('/sync', (req, res) => {
  const { deviceId, changes } = req.body;
  if (!deviceId || !changes) {
    return res.status(400).json({ error: 'deviceId and changes are required' });
  }

  const { tasks = [], sessions = [] } = changes;

  // Begin transaction
  const syncTx = db.transaction(() => {
    // 1. Merge Tasks (Lamport clock + deviceId tiebreaker)
    for (const task of tasks) {
      const existing = db.prepare('SELECT * FROM tasks WHERE taskId = ?').get(task.taskId) as any;
      if (!existing) {
        db.prepare(`
          INSERT INTO tasks (taskId, subjectId, chapterId, title, status, lamportClock, deviceId, deleted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(task.taskId, task.subjectId, task.chapterId, task.title, task.status, task.lamportClock, task.deviceId, task.deleted ? 1 : 0);
      } else {
        // Compare clocks
        if (task.lamportClock > existing.lamportClock ||
          (task.lamportClock === existing.lamportClock && task.deviceId > existing.deviceId)) {
          db.prepare(`
            UPDATE tasks
            SET status = ?, lamportClock = ?, deviceId = ?, deleted = ?
            WHERE taskId = ?
          `).run(task.status, task.lamportClock, task.deviceId, task.deleted ? 1 : 0, task.taskId);
        }
      }
    }

    // 2. Insert Sessions
    for (const session of sessions) {
      const existingSession = db.prepare('SELECT * FROM sessions WHERE sessionId = ?').get(session.sessionId);
      if (!existingSession) {
        db.prepare(`
          INSERT INTO sessions (sessionId, studentId, targetDuration, status, failReason, completedAt, serverProcessed)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(session.sessionId, session.studentId, session.targetDuration, session.status, session.failReason || null, session.completedAt, 0);
      }
    }
  });

  try {
    syncTx();

    // Process unprocessed successful sessions after sync transaction
    const unprocessedSessions = db.prepare(`
      SELECT * FROM sessions 
      WHERE status = 'success' AND serverProcessed = 0
    `).all() as any[];

    for (const s of unprocessedSessions) {
      // Check idempotency again in processed_sessions (just to be absolutely safe)
      const alreadyProcessed = db.prepare('SELECT 1 FROM processed_sessions WHERE sessionId = ?').get(s.sessionId);
      if (!alreadyProcessed) {
        // Award rewards
        const currentState = db.prepare('SELECT * FROM student_state WHERE studentId = ?').get(s.studentId) as any;
        const today = new Date().toISOString().split('T')[0];

        let newStreak = currentState.streak;
        if (currentState.lastStreakDate !== today) {
          // Basic streak logic: just +1 for today if not already updated today.
          newStreak += 1;
        }

        db.prepare(`
          UPDATE student_state
          SET coins = coins + 50,
              streak = ?,
              lastStreakDate = ?,
              todayFocusMinutes = todayFocusMinutes + ?
          WHERE studentId = ?
        `).run(newStreak, today, s.targetDuration, s.studentId);

        // Mark as processed in idempotent table
        db.prepare(`
          INSERT INTO processed_sessions (sessionId, processedAt)
          VALUES (?, ?)
        `).run(s.sessionId, Date.now());

        // Update session flag
        db.prepare('UPDATE sessions SET serverProcessed = 1 WHERE sessionId = ?').run(s.sessionId);

        // Trigger n8n webhook asynchronously
        // We'll mock the webhook trigger or send to a local n8n instance if running
        triggerN8nWebhook(s);
      }
    }

    // Return merged state
    const allTasks = db.prepare('SELECT * FROM tasks').all();
    const allSessions = db.prepare('SELECT * FROM sessions').all();
    const studentState = db.prepare('SELECT * FROM student_state WHERE studentId = ?').get('student-1');
    const subjects = db.prepare('SELECT * FROM subjects').all();
    const chapters = db.prepare('SELECT * FROM chapters').all();

    res.json({
      success: true,
      state: {
        tasks: allTasks,
        sessions: allSessions,
        studentState,
        subjects,
        chapters
      }
    });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

app.post('/mock-notify', (req, res) => {
  console.log('MOCK WHATSAPP NOTIFICATION RECEIVED:', req.body);
  res.json({ sent: true });
});

async function triggerN8nWebhook(session: any) {
  // In a real app, this URL points to the n8n webhook URL.
  // For the assignment, n8n will make a callback to /mock-notify.
  // Using an environment variable or default
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://sachin49.app.n8n.cloud/webhook-test/session-complete';

  try {
    const currentState = db.prepare('SELECT * FROM student_state WHERE studentId = ?').get(session.studentId) as any;

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        studentId: session.studentId,
        duration: session.targetDuration,
        streak: currentState?.streak ?? 0,
        coins: currentState?.coins ?? 0
      })
    });
    console.log(`n8n webhook fired for session ${session.sessionId}, status: ${response.status}`);
  } catch (error) {
    console.error(`n8n webhook failed for session ${session.sessionId}:`, error);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
