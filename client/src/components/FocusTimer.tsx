import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../lib/store';

export function FocusTimer() {
  const [duration, setDuration] = useState(25); // minutes
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [isRunning, setIsRunning] = useState(false);
  
  const completeSession = useStore(state => state.completeSession);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      completeSession(duration, 'success');
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, duration, completeSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (isRunning && (nextAppState === 'background' || nextAppState === 'inactive')) {
        setIsRunning(false);
        setTimeLeft(0);
        completeSession(duration, 'failed', 'app_switch');
      }
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && isRunning) {
        setIsRunning(false);
        setTimeLeft(0);
        completeSession(duration, 'failed', 'app_switch');
      }
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      subscription.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [isRunning, duration, completeSession]);

  const startTimer = () => {
    setTimeLeft(duration * 60);
    setIsRunning(true);
  };

  const startDemoTimer = () => {
    setTimeLeft(5); // 5 seconds demo for video
    setIsRunning(true);
  };

  const giveUp = () => {
    setIsRunning(false);
    setTimeLeft(0);
    completeSession(duration, 'failed', 'give_up');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="timer-outline" size={24} color="#6366f1" />
        <Text style={styles.title}>Focus Session</Text>
      </View>
      
      {!isRunning ? (
        <View style={styles.setupContainer}>
          <Text style={styles.durationText}>{duration} <Text style={styles.minText}>min</Text></Text>
          
          <View style={styles.controlsRow}>
            <TouchableOpacity 
              style={styles.adjustBtn} 
              onPress={() => setDuration(Math.max(5, duration - 5))}
            >
              <Ionicons name="remove" size={24} color="#6366f1" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.adjustBtn} 
              onPress={() => setDuration(Math.min(120, duration + 5))}
            >
              <Ionicons name="add" size={24} color="#6366f1" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.primaryBtn} onPress={startTimer}>
            <Text style={styles.primaryBtnText}>Start Focusing</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.demoBtn} onPress={startDemoTimer}>
            <Ionicons name="flash" size={18} color="#22c55e" style={{marginRight: 6}} />
            <Text style={styles.demoBtnText}>5s Demo Timer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.activeContainer}>
          <View style={styles.timerCircle}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.timerLabel}>Remaining</Text>
          </View>
          <TouchableOpacity style={styles.dangerBtn} onPress={giveUp}>
            <Ionicons name="close-circle" size={20} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.dangerBtnText}>Give Up</Text>
          </TouchableOpacity>
          <Text style={styles.warningText}>Don't switch tabs or you'll fail!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    backgroundColor: '#ffffff', 
    borderRadius: 24, 
    padding: 24,
    marginBottom: 24, 
    shadowColor: '#6366f1', 
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, 
    shadowRadius: 24,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#1e293b',
    marginLeft: 10,
    letterSpacing: -0.5
  },
  setupContainer: { 
    alignItems: 'center'
  },
  durationText: {
    fontSize: 56,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -2
  },
  minText: {
    fontSize: 24,
    color: '#94a3b8',
    fontWeight: '600'
  },
  controlsRow: { 
    flexDirection: 'row', 
    gap: 16, 
    marginVertical: 20 
  },
  adjustBtn: {
    backgroundColor: '#f1f5f9',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryBtn: {
    backgroundColor: '#6366f1',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  demoBtn: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center'
  },
  demoBtnText: {
    color: '#166534',
    fontWeight: '700'
  },
  activeContainer: { 
    alignItems: 'center'
  },
  timerCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 8,
    borderColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    backgroundColor: '#f8fafc'
  },
  timerText: { 
    fontSize: 64, 
    fontWeight: '900',
    color: '#6366f1',
    letterSpacing: -2
  },
  timerLabel: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: -4
  },
  dangerBtn: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center'
  },
  dangerBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500'
  }
});
