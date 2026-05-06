import { useEffect, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold
} from '@expo-google-fonts/be-vietnam-pro';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { socketService } from '../src/services/socket';
import { NotificationsProvider } from '../src/context/notifications-context';
import {
  configureNotificationHandler,
  addNotificationResponseListener,
} from '../src/services/push-notifications';
import { IncomingCallOverlay } from '../src/components/IncomingCallOverlay';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated]);

  // Configure push notification handler and tap listener
  useEffect(() => {
    configureNotificationHandler();

    const subscription = addNotificationResponseListener((conversationId, type) => {
      console.log('[Push] Notification tapped:', conversationId, type);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NotificationsProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="chat-room" options={{ headerShown: false }} />
          <Stack.Screen name="post-detail" options={{ headerShown: false }} />
          <Stack.Screen name="explore" options={{ headerShown: false }} />
          <Stack.Screen name="call-screen" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        </Stack>
        <IncomingCallOverlay />
      </NotificationsProvider>
    </GestureHandlerRootView>
  );
}
