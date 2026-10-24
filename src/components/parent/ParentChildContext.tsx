import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getParentDashboard,
  loadSelectedChildId,
  pickActiveChild,
  saveSelectedChildId,
} from '@/services/parentPortal';
import type {
  ParentChildWithStats,
  ParentDashboardData,
} from '@/types/parentPortal';

interface ParentChildContextValue {
  dashboard: ParentDashboardData | null;
  children: ParentChildWithStats[];
  selectedChild: ParentChildWithStats | null;
  selectedChildId: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  setSelectedChildId: (id: string) => void;
  refresh: (soft?: boolean) => Promise<void>;
}

const ParentChildContext = createContext<ParentChildContextValue | null>(null);

export function ParentChildProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<ParentDashboardData | null>(null);
  const [selectedChildId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getParentDashboard();
      setDashboard(data);
      const nextId = await loadSelectedChildId(data.children);
      setSelectedId(nextId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات ولي الأمر');
      if (!soft) setDashboard(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSelectedChildId = useCallback((id: string) => {
    setSelectedId(id);
    void saveSelectedChildId(id);
  }, []);

  const selectedChild = useMemo(
    () => pickActiveChild(dashboard, selectedChildId),
    [dashboard, selectedChildId],
  );

  const value = useMemo(
    () => ({
      dashboard,
      children: dashboard?.children || [],
      selectedChild,
      selectedChildId: selectedChild?.id || null,
      loading,
      refreshing,
      error,
      setSelectedChildId,
      refresh,
    }),
    [
      dashboard,
      selectedChild,
      loading,
      refreshing,
      error,
      setSelectedChildId,
      refresh,
    ],
  );

  return (
    <ParentChildContext.Provider value={value}>{children}</ParentChildContext.Provider>
  );
}

export function useParentChild() {
  const ctx = useContext(ParentChildContext);
  if (!ctx) throw new Error('useParentChild must be used within ParentChildProvider');
  return ctx;
}
