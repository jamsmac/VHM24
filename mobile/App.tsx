/**
 * VendHub Mobile App
 *
 * Entry point for the mobile application
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { NetworkStatusBanner, ErrorBoundary } from './src/components';
import { offlineService } from './src/services/offline';
import { notificationService } from './src/services/notifications';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize services on app start
    const initializeApp = async () => {
      try {
        // Initialize offline service
        await offlineService.initialize();
        console.log('[App] Offline service initialized');

        // Initialize notification service
        await notificationService.initialize();
        console.log('[App] Notification service initialized');

        // Request push notification permission (user can decline)
        await notificationService.registerForPushNotifications();
      } catch (error) {
        console.error('[App] Failed to initialize services:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();

    // Cleanup on app close
    return () => {
      offlineService.cleanup();
      notificationService.cleanup();
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <View style={styles.container}>
            <StatusBar style="auto" />
            <AppNavigator />
            <NetworkStatusBanner />
          </View>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
