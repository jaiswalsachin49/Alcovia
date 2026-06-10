import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useStore, setOfflineMode, getOfflineMode } from '../lib/store';
import { getDeviceId } from '../lib/storage';

export function DevPanel() {
  const [offline, setOffline] = useState(getOfflineMode());
  const studentState = useStore(state => state.studentState);
  const sessions = useStore(state => state.sessions);
  const sync = useStore(state => state.sync);
  const isSyncing = useStore(state => state.isSyncing);

  const unsyncedCount = sessions.filter(s => !s.syncedToServer).length;

  const toggleOffline = () => {
    const newState = !offline;
    setOffline(newState);
    setOfflineMode(newState);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>DEV PANEL</Text>
      <Text style={styles.text}>Device: {getDeviceId()}</Text>
      <Text style={styles.text}>Status: {offline ? '🔴 Offline' : '🟢 Online'}</Text>
      
      <View style={styles.row}>
        <Button title={offline ? "Go Online" : "Go Offline"} onPress={toggleOffline} />
        <Button title={isSyncing ? "Syncing..." : "Force Sync"} onPress={() => sync()} disabled={offline || isSyncing} />
      </View>
      
      <View style={styles.stats}>
        <Text style={styles.text}>Coins: {studentState.coins}</Text>
        <Text style={styles.text}>Streak: {studentState.streak} days</Text>
        <Text style={styles.text}>Today's Focus: {studentState.todayFocusMinutes} min</Text>
        <Text style={styles.text}>Unsynced Sessions: {unsyncedCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 16,
    borderRadius: 8,
    width: 280,
    zIndex: 1000
  },
  header: { color: 'white', fontWeight: 'bold', marginBottom: 8, fontSize: 16 },
  text: { color: 'white', fontSize: 13, marginVertical: 3 },
  row: { flexDirection: 'row', gap: 8, marginVertical: 8, justifyContent: 'space-between' },
  stats: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#555', paddingTop: 8 },
});
