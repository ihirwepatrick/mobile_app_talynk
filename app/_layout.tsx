import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useCallback } from 'react';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { LogBox, AppState, AppStateStatus } from 'react-native';

import { AuthProvider } from '@/lib/auth-context';
import { CacheProvider } from '@/lib/cache-context';
import { Provider } from 'react-redux';
import { store } from '@/lib/store';
import { initializeStore } from '@/lib/store/initializeStore';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { imageCache } from '@/lib/utils/image-cache';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  // Force dark theme
  const theme = DarkTheme;

  // Initialize Redux store from AsyncStorage
  useEffect(() => {
    initializeStore();
  }, []);

  // Initialize image cache
  useEffect(() => {
    imageCache.initialize();
  }, []);

  // Memory management: Clear caches when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // Trigger garbage collection hints by clearing old cache entries
        imageCache.cleanupExpired();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Ignore dev-only warnings
  useEffect(() => {
    LogBox.ignoreLogs([
      'Unable to activate keep awake',
      'Non-serializable values were found in the navigation state',
    ]);
  }, []);

  return (
    <Provider store={store}>
      <CacheProvider>
        <AuthProvider>
          <ThemeProvider value={theme}>
            <Stack 
              screenOptions={{ 
                headerShown: false,
                // Enable lazy loading for all screens
                lazy: true,
                // Freeze screens when not focused for memory optimization
                freezeOnBlur: true,
                // Animation optimization
                animation: 'fade',
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="auth" options={{ headerShown: false }} />
              <Stack.Screen 
                name="post/[id]" 
                options={{ 
                  headerShown: false,
                  // Don't detach this screen as it's commonly accessed
                  detachPreviousScreen: false,
                }} 
              />
              <Stack.Screen 
                name="user/[id]" 
                options={{ 
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="profile-feed/[userId]" 
                options={{ 
                  headerShown: false,
                  // Detach previous screen for memory when viewing feed
                  detachPreviousScreen: true,
                }} 
              />
              <Stack.Screen name="followers/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="search" options={{ headerShown: false }} />
              <Stack.Screen name="category/[name]" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="light" />
          </ThemeProvider>
        </AuthProvider>
      </CacheProvider>
    </Provider>
  );
}