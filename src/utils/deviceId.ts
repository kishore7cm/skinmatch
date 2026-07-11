import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'skinmatch_device_id';

// Anonymous, local-only identity for the submission flow — no login. Good
// enough to let a user see their own submissions' status; not a security
// credential, so a simple random string is fine (no crypto dependency).
function generateId(): string {
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const id = generateId();
  await AsyncStorage.setItem(KEY, id);
  cached = id;
  return id;
}
