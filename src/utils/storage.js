const isBrowser = typeof window !== 'undefined';

export const STORAGE_KEYS = {
  USERS: 'studyhub_users',
  COURSES: 'studyhub_courses',
  FRIENDSHIPS: 'studyhub_friendships',
  CURRENT_USER: 'studyhub_current_user',
  ORIGIN: 'studyhub_origin_location'
};

export const readFromStorage = (key, fallback) => {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch (error) {
    console.warn(`Unable to read ${key} from localStorage`, error);
    return fallback;
  }
};

export const writeToStorage = (key, value) => {
  if (!isBrowser) return;
  try {
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, payload);
  } catch (error) {
    console.warn(`Unable to write ${key} to localStorage`, error);
  }
};

export const removeFromStorage = (key) => {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Unable to remove ${key} from localStorage`, error);
  }
};
