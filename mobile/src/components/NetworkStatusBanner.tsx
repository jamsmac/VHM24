/**
 * VendHub Mobile - Network Status Banner
 *
 * Shows a banner when offline or when there are pending sync items
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOfflineStore } from '../store/offline.store';

interface NetworkStatusBannerProps {
  showSyncButton?: boolean;
}

export function NetworkStatusBanner({ showSyncButton = true }: NetworkStatusBannerProps) {
  const { isConnected, isInternetReachable, type } = useNetworkStatus();
  const {
    taskQueue,
    photoQueue,
    isSyncing,
    lastSyncAt,
    syncError,
    syncAll,
    isOnline,
  } = useOfflineStore();

  const [visible, setVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(-100))[0];

  const queueCount = taskQueue.length + photoQueue.length;
  const hasQueuedItems = queueCount > 0;
  const shouldShow = !isOnline || hasQueuedItems;

  useEffect(() => {
    if (shouldShow) {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [shouldShow, slideAnim]);

  const handleSync = async () => {
    if (isSyncing || !isOnline) return;
    await syncAll();
  };

  if (!visible) return null;

  // Offline banner
  if (!isOnline) {
    return (
      <Animated.View
        style={[
          styles.container,
          styles.offlineContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.content}>
          <Ionicons name="cloud-offline" size={20} color="#fff" />
          <View style={styles.textContainer}>
            <Text style={styles.title}>Нет подключения</Text>
            <Text style={styles.subtitle}>
              {queueCount > 0
                ? `${queueCount} элемент${getPlural(queueCount)} в очереди`
                : 'Изменения будут синхронизированы при подключении'}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Online but has queued items
  if (hasQueuedItems) {
    return (
      <Animated.View
        style={[
          styles.container,
          styles.syncContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.content}>
          <Ionicons name="sync-circle" size={20} color="#fff" />
          <View style={styles.textContainer}>
            <Text style={styles.title}>Ожидание синхронизации</Text>
            <Text style={styles.subtitle}>
              {queueCount} элемент{getPlural(queueCount)} в очереди
            </Text>
          </View>
        </View>

        {showSyncButton && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="sync" size={16} color="#fff" />
                <Text style={styles.syncButtonText}>Синхронизировать</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }

  return null;
}

/**
 * Compact network indicator for use in headers
 */
export function NetworkIndicator() {
  const { isOnline, taskQueue, photoQueue, isSyncing } = useOfflineStore();
  const queueCount = taskQueue.length + photoQueue.length;

  if (isOnline && queueCount === 0 && !isSyncing) {
    return null;
  }

  if (isSyncing) {
    return (
      <View style={indicatorStyles.container}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  if (!isOnline) {
    return (
      <View style={[indicatorStyles.container, indicatorStyles.offline]}>
        <Ionicons name="cloud-offline" size={16} color="#fff" />
      </View>
    );
  }

  if (queueCount > 0) {
    return (
      <View style={[indicatorStyles.container, indicatorStyles.pending]}>
        <Text style={indicatorStyles.count}>{queueCount}</Text>
      </View>
    );
  }

  return null;
}

// Helper function for Russian plural
function getPlural(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'ов';
  }

  if (lastDigit === 1) {
    return '';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'а';
  }

  return 'ов';
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: 50, // Account for status bar
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  offlineContainer: {
    backgroundColor: '#ef4444',
  },
  syncContainer: {
    backgroundColor: '#f59e0b',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});

const indicatorStyles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  offline: {
    backgroundColor: '#ef4444',
  },
  pending: {
    backgroundColor: '#f59e0b',
  },
  count: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default NetworkStatusBanner;
