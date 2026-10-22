import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, shadows, spacing } from '@/theme/tokens';
import { Icon } from './Icon';

type ToastTone = 'success' | 'info' | 'warning' | 'danger';

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = `${Date.now()}`;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={styles.host}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setItems((prev) => prev.filter((t) => t.id !== item.id))}
            style={[styles.toast, toneStyle[item.tone]]}
          >
            <Icon
              name={item.tone === 'success' ? 'Check' : item.tone === 'danger' ? 'AlertCircle' : 'Bell'}
              size={16}
              color="#fff"
            />
            <Text style={styles.text}>{item.message}</Text>
          </Pressable>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const toneStyle = {
  success: { backgroundColor: colors.success },
  info: { backgroundColor: colors.primary },
  warning: { backgroundColor: colors.warning },
  danger: { backgroundColor: colors.danger },
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    maxWidth: 420,
    ...shadows.md,
  },
  text: {
    color: '#fff',
    fontFamily: fonts.semiBold,
    fontSize: 13,
    textAlign: 'right',
  },
});
