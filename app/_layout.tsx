import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  useFonts,
} from '@expo-google-fonts/cairo';
import * as SystemUI from 'expo-system-ui';
import { ToastProvider } from '@/components/ui';
import { AuthProvider } from '@/auth/AuthContext';
import { colors } from '@/theme/tokens';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'ar');
  document.documentElement.style.colorScheme = 'light';
  document.body.style.direction = 'rtl';
  document.body.style.backgroundColor = '#F8FAFC';
  document.body.style.color = '#0F172A';
  // Inject CSS so sidebar stays on the physical right under RTL
  const existing = document.getElementById('em-rtl-layout-css');
  if (!existing) {
    const style = document.createElement('style');
    style.id = 'em-rtl-layout-css';
    style.textContent = `
      :root { color-scheme: light; }
      html, body, #root { background: #F8FAFC !important; color: #0F172A; }
      #em-sidebar-right, #em-drawer-right {
        left: auto !important;
        right: 0 !important;
        inset-inline-start: 0 !important;
        inset-inline-end: auto !important;
      }
    `;
    document.head.appendChild(style);
  }
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    }
  }, []);

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_left',
              }}
            />
          </View>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
