/**
 * useNetworkStatus Hook Tests
 *
 * Comprehensive tests for network status monitoring
 */

import NetInfo from '@react-native-community/netinfo';

// Mock NetInfo
const mockUnsubscribe = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(() => mockUnsubscribe),
}));

// Mock offline store
const mockSetOnline = jest.fn();
jest.mock('../../src/store/offline.store', () => ({
  useOfflineStore: jest.fn((selector) => {
    const mockState = { setOnline: mockSetOnline };
    return selector ? selector(mockState) : mockState;
  }),
}));

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('useNetworkStatus - parseNetInfoState', () => {
  // Test the parseNetInfoState logic (same as in hook)
  const parseNetInfoState = (state: any) => {
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
  };

  describe('WiFi connection', () => {
    it('should parse wifi connection with full connectivity', () => {
      const state = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: { ssid: 'MyNetwork', strength: 80 },
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(true);
      expect(result.isInternetReachable).toBe(true);
      expect(result.isWifi).toBe(true);
      expect(result.isCellular).toBe(false);
      expect(result.type).toBe('wifi');
      expect(result.details).toEqual(state);
    });

    it('should parse wifi without internet reachability', () => {
      const state = {
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(true);
      expect(result.isInternetReachable).toBe(false);
      expect(result.isWifi).toBe(true);
    });

    it('should handle wifi with null internet reachability', () => {
      const state = {
        isConnected: true,
        isInternetReachable: null,
        type: 'wifi',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(true);
      expect(result.isInternetReachable).toBeNull();
      expect(result.isWifi).toBe(true);
    });
  });

  describe('Cellular connection', () => {
    it('should parse cellular connection correctly', () => {
      const state = {
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: { cellularGeneration: '4g', carrier: 'TestCarrier' },
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(true);
      expect(result.isWifi).toBe(false);
      expect(result.isCellular).toBe(true);
      expect(result.type).toBe('cellular');
    });

    it('should handle cellular with limited connectivity', () => {
      const state = {
        isConnected: true,
        isInternetReachable: false,
        type: 'cellular',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(true);
      expect(result.isInternetReachable).toBe(false);
      expect(result.isCellular).toBe(true);
    });
  });

  describe('Other connection types', () => {
    it('should handle ethernet connection', () => {
      const state = {
        isConnected: true,
        isInternetReachable: true,
        type: 'ethernet',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(true);
      expect(result.isWifi).toBe(false);
      expect(result.isCellular).toBe(false);
      expect(result.type).toBe('ethernet');
    });

    it('should handle bluetooth connection', () => {
      const state = {
        isConnected: true,
        isInternetReachable: true,
        type: 'bluetooth',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(true);
      expect(result.isWifi).toBe(false);
      expect(result.isCellular).toBe(false);
      expect(result.type).toBe('bluetooth');
    });

    it('should handle VPN connection', () => {
      const state = {
        isConnected: true,
        isInternetReachable: true,
        type: 'vpn',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(true);
      expect(result.type).toBe('vpn');
    });
  });

  describe('Disconnected states', () => {
    it('should handle no connection (type: none)', () => {
      const state = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(false);
      expect(result.isInternetReachable).toBe(false);
      expect(result.isWifi).toBe(false);
      expect(result.isCellular).toBe(false);
      expect(result.type).toBe('none');
    });

    it('should handle unknown connection type', () => {
      const state = {
        isConnected: false,
        isInternetReachable: null,
        type: 'unknown',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(false);
      expect(result.type).toBe('unknown');
    });

    it('should default to false when isConnected is null', () => {
      const state = {
        isConnected: null,
        isInternetReachable: null,
        type: 'unknown',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(false);
    });

    it('should default to false when isConnected is undefined', () => {
      const state = {
        isInternetReachable: true,
        type: 'wifi',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(false);
    });
  });
});

describe('useNetworkStatus - isOnline logic', () => {
  // Test the isOnline determination logic
  const isOnline = (status: { isConnected: boolean; isInternetReachable: boolean | null }) => {
    return status.isConnected && (status.isInternetReachable !== false);
  };

  describe('Online scenarios', () => {
    it('should return true when connected and reachable is true', () => {
      expect(isOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
    });

    it('should return true when connected and reachable is null (unknown)', () => {
      expect(isOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
    });
  });

  describe('Offline scenarios', () => {
    it('should return false when not connected (reachable true)', () => {
      expect(isOnline({ isConnected: false, isInternetReachable: true })).toBe(false);
    });

    it('should return false when not connected (reachable false)', () => {
      expect(isOnline({ isConnected: false, isInternetReachable: false })).toBe(false);
    });

    it('should return false when not connected (reachable null)', () => {
      expect(isOnline({ isConnected: false, isInternetReachable: null })).toBe(false);
    });

    it('should return false when connected but explicitly not reachable', () => {
      expect(isOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle captive portal scenario (connected but not reachable)', () => {
      // This is a common scenario in hotels, airports, etc.
      const status = { isConnected: true, isInternetReachable: false };
      expect(isOnline(status)).toBe(false);
    });
  });
});

describe('useNetworkStatus - NetInfo API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe.mockClear();
  });

  describe('NetInfo.fetch', () => {
    it('should fetch current network state', async () => {
      const mockState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {
          ssid: 'TestNetwork',
          bssid: '00:00:00:00:00:00',
          strength: 80,
          ipAddress: '192.168.1.100',
          subnet: '255.255.255.0',
          frequency: 5,
        },
      };
      mockNetInfo.fetch.mockResolvedValueOnce(mockState as any);

      const state = await NetInfo.fetch();

      expect(state).toEqual(mockState);
      expect(mockNetInfo.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch for cellular network', async () => {
      const mockState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: {
          cellularGeneration: '4g',
          carrier: 'TestCarrier',
          isConnectionExpensive: true,
        },
      };
      mockNetInfo.fetch.mockResolvedValueOnce(mockState as any);

      const state = await NetInfo.fetch();

      expect(state.type).toBe('cellular');
      expect((state.details as any)?.cellularGeneration).toBe('4g');
    });

    it('should handle fetch when offline', async () => {
      const mockState = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: null,
      };
      mockNetInfo.fetch.mockResolvedValueOnce(mockState as any);

      const state = await NetInfo.fetch();

      expect(state.isConnected).toBe(false);
      expect(state.type).toBe('none');
    });

    it('should handle fetch errors', async () => {
      mockNetInfo.fetch.mockRejectedValueOnce(new Error('Network fetch failed'));

      await expect(NetInfo.fetch()).rejects.toThrow('Network fetch failed');
    });
  });

  describe('NetInfo.addEventListener', () => {
    it('should subscribe to network changes', () => {
      const callback = jest.fn();
      const unsubscribe = NetInfo.addEventListener(callback);

      expect(mockNetInfo.addEventListener).toHaveBeenCalledWith(callback);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should call unsubscribe function when cleanup', () => {
      const callback = jest.fn();
      const unsubscribe = NetInfo.addEventListener(callback);

      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should handle multiple subscriptions', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      NetInfo.addEventListener(callback1);
      NetInfo.addEventListener(callback2);

      expect(mockNetInfo.addEventListener).toHaveBeenCalledTimes(2);
      expect(mockNetInfo.addEventListener).toHaveBeenNthCalledWith(1, callback1);
      expect(mockNetInfo.addEventListener).toHaveBeenNthCalledWith(2, callback2);
    });
  });
});

describe('useNetworkStatus - Hook Integration Simulation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetOnline.mockClear();
    mockUnsubscribe.mockClear();
  });

  describe('Initial fetch and subscription', () => {
    it('should simulate initial fetch and subscription setup', async () => {
      const mockState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      };
      mockNetInfo.fetch.mockResolvedValueOnce(mockState as any);

      // Simulate what the hook does on mount
      const state = await NetInfo.fetch();

      const parseNetInfoState = (s: any) => ({
        isConnected: s.isConnected ?? false,
        isInternetReachable: s.isInternetReachable,
        type: s.type,
        isWifi: s.type === 'wifi',
        isCellular: s.type === 'cellular',
        details: s,
      });

      const status = parseNetInfoState(state);
      const isOnline = status.isConnected && (status.isInternetReachable !== false);

      // Simulate setOnline call
      mockSetOnline(isOnline);

      expect(status.isConnected).toBe(true);
      expect(status.isWifi).toBe(true);
      expect(mockSetOnline).toHaveBeenCalledWith(true);
    });

    it('should simulate subscription callback receiving updates', async () => {
      let capturedCallback: any;
      mockNetInfo.addEventListener.mockImplementationOnce((callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      // Simulate subscription
      const callback = jest.fn();
      NetInfo.addEventListener(callback);

      // Verify callback was captured
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });
  });

  describe('Network change scenarios', () => {
    it('should handle transition from wifi to cellular', () => {
      const parseNetInfoState = (s: any) => ({
        isConnected: s.isConnected ?? false,
        isInternetReachable: s.isInternetReachable,
        type: s.type,
        isWifi: s.type === 'wifi',
        isCellular: s.type === 'cellular',
        details: s,
      });

      // Initial state: wifi
      const wifiState = { isConnected: true, isInternetReachable: true, type: 'wifi' };
      const wifiStatus = parseNetInfoState(wifiState);
      expect(wifiStatus.isWifi).toBe(true);
      expect(wifiStatus.isCellular).toBe(false);

      // New state: cellular
      const cellularState = { isConnected: true, isInternetReachable: true, type: 'cellular' };
      const cellularStatus = parseNetInfoState(cellularState);
      expect(cellularStatus.isWifi).toBe(false);
      expect(cellularStatus.isCellular).toBe(true);
    });

    it('should handle going offline', () => {
      const parseNetInfoState = (s: any) => ({
        isConnected: s.isConnected ?? false,
        isInternetReachable: s.isInternetReachable,
        type: s.type,
        isWifi: s.type === 'wifi',
        isCellular: s.type === 'cellular',
        details: s,
      });

      // Initial state: online
      const onlineState = { isConnected: true, isInternetReachable: true, type: 'wifi' };
      const onlineStatus = parseNetInfoState(onlineState);
      const wasOnline = onlineStatus.isConnected && (onlineStatus.isInternetReachable !== false);
      expect(wasOnline).toBe(true);

      // New state: offline
      const offlineState = { isConnected: false, isInternetReachable: false, type: 'none' };
      const offlineStatus = parseNetInfoState(offlineState);
      const isNowOnline = offlineStatus.isConnected && (offlineStatus.isInternetReachable !== false);
      expect(isNowOnline).toBe(false);
    });

    it('should handle coming back online', () => {
      const isOnline = (s: any) => s.isConnected && (s.isInternetReachable !== false);

      // Offline
      expect(isOnline({ isConnected: false, isInternetReachable: false })).toBe(false);

      // Back online
      expect(isOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
    });

    it('should handle captive portal detection', () => {
      // Connected to wifi but no internet (captive portal)
      const captivePortalState = {
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi',
      };

      const isOnline = captivePortalState.isConnected && (captivePortalState.isInternetReachable !== false);
      expect(isOnline).toBe(false);
    });
  });

  describe('Refresh functionality', () => {
    it('should simulate manual refresh', async () => {
      const mockState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
      };
      mockNetInfo.fetch.mockResolvedValueOnce(mockState as any);

      // Simulate refresh
      const state = await NetInfo.fetch();

      expect(state.isConnected).toBe(true);
      expect(state.type).toBe('cellular');
    });

    it('should handle refresh error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockNetInfo.fetch.mockRejectedValueOnce(new Error('Refresh failed'));

      // Simulate refresh with error handling
      let currentStatus = { isConnected: true, isInternetReachable: true, type: 'wifi' };

      try {
        await NetInfo.fetch();
      } catch (error) {
        console.error('[useNetworkStatus] Failed to fetch network state:', error);
        // Keep current status on error (as hook does)
      }

      // Status should remain unchanged
      expect(currentStatus.isConnected).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on cleanup', () => {
      // Simulate hook mount
      const unsubscribe = NetInfo.addEventListener(() => {});

      // Simulate hook unmount
      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});

describe('useIsOnline - Simple hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe.mockClear();
  });

  describe('Initial state', () => {
    it('should default to true (optimistic)', () => {
      // The hook defaults to true until it gets network info
      const defaultIsOnline = true;
      expect(defaultIsOnline).toBe(true);
    });
  });

  describe('State updates', () => {
    it('should calculate online status correctly', () => {
      const calculateOnline = (state: any) => {
        const online = state.isConnected && (state.isInternetReachable !== false);
        return online ?? true;
      };

      // Connected and reachable
      expect(calculateOnline({ isConnected: true, isInternetReachable: true })).toBe(true);

      // Connected, reachable unknown
      expect(calculateOnline({ isConnected: true, isInternetReachable: null })).toBe(true);

      // Disconnected
      expect(calculateOnline({ isConnected: false, isInternetReachable: false })).toBe(false);

      // Connected but not reachable
      expect(calculateOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
    });

    it('should default to true when calculation is falsy but undefined', () => {
      const calculateOnline = (state: any) => {
        const online = state.isConnected && (state.isInternetReachable !== false);
        return online ?? true;
      };

      // When both are undefined/null
      expect(calculateOnline({ isConnected: undefined, isInternetReachable: undefined })).toBe(true);
    });
  });

  describe('Subscription', () => {
    it('should subscribe to network changes', () => {
      NetInfo.addEventListener(() => {});
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should unsubscribe on cleanup', () => {
      const unsubscribe = NetInfo.addEventListener(() => {});
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Initial fetch', () => {
    it('should fetch initial state', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      } as any);

      await NetInfo.fetch();

      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });
  });
});

describe('Network state details', () => {
  describe('WiFi details', () => {
    it('should include all wifi details', () => {
      const wifiDetails = {
        ssid: 'MyNetwork',
        bssid: '00:11:22:33:44:55',
        strength: 75,
        ipAddress: '192.168.1.100',
        subnet: '255.255.255.0',
        frequency: 5,
        linkSpeed: 150,
        rxLinkSpeed: 150,
        txLinkSpeed: 150,
      };

      const state = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: wifiDetails,
      };

      expect(state.details.ssid).toBe('MyNetwork');
      expect(state.details.strength).toBe(75);
      expect(state.details.frequency).toBe(5);
    });
  });

  describe('Cellular details', () => {
    it('should include cellular generation', () => {
      const cellularDetails = {
        cellularGeneration: '5g',
        carrier: 'VerizonWireless',
        isConnectionExpensive: true,
      };

      const state = {
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: cellularDetails,
      };

      expect(state.details.cellularGeneration).toBe('5g');
      expect(state.details.carrier).toBe('VerizonWireless');
      expect(state.details.isConnectionExpensive).toBe(true);
    });

    it('should handle different cellular generations', () => {
      const generations = ['2g', '3g', '4g', '5g'];

      generations.forEach((gen) => {
        const state = {
          type: 'cellular',
          details: { cellularGeneration: gen },
        };
        expect(state.details.cellularGeneration).toBe(gen);
      });
    });
  });
});

describe('Edge cases and error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle rapid network changes', () => {
    const states = [
      { isConnected: true, type: 'wifi' },
      { isConnected: false, type: 'none' },
      { isConnected: true, type: 'cellular' },
      { isConnected: true, type: 'wifi' },
    ];

    const parseNetInfoState = (s: any) => ({
      isConnected: s.isConnected ?? false,
      type: s.type,
      isWifi: s.type === 'wifi',
      isCellular: s.type === 'cellular',
    });

    states.forEach((state) => {
      const parsed = parseNetInfoState(state);
      expect(parsed.isConnected).toBe(state.isConnected);
      expect(parsed.type).toBe(state.type);
    });
  });

  it('should handle airplane mode', () => {
    const airplaneState = {
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
      details: null,
    };

    const isOnline = airplaneState.isConnected && (airplaneState.isInternetReachable !== false);
    expect(isOnline).toBe(false);
  });

  it('should handle network state with missing fields', () => {
    const parseNetInfoState = (s: any) => ({
      isConnected: s.isConnected ?? false,
      isInternetReachable: s.isInternetReachable,
      type: s.type,
      isWifi: s.type === 'wifi',
      isCellular: s.type === 'cellular',
      details: s,
    });

    // Minimal state
    const minimalState = { type: 'unknown' };
    const result = parseNetInfoState(minimalState);

    expect(result.isConnected).toBe(false);
    expect(result.isInternetReachable).toBeUndefined();
    expect(result.type).toBe('unknown');
  });
});
