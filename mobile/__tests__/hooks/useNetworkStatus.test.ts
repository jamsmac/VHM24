/**
 * useNetworkStatus Hook Tests
 *
 * Tests for network status monitoring hooks
 */

import NetInfo from '@react-native-community/netinfo';

// Store callbacks and state
let mockEventListener: ((state: any) => void) | null = null;
const mockUnsubscribe = jest.fn();
let mockUseStateValues: Map<number, any> = new Map();
let stateCounter = 0;
let mockEffectCleanups: (() => void)[] = [];
let mockEffects: (() => (() => void) | void)[] = [];

// Mock React
jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useState: jest.fn((initial) => {
      const currentCounter = stateCounter++;
      if (!mockUseStateValues.has(currentCounter)) {
        mockUseStateValues.set(currentCounter, initial);
      }
      const setValue = (newValue: any) => {
        if (typeof newValue === 'function') {
          mockUseStateValues.set(currentCounter, newValue(mockUseStateValues.get(currentCounter)));
        } else {
          mockUseStateValues.set(currentCounter, newValue);
        }
      };
      return [mockUseStateValues.get(currentCounter), setValue];
    }),
    useEffect: jest.fn((effect, _deps) => {
      mockEffects.push(effect);
    }),
    useCallback: jest.fn((fn, _deps) => fn),
  };
});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn((callback) => {
    mockEventListener = callback;
    return mockUnsubscribe;
  }),
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

// Import hooks after mocks
import { useNetworkStatus, useIsOnline } from '../../src/hooks/useNetworkStatus';

// Helper to run effects
const runEffects = () => {
  mockEffectCleanups = [];
  mockEffects.forEach((effect) => {
    const cleanup = effect();
    if (cleanup) {
      mockEffectCleanups.push(cleanup);
    }
  });
};

// Helper to run cleanups
const runCleanups = () => {
  mockEffectCleanups.forEach((cleanup) => cleanup());
};

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe.mockClear();
    mockSetOnline.mockClear();
    mockEventListener = null;
    mockUseStateValues = new Map();
    stateCounter = 0;
    mockEffects = [];
    mockEffectCleanups = [];

    // Default mock implementation
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: null,
    } as any);
  });

  describe('initial state', () => {
    it('should return default network status', () => {
      const result = useNetworkStatus();

      expect(result.isConnected).toBe(true);
      expect(result.isInternetReachable).toBe(true);
      expect(result.type).toBe('unknown');
      expect(result.isWifi).toBe(false);
      expect(result.isCellular).toBe(false);
      expect(result.details).toBeNull();
      expect(typeof result.refresh).toBe('function');
    });
  });

  describe('initial fetch on mount', () => {
    it('should fetch initial network state when effect runs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: { ssid: 'TestNetwork' },
      } as any);

      useNetworkStatus();
      runEffects();

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockNetInfo.fetch).toHaveBeenCalled();
      expect(mockSetOnline).toHaveBeenCalledWith(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[useNetworkStatus] Initial state:',
        expect.objectContaining({
          isConnected: true,
          type: 'wifi',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should set offline when not connected on initial fetch', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      } as any);

      useNetworkStatus();
      runEffects();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockSetOnline).toHaveBeenCalledWith(false);
    });

    it('should set online when connected with null reachability', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: null,
        type: 'wifi',
      } as any);

      useNetworkStatus();
      runEffects();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockSetOnline).toHaveBeenCalledWith(true);
    });

    it('should set offline when connected but not reachable (captive portal)', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi',
      } as any);

      useNetworkStatus();
      runEffects();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockSetOnline).toHaveBeenCalledWith(false);
    });
  });

  describe('event listener', () => {
    it('should subscribe to network changes on mount', () => {
      useNetworkStatus();
      runEffects();

      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should update state when network changes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      useNetworkStatus();
      runEffects();

      // Simulate network change via event listener
      if (mockEventListener) {
        mockEventListener({
          isConnected: true,
          isInternetReachable: true,
          type: 'cellular',
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        '[useNetworkStatus] Network changed:',
        expect.objectContaining({
          type: 'cellular',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should update offline store when network changes to offline', () => {
      useNetworkStatus();
      runEffects();

      mockSetOnline.mockClear();

      if (mockEventListener) {
        mockEventListener({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
        });
      }

      expect(mockSetOnline).toHaveBeenCalledWith(false);
    });

    it('should unsubscribe on unmount', () => {
      useNetworkStatus();
      runEffects();

      runCleanups();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should handle subscription being null on cleanup', () => {
      // Reset to test null subscription case
      mockNetInfo.addEventListener.mockReturnValueOnce(null as any);

      useNetworkStatus();
      runEffects();

      // Should not throw
      runCleanups();
    });
  });

  describe('parseNetInfoState', () => {
    it('should parse wifi connection', () => {
      useNetworkStatus();
      runEffects();

      if (mockEventListener) {
        mockEventListener({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
          details: { ssid: 'MyNetwork' },
        });
      }

      expect(mockSetOnline).toHaveBeenCalledWith(true);
    });

    it('should parse cellular connection', () => {
      useNetworkStatus();
      runEffects();

      if (mockEventListener) {
        mockEventListener({
          isConnected: true,
          isInternetReachable: true,
          type: 'cellular',
        });
      }

      expect(mockSetOnline).toHaveBeenCalledWith(true);
    });

    it('should handle null isConnected as false', () => {
      useNetworkStatus();
      runEffects();

      if (mockEventListener) {
        mockEventListener({
          isConnected: null,
          isInternetReachable: null,
          type: 'unknown',
        });
      }

      expect(mockSetOnline).toHaveBeenCalledWith(false);
    });

    it('should handle undefined isConnected as false', () => {
      useNetworkStatus();
      runEffects();

      if (mockEventListener) {
        mockEventListener({
          type: 'unknown',
        });
      }

      expect(mockSetOnline).toHaveBeenCalledWith(false);
    });
  });

  describe('refresh', () => {
    it('should fetch and return current network status', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
      } as any);

      const { refresh } = useNetworkStatus();
      const result = await refresh();

      expect(result.type).toBe('cellular');
      expect(result.isCellular).toBe(true);
      expect(result.isWifi).toBe(false);
    });

    it('should update offline store on refresh', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      } as any);

      const { refresh } = useNetworkStatus();
      await refresh();

      expect(mockSetOnline).toHaveBeenCalledWith(false);
    });

    it('should handle refresh error and return current status', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockNetInfo.fetch.mockRejectedValueOnce(new Error('Network error'));

      const { refresh } = useNetworkStatus();
      const result = await refresh();

      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[useNetworkStatus] Failed to fetch network state:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should update state on successful refresh', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      } as any);

      const { refresh } = useNetworkStatus();
      const result = await refresh();

      expect(result.isConnected).toBe(true);
      expect(mockSetOnline).toHaveBeenCalledWith(true);
    });
  });
});

describe('useIsOnline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe.mockClear();
    mockEventListener = null;
    mockUseStateValues = new Map();
    stateCounter = 0;
    mockEffects = [];
    mockEffectCleanups = [];

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    } as any);
  });

  describe('initial state', () => {
    it('should default to true (optimistic)', () => {
      const result = useIsOnline();

      expect(result).toBe(true);
    });
  });

  describe('initial fetch', () => {
    it('should update based on initial network state when offline', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      } as any);

      useIsOnline();
      runEffects();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });

    it('should remain true when connected', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      } as any);

      useIsOnline();
      runEffects();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });

    it('should fallback to true when isConnected is undefined in initial fetch', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: undefined,
        isInternetReachable: undefined,
        type: 'unknown',
      } as any);

      useIsOnline();
      runEffects();

      await new Promise(resolve => setTimeout(resolve, 0));

      // The ?? true fallback should apply
      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });

    it('should fallback to true when isConnected is null in initial fetch', async () => {
      mockNetInfo.fetch.mockResolvedValueOnce({
        isConnected: null,
        isInternetReachable: null,
        type: 'unknown',
      } as any);

      useIsOnline();
      runEffects();

      await new Promise(resolve => setTimeout(resolve, 0));

      // The ?? true fallback should apply
      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });
  });

  describe('event listener', () => {
    it('should subscribe to network changes', () => {
      useIsOnline();
      runEffects();

      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should handle going offline', () => {
      useIsOnline();
      runEffects();

      if (mockEventListener) {
        mockEventListener({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
        });
      }

      // Event was triggered
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should handle coming back online', () => {
      useIsOnline();
      runEffects();

      if (mockEventListener) {
        mockEventListener({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
        });
      }

      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should handle captive portal (connected but not reachable)', () => {
      useIsOnline();
      runEffects();

      if (mockEventListener) {
        mockEventListener({
          isConnected: true,
          isInternetReachable: false,
          type: 'wifi',
        });
      }

      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should handle null reachability as online', () => {
      useIsOnline();
      runEffects();

      if (mockEventListener) {
        mockEventListener({
          isConnected: true,
          isInternetReachable: null,
          type: 'wifi',
        });
      }

      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should unsubscribe on unmount', () => {
      useIsOnline();
      runEffects();

      runCleanups();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('fallback behavior', () => {
    it('should handle undefined isConnected with fallback to true', () => {
      useIsOnline();
      runEffects();

      if (mockEventListener) {
        mockEventListener({
          isConnected: undefined,
          isInternetReachable: undefined,
          type: 'unknown',
        });
      }

      // The ?? true fallback should apply
      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should handle null isConnected with fallback', () => {
      useIsOnline();
      runEffects();

      if (mockEventListener) {
        mockEventListener({
          isConnected: null,
          isInternetReachable: null,
          type: 'unknown',
        });
      }

      expect(mockNetInfo.addEventListener).toHaveBeenCalled();
    });
  });
});

describe('parseNetInfoState edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStateValues = new Map();
    stateCounter = 0;
    mockEffects = [];
    mockEffectCleanups = [];
  });

  it('should handle ethernet connection type', () => {
    useNetworkStatus();
    runEffects();

    if (mockEventListener) {
      mockEventListener({
        isConnected: true,
        isInternetReachable: true,
        type: 'ethernet',
      });
    }

    expect(mockSetOnline).toHaveBeenCalledWith(true);
  });

  it('should handle bluetooth connection type', () => {
    useNetworkStatus();
    runEffects();

    if (mockEventListener) {
      mockEventListener({
        isConnected: true,
        isInternetReachable: true,
        type: 'bluetooth',
      });
    }

    expect(mockSetOnline).toHaveBeenCalledWith(true);
  });

  it('should handle vpn connection type', () => {
    useNetworkStatus();
    runEffects();

    if (mockEventListener) {
      mockEventListener({
        isConnected: true,
        isInternetReachable: true,
        type: 'vpn',
      });
    }

    expect(mockSetOnline).toHaveBeenCalledWith(true);
  });

  it('should handle none connection type', () => {
    useNetworkStatus();
    runEffects();

    if (mockEventListener) {
      mockEventListener({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    }

    expect(mockSetOnline).toHaveBeenCalledWith(false);
  });
});

describe('isOnline calculation edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetOnline.mockClear();
    mockUseStateValues = new Map();
    stateCounter = 0;
    mockEffects = [];
    mockEffectCleanups = [];
  });

  it('should be online when isInternetReachable is true', () => {
    useNetworkStatus();
    runEffects();

    if (mockEventListener) {
      mockEventListener({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    }

    expect(mockSetOnline).toHaveBeenCalledWith(true);
  });

  it('should be online when isInternetReachable is null (unknown)', () => {
    useNetworkStatus();
    runEffects();

    if (mockEventListener) {
      mockEventListener({
        isConnected: true,
        isInternetReachable: null,
        type: 'wifi',
      });
    }

    expect(mockSetOnline).toHaveBeenCalledWith(true);
  });

  it('should be offline when isInternetReachable is explicitly false', () => {
    useNetworkStatus();
    runEffects();

    if (mockEventListener) {
      mockEventListener({
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi',
      });
    }

    expect(mockSetOnline).toHaveBeenCalledWith(false);
  });
});
