import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type {
  AuthUser,
  StudentLoginProfile,
  StudentLoginSchool,
} from '@/types/auth';

const TOKEN_KEY = 'em_auth_token';
const USER_KEY = 'em_auth_user';
const EMAIL_KEY = 'em_auth_email';
const STUDENT_META_KEY = 'em_auth_student_meta';
const PARENT_META_KEY = 'em_auth_parent_meta';

export interface StudentSessionMeta {
  school: StudentLoginSchool;
  profile: StudentLoginProfile;
}

export interface ParentSessionMeta {
  school: StudentLoginSchool;
}

/** Web: also write localStorage so the session survives Expo web reloads. */
async function setItem(key: string, value: string) {
  await AsyncStorage.setItem(key, value);
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value);
    } catch {
      // private mode / blocked storage
    }
  }
}

async function getItem(key: string) {
  const fromAsync = await AsyncStorage.getItem(key);
  if (fromAsync != null) return fromAsync;
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      const fromWeb = localStorage.getItem(key);
      if (fromWeb != null) {
        await AsyncStorage.setItem(key, fromWeb);
        return fromWeb;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

async function multiGet(keys: string[]) {
  return Promise.all(keys.map(async (key) => [key, await getItem(key)] as const));
}

async function removeItems(keys: string[]) {
  await AsyncStorage.multiRemove(keys);
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      keys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore
    }
  }
}

export async function saveSession(
  token: string,
  user: AuthUser,
  studentMeta?: StudentSessionMeta | null,
  parentMeta?: ParentSessionMeta | null,
) {
  await setItem(TOKEN_KEY, token);
  await setItem(USER_KEY, JSON.stringify(user));
  if (user.email) await setItem(EMAIL_KEY, user.email);
  if (studentMeta) {
    await setItem(STUDENT_META_KEY, JSON.stringify(studentMeta));
  } else {
    await removeItems([STUDENT_META_KEY]);
  }
  if (parentMeta) {
    await setItem(PARENT_META_KEY, JSON.stringify(parentMeta));
  } else {
    await removeItems([PARENT_META_KEY]);
  }
}

export async function clearSession() {
  await removeItems([TOKEN_KEY, USER_KEY, STUDENT_META_KEY, PARENT_META_KEY]);
}

export async function loadSession(): Promise<{
  token: string;
  user: AuthUser;
  studentMeta: StudentSessionMeta | null;
  parentMeta: ParentSessionMeta | null;
} | null> {
  const pairs = await multiGet([
    TOKEN_KEY,
    USER_KEY,
    STUDENT_META_KEY,
    PARENT_META_KEY,
  ]);
  const token = pairs[0][1];
  const userRaw = pairs[1][1];
  const metaRaw = pairs[2][1];
  const parentMetaRaw = pairs[3][1];
  if (!token || !userRaw) return null;
  try {
    let studentMeta: StudentSessionMeta | null = null;
    let parentMeta: ParentSessionMeta | null = null;
    if (metaRaw) {
      try {
        studentMeta = JSON.parse(metaRaw) as StudentSessionMeta;
      } catch {
        studentMeta = null;
      }
    }
    if (parentMetaRaw) {
      try {
        parentMeta = JSON.parse(parentMetaRaw) as ParentSessionMeta;
      } catch {
        parentMeta = null;
      }
    }
    return {
      token,
      user: JSON.parse(userRaw) as AuthUser,
      studentMeta,
      parentMeta,
    };
  } catch {
    await clearSession();
    return null;
  }
}

export async function getToken() {
  return getItem(TOKEN_KEY);
}

export async function loadRememberedEmail() {
  return getItem(EMAIL_KEY);
}
