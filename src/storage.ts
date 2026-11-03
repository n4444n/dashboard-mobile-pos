// เก็บค่าในเครื่อง (AsyncStorage) — license, ที่อยู่ร้าน, token, ภาษา
import AsyncStorage from '@react-native-async-storage/async-storage';

const P = 'tally.';

export const store = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const v = await AsyncStorage.getItem(P + key);
      return v == null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  async set(key: string, value: unknown) {
    try {
      if (value === null || value === undefined) await AsyncStorage.removeItem(P + key);
      else await AsyncStorage.setItem(P + key, JSON.stringify(value));
    } catch {
      /* เก็บไม่ได้ก็ใช้ต่อในหน่วยความจำ */
    }
  },
};
