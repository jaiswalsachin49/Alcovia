import { Platform } from 'react-native';

export function getDeviceId(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('deviceId');
      if (id) return id;
      
      let savedId = localStorage.getItem('alcovia_device_id');
      if (!savedId) {
        savedId = `device-${Math.random().toString(36).substring(7)}`;
        localStorage.setItem('alcovia_device_id', savedId);
      }
      return savedId;
    }
  }
  return 'device-native';
}

function getPrefix() {
  return `alcovia_${getDeviceId()}_`;
}

export function getItem<T>(key: string): T | null {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    const val = localStorage.getItem(getPrefix() + key);
    return val ? JSON.parse(val) : null;
  }
  return null;
}

export function setItem(key: string, value: any) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(getPrefix() + key, JSON.stringify(value));
  }
}

let localClock = getItem<number>('lamportClock') || 0;

export function getLamportClock() {
  return localClock;
}

export function incrementLamportClock() {
  localClock += 1;
  setItem('lamportClock', localClock);
  return localClock;
}

export function updateLamportClock(remoteClock: number) {
  if (remoteClock > localClock) {
    localClock = remoteClock;
    setItem('lamportClock', localClock);
  }
}
