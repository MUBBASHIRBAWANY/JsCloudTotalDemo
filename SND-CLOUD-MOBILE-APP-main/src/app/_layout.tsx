import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Provider } from 'react-redux';

import { BRAND_SPLASH_BG } from '@/components/BrandSplash';
import { AppPopupProvider } from '@/components/ui/AppPopup';
import { store } from '@/redux/Store/store';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
void SystemUI.setBackgroundColorAsync(BRAND_SPLASH_BG).catch(() => undefined);

export default function RootLayout() {
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(BRAND_SPLASH_BG).catch(() => undefined);
  }, []);

  return (
    <Provider store={store}>
      <AppPopupProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: BRAND_SPLASH_BG },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(drawer)" />
        </Stack>
      </AppPopupProvider>
    </Provider>
  );
}
