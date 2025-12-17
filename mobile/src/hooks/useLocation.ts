/**
 * VendHub Mobile - Location Hook
 *
 * Custom hook for managing device location
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { Linking, Alert, Platform } from 'react-native';

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
}

interface UseLocationReturn {
  // State
  location: LocationCoords | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;

  // Actions
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<LocationCoords | null>;
  watchLocation: () => Promise<void>;
  stopWatching: () => void;

  // Utilities
  openSettings: () => void;
  getDistanceTo: (lat: number, lng: number) => number | null;
  formatDistance: (meters: number) => string;
}

interface UseLocationOptions {
  accuracy?: Location.Accuracy;
  autoRequest?: boolean;
  watchOnMount?: boolean;
}

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const {
    accuracy = Location.Accuracy.High,
    autoRequest = false,
    watchOnMount = false,
  } = options;

  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);

  const watchSubscription = useRef<Location.LocationSubscription | null>(null);

  // Check and request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check foreground permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(foregroundStatus);

      if (foregroundStatus !== 'granted') {
        setError('Доступ к геолокации не предоставлен');
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('[useLocation] Permission error:', err);
      setError('Ошибка при запросе разрешения');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get current location once
  const getCurrentLocation = useCallback(async (): Promise<LocationCoords | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check permission first
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        setError('Доступ к геолокации не предоставлен');
        return null;
      }

      // Get current position
      const result = await Location.getCurrentPositionAsync({
        accuracy,
      });

      const coords: LocationCoords = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracy: result.coords.accuracy,
        altitude: result.coords.altitude,
        heading: result.coords.heading,
        speed: result.coords.speed,
      };

      setLocation(coords);
      console.log('[useLocation] Got location:', coords.latitude, coords.longitude);
      return coords;
    } catch (err: any) {
      console.error('[useLocation] Get location error:', err);

      if (err.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
        setError('Геолокация отключена в настройках устройства');
      } else if (err.code === 'E_LOCATION_TIMEOUT') {
        setError('Превышено время ожидания определения местоположения');
      } else {
        setError('Не удалось определить местоположение');
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [accuracy]);

  // Watch location continuously
  const watchLocation = useCallback(async (): Promise<void> => {
    // Stop existing watch if any
    if (watchSubscription.current) {
      watchSubscription.current.remove();
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check permission
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        setError('Доступ к геолокации не предоставлен');
        setIsLoading(false);
        return;
      }

      // Start watching
      watchSubscription.current = await Location.watchPositionAsync(
        {
          accuracy,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Or when moved 10 meters
        },
        (result) => {
          const coords: LocationCoords = {
            latitude: result.coords.latitude,
            longitude: result.coords.longitude,
            accuracy: result.coords.accuracy,
            altitude: result.coords.altitude,
            heading: result.coords.heading,
            speed: result.coords.speed,
          };

          setLocation(coords);
          setIsLoading(false);
        }
      );

      console.log('[useLocation] Started watching location');
    } catch (err: any) {
      console.error('[useLocation] Watch error:', err);
      setError('Не удалось начать отслеживание местоположения');
      setIsLoading(false);
    }
  }, [accuracy]);

  // Stop watching location
  const stopWatching = useCallback((): void => {
    if (watchSubscription.current) {
      watchSubscription.current.remove();
      watchSubscription.current = null;
      console.log('[useLocation] Stopped watching location');
    }
  }, []);

  // Open device settings
  const openSettings = useCallback((): void => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  // Calculate distance to a point (in meters)
  const getDistanceTo = useCallback(
    (lat: number, lng: number): number | null => {
      if (!location) return null;

      // Haversine formula
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (location.latitude * Math.PI) / 180;
      const φ2 = (lat * Math.PI) / 180;
      const Δφ = ((lat - location.latitude) * Math.PI) / 180;
      const Δλ = ((lng - location.longitude) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distance in meters
    },
    [location]
  );

  // Format distance for display
  const formatDistance = useCallback((meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} м`;
    }
    return `${(meters / 1000).toFixed(1)} км`;
  }, []);

  // Auto request permission on mount if enabled
  useEffect(() => {
    if (autoRequest) {
      requestPermission();
    }
  }, [autoRequest, requestPermission]);

  // Start watching on mount if enabled
  useEffect(() => {
    if (watchOnMount) {
      watchLocation();
    }

    // Cleanup on unmount
    return () => {
      stopWatching();
    };
  }, [watchOnMount, watchLocation, stopWatching]);

  // Initial permission check
  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      setPermissionStatus(status);
    });
  }, []);

  return {
    location,
    isLoading,
    error,
    permissionStatus,
    requestPermission,
    getCurrentLocation,
    watchLocation,
    stopWatching,
    openSettings,
    getDistanceTo,
    formatDistance,
  };
}

/**
 * Simple hook to get location once
 */
export function useCurrentLocation(): {
  location: LocationCoords | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { location, isLoading, error, getCurrentLocation, requestPermission } = useLocation();
  const [hasRequested, setHasRequested] = useState(false);

  const refresh = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (hasPermission) {
      await getCurrentLocation();
    }
  }, [requestPermission, getCurrentLocation]);

  useEffect(() => {
    if (!hasRequested) {
      setHasRequested(true);
      refresh();
    }
  }, [hasRequested, refresh]);

  return { location, isLoading, error, refresh };
}

export default useLocation;
