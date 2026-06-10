export interface Session {
  sessionId: string;
  studentId: string;
  targetDuration: number;
  status: 'success' | 'failed';
  failReason?: 'give_up' | 'app_switch';
  completedAt: number;
  syncedToServer: boolean;
  serverProcessed: boolean;
}

export interface Task {
  taskId: string;
  subjectId: string;
  chapterId: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'done';
  lamportClock: number;
  deviceId: string;
  deleted: boolean;
}

export interface StudentState {
  studentId: string;
  coins: number;
  streak: number;
  lastStreakDate: string | null;
  todayFocusMinutes: number;
}

export interface Subject {
  subjectId: string;
  title: string;
}

export interface Chapter {
  chapterId: string;
  subjectId: string;
  title: string;
}
