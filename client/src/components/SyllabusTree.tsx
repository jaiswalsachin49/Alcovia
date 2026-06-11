import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../lib/store';

export function SyllabusTree() {
  const tasks = useStore(state => state.tasks);
  const subjects = useStore(state => state.subjects);
  const chapters = useStore(state => state.chapters);
  const toggleTaskStatus = useStore(state => state.toggleTaskStatus);

  if (!subjects.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>Waiting for initial sync...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="book-outline" size={24} color="#8b5cf6" />
        <Text style={styles.title}>Syllabus Progress</Text>
      </View>
      
      {subjects.map(subject => {
        const subjectChapters = chapters.filter(c => c.subjectId === subject.subjectId);
        
        return (
          <View key={subject.subjectId} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <Text style={styles.subjectTitle}>{subject.title}</Text>
            </View>
            
            {subjectChapters.map((chapter, cIdx) => {
              const chapterTasks = tasks.filter(t => t.chapterId === chapter.chapterId && !t.deleted);
              const completedTasks = chapterTasks.filter(t => t.status === 'done').length;
              const totalTasks = chapterTasks.length;
              const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
              const isLast = cIdx === subjectChapters.length - 1;
              
              return (
                <View key={chapter.chapterId} style={[styles.chapterContainer, !isLast && styles.chapterBorder]}>
                  <View style={styles.chapterHeader}>
                    <Text style={styles.chapterTitle}>{chapter.title}</Text>
                    <View style={styles.progressBadge}>
                      <Text style={styles.progressText}>{progress}%</Text>
                    </View>
                  </View>
                  
                  {/* Progress Bar */}
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                  </View>
                  
                  {chapterTasks.map(task => {
                    let iconName: any = 'ellipse-outline';
                    let iconColor = '#cbd5e1';
                    
                    if (task.status === 'in_progress') {
                      iconName = 'time';
                      iconColor = '#3b82f6';
                    } else if (task.status === 'done') {
                      iconName = 'checkmark-circle';
                      iconColor = '#10b981';
                    }

                    return (
                      <TouchableOpacity 
                        key={task.taskId} 
                        style={styles.taskRow}
                        onPress={() => toggleTaskStatus(task.taskId)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={iconName} size={22} color={iconColor} style={styles.taskIcon} />
                        <Text style={[
                          styles.taskTitle, 
                          task.status === 'done' && styles.taskTitleDone,
                          task.status === 'in_progress' && styles.taskTitleInProgress
                        ]}>
                          {task.title}
                        </Text>
                        
                        {task.status === 'in_progress' && (
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>Doing</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    backgroundColor: '#ffffff', 
    borderRadius: 24, 
    padding: 24,
    marginBottom: 24, 
    boxShadow: '0px 8px 24px rgba(139, 92, 246, 0.1)',
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#1e293b',
    marginLeft: 10,
    letterSpacing: -0.5
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
    padding: 20
  },
  subjectCard: { 
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  subjectHeader: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  subjectTitle: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  chapterContainer: { 
    padding: 16,
  },
  chapterBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  chapterHeader: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  chapterTitle: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: '#0f172a'
  },
  progressBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  progressText: {
    color: '#4338ca',
    fontSize: 12,
    fontWeight: 'bold'
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3
  },
  taskRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.02)',
  },
  taskIcon: {
    marginRight: 12
  },
  taskTitle: { 
    fontSize: 15, 
    color: '#334155',
    fontWeight: '500',
    flex: 1
  },
  taskTitleDone: {
    color: '#94a3b8',
    textDecorationLine: 'line-through'
  },
  taskTitleInProgress: {
    color: '#3b82f6',
    fontWeight: '700'
  },
  statusBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusBadgeText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase'
  }
});
