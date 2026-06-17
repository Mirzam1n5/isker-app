import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Cross-platform key-value storage ─────────────────────────────
// Works identically on web (wraps localStorage internally via AsyncStorage's
// web implementation) and on native iOS/Android. This replaces direct
// localStorage usage so mobile and web share the exact same persisted state
// (extra sheets list, theme preference, etc).

export async function getItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // ignore write errors (e.g. storage full / disabled)
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ─── JSON convenience helpers ──────────────────────────────────────
export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  await setItem(key, JSON.stringify(value));
}
