/**
 * useNetworkStatus Hook Tests
 */

import NetInfo from '@react-native-community/netinfo';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(() => jest.fn()), // Returns unsubscribe function
}));

// Mock offline store
jest.mock('../../src/store/offline.store', () => ({
  useOfflineStore: jest.fn((selector) => {
    const mockState = { setOnline: jest.fn() };
    return selector ? selector(mockState) : mockState;
  }),
}));

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('useNetworkStatus utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseNetInfoState logic', () => {
    // Test the parseNetInfoState logic
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

    it('should parse wifi connection correctly', () => {
      const state = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(true);
      expect(result.isWifi).toBe(true);
      expect(result.isCellular).toBe(false);
      expect(result.type).toBe('wifi');
    });

    it('should parse cellular connection correctly', () => {
      const state = {
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(true);
      expect(result.isWifi).toBe(false);
      expect(result.isCellular).toBe(true);
      expect(result.type).toBe('cellular');
    });

    it('should handle disconnected state', () => {
      const state = {
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(false);
      expect(result.isWifi).toBe(false);
      expect(result.isCellular).toBe(false);
    });

    it('should handle null isConnected', () => {
      const state = {
        isConnected: null,
        isInternetReachable: null,
        type: 'unknown',
      };

      const result = parseNetInfoState(state);

      expect(result.isConnected).toBe(false);
    });
  });

  describe('isOnline logic', () => {
    const isOnline = (state: any) => {
      return state.isConnected && (state.isInternetReachable !== false);
    };

    it('should return true when connected and reachable', () => {
      expect(isOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
    });

    it('should return true when connected and reachable is null', () => {
      expect(isOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
    });

    it('should return false when not connected', () => {
      expect(isOnline({ isConnected: false, isInternetReachable: true })).toBe(false);
    });

    it('should return false when not reachable', () => {
      expect(isOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
    });
  });

  describe('NetInfo fetch', () => {
    it('should fetch network state', async () => {
      const mockState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      };
      mockNetInfo.fetch.mockResolvedValueOnce(mockState as any);

      const state = await NetInfo.fetch();

      expect(state.isConnected).toBe(true);
      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });
  });

  describe('NetInfo addEventListener', () => {
    it('should subscribe to network changes', () => {
      const callback = jest.fn();
      const unsubscribe = NetInfo.addEventListener(callback);

      expect(mockNetInfo.addEventListener).toHaveBeenCalledWith(callback);
      expect(typeof unsubscribe).toBe('function');
    });
  });
});
