import React, { useEffect } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';
import { FocusTimer } from '../components/FocusTimer';
import { SyllabusTree } from '../components/SyllabusTree';
import { DevPanel } from '../components/DevPanel';

export default function HomeScreen() {
  const loadLocalState = useStore(state => state.loadLocalState);
  const sync = useStore(state => state.sync);

  useEffect(() => {
    // 1. Load from localStorage
    loadLocalState();
    
    // 2. Initial sync if online
    sync();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <FocusTimer />
        <SyllabusTree />
      </ScrollView>
      <DevPanel />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    padding: 16,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  }
});
