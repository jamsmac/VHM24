/**
 * VendHub Mobile - Network Status Hook
 *
 * Custom hook for monitoring network connectivity
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { useOfflineStore } from '../store/offline.store';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isWifi: boolean;
  isCellular: boolean;
  details: NetInfoState | null;
}

interface UseNetworkStatusReturn extends NetworkStatus {
  refresh: () => Promise<NetworkStatus>;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
    isWifi: false,
    isCellular: false,
    details: null,
  });

  const setOnline = useOfflineStore((state) => state.setOnline);

  // Parse NetInfo state into our status format
  const parseNetInfoState = useCallback((state: NetInfoState): NetworkStatus => {
    const isConnected = state.isConnected ?? false;
    const isInternetReachable = state.isInternetReachable;
    const type = state.type;
    const isWifi = type === 'wifi';
    const isCellular = type === 'cellular';

    return {
      isConnected,
      isInternetReachable,
      type,
      isWifi,
      isCellular,
      details: state,
    };
  }, []);

  // Manual refresh
  const refresh = useCallback(async (): Promise<NetworkStatus> => {
    try {
      const state = await NetInfo.fetch();
      const status = parseNetInfoState(state);
      setNetworkStatus(status);

      // Update offline store
      const isOnline = status.isConnected && (status.isInternetReachable !== false);
      setOnline(isOnline);

      return status;
    } catch (error) {
      console.error('[useNetworkStatus] Failed to fetch network state:', error);
      return networkStatus;
    }
  }, [parseNetInfoState, setOnline, networkStatus]);

  useEffect(() => {
    let subscription: NetInfoSubscription | null = null;

    // Initial fetch
    NetInfo.fetch().then((state) => {
      const status = parseNetInfoState(state);
      setNetworkStatus(status);

      // Update offline store
      const isOnline = status.isConnected && (status.isInternetReachable !== false);
      setOnline(isOnline);

      console.log('[useNetworkStatus] Initial state:', {
        isConnected: status.isConnected,
        isInternetReachable: status.isInternetReachable,
        type: status.type,
      });
    });

    // Subscribe to network changes
    subscription = NetInfo.addEventListener((state) => {
      const status = parseNetInfoState(state);
      setNetworkStatus(status);

      // Update offline store
      const isOnline = status.isConnected && (status.isInternetReachable !== false);
      setOnline(isOnline);

      console.log('[useNetworkStatus] Network changed:', {
        isConnected: status.isConnected,
        isInternetReachable: status.isInternetReachable,
        type: status.type,
      });
    });

    return () => {
      if (subscription) {
        subscription();
      }
    };
  }, [parseNetInfoState, setOnline]);

  return {
    ...networkStatus,
    refresh,
  };
}

/**
 * Simple hook that just returns online/offline status
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && (state.isInternetReachable !== false);
      setIsOnline(online ?? true);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      const online = state.isConnected && (state.isInternetReachable !== false);
      setIsOnline(online ?? true);
    });

    return () => unsubscribe();
  }, []);

  return isOnline;
}

export default useNetworkStatus;
