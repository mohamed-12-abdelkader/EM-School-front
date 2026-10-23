import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loginRequest, loginStudentRequest } from '@/api/auth';
import { ApiError } from '@/api/client';
import {
  clearSession,
  loadSession,
  saveSession,
  type StudentSessionMeta,
} from '@/auth/storage';
import { onUnauthorized } from '@/auth/sessionEvents';
import type { AuthUser } from '@/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  studentMeta: StudentSessionMeta | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginStudent: (loginCode: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isSchoolAdmin: boolean;
  isStudent: boolean;
  isTeacher: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapNetworkError(err: unknown): never {
  if (err instanceof ApiError) throw err;
  const detail = err instanceof Error ? err.message : '';
  if (/failed to fetch|networkerror|load failed/i.test(detail)) {
    throw new ApiError(
      'تعذر قراءة رد الخادم (غالباً CORS). أعد تشغيل الـ API بعد تحديث CORS، وتأكد أن Expo مسموح.',
      0,
    );
  }
  throw new ApiError('تعذر الاتصال بالخادم. تأكد أن الـ API يعمل على المنفذ 8000', 0);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [studentMeta, setStudentMeta] = useState<StudentSessionMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const session = await loadSession();
        if (mounted && session) {
          setUser(session.user);
          setToken(session.token);
          setStudentMeta(session.studentMeta);
        }
      } catch {
        // Keep logged out if storage is unavailable
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return onUnauthorized(() => {
      clearSession();
      setUser(null);
      setToken(null);
      setStudentMeta(null);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await loginRequest(email.trim(), password);
      await saveSession(data.token, data.user, null);
      setUser(data.user);
      setToken(data.token);
      setStudentMeta(null);
      return data.user;
    } catch (err) {
      mapNetworkError(err);
    }
  }, []);

  const loginStudent = useCallback(async (loginCode: string) => {
    try {
      const data = await loginStudentRequest(loginCode.trim());
      const meta: StudentSessionMeta = {
        school: data.school,
        profile: data.profile,
      };
      await saveSession(data.token, data.user, meta);
      setUser(data.user);
      setToken(data.token);
      setStudentMeta(meta);
      return data.user;
    } catch (err) {
      mapNetworkError(err);
    }
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
    setToken(null);
    setStudentMeta(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      studentMeta,
      login,
      loginStudent,
      logout,
      isAdmin: user?.role === 'admin',
      isSchoolAdmin: user?.role === 'school_admin',
      isStudent: user?.role === 'student',
      isTeacher: user?.role === 'teacher',
    }),
    [user, token, loading, studentMeta, login, loginStudent, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
