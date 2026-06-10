import { create } from 'zustand';
import { getItem, setItem, getDeviceId, incrementLamportClock, updateLamportClock } from './storage';
import { Task, Session, StudentState, Subject, Chapter } from './types';
import { v4 as uuidv4 } from 'uuid';

let isOfflineMode = false;

export function setOfflineMode(offline: boolean) {
  isOfflineMode = offline;
  if (!offline && typeof window !== 'undefined' && navigator.onLine) {
    useStore.getState().sync(); // Auto sync on reconnect
  }
}

export function getOfflineMode() {
  return isOfflineMode;
}

interface AppState {
  tasks: Task[];
  sessions: Session[];
  studentState: StudentState;
  subjects: Subject[];
  chapters: Chapter[];
  isSyncing: boolean;
  syncError: string | null;
  lastSyncTime: number | null;
  
  loadLocalState: () => void;
  sync: () => Promise<void>;
  toggleTaskStatus: (taskId: string) => void;
  completeSession: (duration: number, status: 'success' | 'failed', reason?: 'give_up' | 'app_switch') => void;
  forceLocalSave: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  tasks: [],
  sessions: [],
  studentState: {
    studentId: 'student-1',
    coins: 0,
    streak: 0,
    lastStreakDate: null,
    todayFocusMinutes: 0
  },
  subjects: [],
  chapters: [],
  isSyncing: false,
  syncError: null,
  lastSyncTime: null,

  forceLocalSave: () => {
    const state = get();
    setItem('tasks', state.tasks);
    setItem('sessions', state.sessions);
    setItem('studentState', state.studentState);
    setItem('subjects', state.subjects);
    setItem('chapters', state.chapters);
  },

  loadLocalState: () => {
    const tasks = getItem<Task[]>('tasks') || [];
    const sessions = getItem<Session[]>('sessions') || [];
    const studentState = getItem<StudentState>('studentState') || get().studentState;
    const subjects = getItem<Subject[]>('subjects') || [];
    const chapters = getItem<Chapter[]>('chapters') || [];
    
    set({ tasks, sessions, studentState, subjects, chapters });
  },

  sync: async () => {
    if (isOfflineMode || typeof navigator === 'undefined' || !navigator.onLine) return;
    if (get().isSyncing) return;
    
    set({ isSyncing: true, syncError: null });
    try {
      const deviceId = getDeviceId();
      const state = get();
      
      const unsyncedSessions = state.sessions.filter(s => !s.syncedToServer);
      const allTasks = state.tasks; 
      
      const res = await fetch('http://localhost:3000/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          changes: {
            tasks: allTasks,
            sessions: unsyncedSessions
          }
        })
      });
      
      if (!res.ok) throw new Error('Sync failed');
      
      const data = await res.json();
      const serverState = data.state;
      
      if (serverState.tasks) {
        for (const t of serverState.tasks) {
          updateLamportClock(t.lamportClock);
        }
      }

      const newSessions = serverState.sessions.map((s: any) => ({
        ...s,
        syncedToServer: true
      }));

      // Merge local unsynced sessions that were created during sync
      const currentStateSessions = get().sessions;
      const localOnlySessions = currentStateSessions.filter(s => !s.syncedToServer && !newSessions.find((ns: any) => ns.sessionId === s.sessionId));
      const mergedSessions = [...newSessions, ...localOnlySessions];

      set({
        tasks: serverState.tasks,
        sessions: mergedSessions,
        studentState: serverState.studentState,
        subjects: serverState.subjects,
        chapters: serverState.chapters,
        lastSyncTime: Date.now()
      });
      
      get().forceLocalSave();

    } catch (error: any) {
      console.error(error);
      set({ syncError: error.message });
    } finally {
      set({ isSyncing: false });
    }
  },

  toggleTaskStatus: (taskId) => {
    const clock = incrementLamportClock();
    const deviceId = getDeviceId();
    
    set(state => {
      const newTasks = state.tasks.map(t => {
        if (t.taskId === taskId) {
          let nextStatus: 'not_started' | 'in_progress' | 'done' = 'not_started';
          if (t.status === 'not_started') nextStatus = 'in_progress';
          else if (t.status === 'in_progress') nextStatus = 'done';
          else if (t.status === 'done') nextStatus = 'not_started';
          
          return {
            ...t,
            status: nextStatus,
            lamportClock: clock,
            deviceId: deviceId
          };
        }
        return t;
      });
      
      return { tasks: newTasks };
    });
    
    get().forceLocalSave();
    
    if (!isOfflineMode && typeof navigator !== 'undefined' && navigator.onLine) {
      setTimeout(() => get().sync(), 100);
    }
  },

  completeSession: (duration, status, reason) => {
    const session: Session = {
      sessionId: uuidv4(),
      studentId: 'student-1',
      targetDuration: duration,
      status,
      failReason: reason,
      completedAt: Date.now(),
      syncedToServer: false,
      serverProcessed: false,
    };
    
    set(state => {
      const newSessions = [...state.sessions, session];
      let tempStudentState = { ...state.studentState };
      
      if (status === 'success') {
        const today = new Date().toISOString().split('T')[0];
        if (tempStudentState.lastStreakDate !== today) {
          tempStudentState.streak += 1;
          tempStudentState.lastStreakDate = today;
        }
        tempStudentState.coins += 50;
        tempStudentState.todayFocusMinutes += duration;
      }
      
      return { sessions: newSessions, studentState: tempStudentState };
    });
    
    get().forceLocalSave();
    
    if (!isOfflineMode && typeof navigator !== 'undefined' && navigator.onLine) {
      setTimeout(() => get().sync(), 100);
    }
  }
}));

// Setup auto-sync poll when online
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (!isOfflineMode && navigator.onLine) {
      useStore.getState().sync();
    }
  }, 5000);
  
  window.addEventListener('online', () => {
    if (!isOfflineMode) {
      useStore.getState().sync();
    }
  });
}
