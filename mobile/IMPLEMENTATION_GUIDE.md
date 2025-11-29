# VendHub Mobile - Implementation Guide

This guide provides detailed instructions for completing the mobile app implementation.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Completed Foundation](#completed-foundation)
3. [Implementation Tasks](#implementation-tasks)
4. [Screen Implementations](#screen-implementations)
5. [Service Implementations](#service-implementations)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Checklist](#deployment-checklist)

## Architecture Overview

### Technology Stack
- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **State**: Zustand (auth, offline queue)
- **Data Fetching**: TanStack Query (React Query)
- **Navigation**: React Navigation v7
- **Storage**: AsyncStorage + SecureStore
- **API**: Axios with interceptors

### Data Flow
```
User Input → Screen Component → TanStack Query → API Client → Backend
                                      ↓
                                 Cache/State
                                      ↓
                                Offline Queue (if offline)
```

### Offline Strategy
```
Network Down → Queue Action → Store to AsyncStorage
Network Up → Sync Queue → Process Items → Update Backend
```

## Completed Foundation

### ✅ Project Structure
- Expo project initialized with TypeScript
- Dependencies installed (navigation, query, storage, camera, location)
- Folder structure created (screens, services, store, types)

### ✅ Core Services
- **API Client** (`src/services/api.ts`)
  - Axios instance with interceptors
  - Auto token refresh on 401
  - Request/response logging
  - Token management (SecureStore)

### ✅ Type Definitions
- All TypeScript interfaces defined (`src/types/index.ts`)
- User, Task, Equipment, Incident types
- API response types
- Offline queue types

### ✅ State Management
- **Auth Store** (`src/store/auth.store.ts`)
  - Login/logout methods
  - User profile state
  - Auto-load user on app start

### ✅ Navigation
- **App Navigator** (`src/navigation/AppNavigator.tsx`)
  - Stack + Tab navigation
  - Auth flow (LoginScreen vs MainTabs)
  - Type-safe routing

### ✅ Screens (Placeholders Created)
- LoginScreen (fully implemented)
- TaskListScreen (placeholder)
- TaskDetailScreen (placeholder)
- TaskCameraScreen (placeholder)
- EquipmentMapScreen (placeholder)
- ProfileScreen (placeholder)

## Implementation Tasks

### Priority 1: Core Functionality (40 hours)

#### 1.1 TaskListScreen Implementation (8 hours)
**File**: `src/screens/Tasks/TaskListScreen.tsx`

```typescript
// Required features:
- Use TanStack Query to fetch tasks from API
- Implement pull-to-refresh
- Filter by status (pending, in_progress, completed)
- Search by title/description
- Infinite scroll/pagination
- Show loading states
- Handle empty state
- Network status indicator

// Example structure:
export default function TaskListScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiClient.getTasks(),
  });

  return (
    <FlatList
      data={data?.data}
      renderItem={({ item }) => <TaskCard task={item} />}
      onRefresh={refetch}
      refreshing={isLoading}
      ListEmptyComponent={<EmptyState />}
    />
  );
}
```

**Components to create**:
- `TaskCard.tsx` - Individual task card component
- `TaskFilters.tsx` - Status/priority filter buttons
- `EmptyState.tsx` - Empty list message

#### 1.2 TaskDetailScreen Implementation (10 hours)
**File**: `src/screens/Tasks/TaskDetailScreen.tsx`

```typescript
// Required features:
- Fetch task details by ID
- Display all task information
- Status update buttons (pending → in_progress → completed)
- Photo gallery with captions
- Equipment details link
- Complete task with notes
- Optimistic UI updates
- Error handling

// Status update example:
const updateStatus = useMutation({
  mutationFn: (status: TaskStatus) =>
    apiClient.updateTaskStatus(taskId, status),
  onSuccess: () => {
    queryClient.invalidateQueries(['tasks']);
    queryClient.invalidateQueries(['task', taskId]);
  },
});
```

#### 1.3 TaskCameraScreen Implementation (8 hours)
**File**: `src/screens/Tasks/TaskCameraScreen.tsx`

```typescript
// Required features:
- Request camera permissions
- Show camera preview
- Capture photo button
- Caption input
- Upload to task
- Local queue if offline
- Image compression (max 1MB)
- Success/error feedback

// Example with expo-camera:
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function TaskCameraScreen({ route }) {
  const { taskId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState(null);
  const cameraRef = useRef(null);

  const takePicture = async () => {
    const result = await cameraRef.current?.takePictureAsync({
      quality: 0.7,
      base64: false,
    });
    setPhoto(result.uri);
  };

  const uploadPhoto = async () => {
    await apiClient.uploadTaskPhoto(taskId, photo, caption);
  };
}
```

#### 1.4 ProfileScreen Implementation (4 hours)
**File**: `src/screens/Profile/ProfileScreen.tsx`

```typescript
// Required features:
- Display user information
- Logout button
- App version display
- Offline queue status
- Sync button
- Settings (future)

const { user, logout } = useAuthStore();
const { count } = useOfflineStore();

<View>
  <Text>{user?.name}</Text>
  <Text>{user?.email}</Text>
  <Button title="Выйти" onPress={logout} />
  <Text>Offline queue: {count} items</Text>
</View>
```

#### 1.5 EquipmentMapScreen Implementation (10 hours)
**File**: `src/screens/Equipment/EquipmentMapScreen.tsx`

```typescript
// Required features:
- Display equipment on map
- Custom markers by type/status
- Marker clustering
- Filter by equipment type
- Tap marker for details
- Navigate to equipment location
- Show user location
- Performance optimization

// Example with react-native-maps:
import MapView, { Marker } from 'react-native-maps';

export default function EquipmentMapScreen() {
  const { data: equipment } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => apiClient.getEquipment(),
  });

  return (
    <MapView
      initialRegion={{
        latitude: 41.2995,
        longitude: 69.2401,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
    >
      {equipment?.data.map(item => (
        <Marker
          key={item.id}
          coordinate={{
            latitude: item.lat,
            longitude: item.lng,
          }}
          title={item.name}
        />
      ))}
    </MapView>
  );
}
```

### Priority 2: Offline Support (20 hours)

#### 2.1 Offline Store (6 hours)
**File**: `src/store/offline.store.ts`

```typescript
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OfflineState {
  queue: OfflineTask[];
  photos: OfflinePhoto[];
  isSyncing: boolean;

  addTask: (task: OfflineTask) => void;
  addPhoto: (photo: OfflinePhoto) => void;
  removeTask: (id: string) => void;
  removePhoto: (id: string) => void;
  syncAll: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  queue: [],
  photos: [],
  isSyncing: false,

  addTask: async (task) => {
    const queue = [...get().queue, task];
    set({ queue });
    await AsyncStorage.setItem('offline_queue', JSON.stringify(queue));
  },

  syncAll: async () => {
    const { queue, photos } = get();
    set({ isSyncing: true });

    try {
      // Sync tasks
      for (const task of queue) {
        await apiClient.syncOfflineData(task);
        get().removeTask(task.tempId);
      }

      // Sync photos
      for (const photo of photos) {
        await apiClient.uploadTaskPhoto(
          photo.taskId,
          photo.uri,
          photo.caption
        );
        get().removePhoto(photo.tempId);
      }
    } finally {
      set({ isSyncing: false });
    }
  },
}));
```

#### 2.2 Network Detection Hook (4 hours)
**File**: `src/hooks/useNetworkStatus.ts`

```typescript
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected, isInternetReachable };
}
```

#### 2.3 Auto Sync Service (10 hours)
**File**: `src/services/offline.ts`

```typescript
// Implement background sync when network restored
// Listen to NetInfo events
// Trigger offline store sync
// Show sync progress
// Handle conflicts
```

### Priority 3: Push Notifications (15 hours)

#### 3.1 Notification Service (8 hours)
**File**: `src/services/notifications.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export async function registerForPushNotifications() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Не удалось получить разрешение на уведомления!');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;

    // Send token to backend
    await apiClient.registerDevice(token);
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

// Setup notification handlers
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

#### 3.2 Notification Navigation (4 hours)
Handle notification taps to navigate to relevant screens.

#### 3.3 Badge Management (3 hours)
Update app badge count based on unread notifications/tasks.

### Priority 4: Location Services (10 hours)

#### 4.1 Location Hook (5 hours)
**File**: `src/hooks/useLocation.ts`

```typescript
import * as Location from 'expo-location';

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission denied');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    setLocation(loc);
  };

  return { location, error, requestLocation };
}
```

#### 4.2 Background Location (5 hours)
Implement background location tracking for field operators.

### Priority 5: Polish & Testing (15 hours)

#### 5.1 Error Boundaries (3 hours)
Implement error boundaries for crash handling.

#### 5.2 Loading States (3 hours)
Consistent loading indicators across all screens.

#### 5.3 Unit Tests (5 hours)
Test critical functions (API client, stores, utils).

#### 5.4 Integration Tests (4 hours)
Test complete user flows (login, task completion, photo upload).

## Service Implementations

### Required npm Packages
Already installed:
- @react-navigation/native
- @react-navigation/native-stack
- @react-navigation/bottom-tabs
- @tanstack/react-query
- axios
- zustand
- expo-camera
- expo-location
- expo-notifications
- expo-secure-store
- react-native-maps

Still needed:
```bash
npm install @react-native-community/netinfo
```

## Testing Strategy

### Unit Tests (Jest)
```bash
npm install --save-dev jest @testing-library/react-native
```

Test files:
- `__tests__/services/api.test.ts`
- `__tests__/store/auth.store.test.ts`
- `__tests__/hooks/useNetworkStatus.test.ts`

### E2E Tests (Detox)
```bash
npm install --save-dev detox
```

Scenarios:
1. Login flow
2. View task list
3. Complete task
4. Upload photo
5. Offline mode

## Deployment Checklist

### Pre-Deployment
- [ ] All screens implemented
- [ ] All tests passing
- [ ] Error handling complete
- [ ] Offline mode tested
- [ ] Push notifications tested
- [ ] Performance optimized
- [ ] Security audit passed

### Build Configuration

**app.json updates**:
```json
{
  "expo": {
    "name": "VendHub",
    "slug": "vendhub-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.vendhub.mobile"
    },
    "android": {
      "package": "com.vendhub.mobile",
      "versionCode": 1,
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

### Build Commands

**Android**:
```bash
eas build --platform android --profile production
```

**iOS**:
```bash
eas build --platform ios --profile production
```

### Store Submission

**Google Play**:
1. Create app listing
2. Upload APK/AAB
3. Add screenshots
4. Set content rating
5. Submit for review

**App Store**:
1. Create app record
2. Upload IPA via Transporter
3. Add screenshots
4. Complete metadata
5. Submit for review

## Timeline Estimate

| Task | Hours |
|------|-------|
| TaskListScreen | 8 |
| TaskDetailScreen | 10 |
| TaskCameraScreen | 8 |
| ProfileScreen | 4 |
| EquipmentMapScreen | 10 |
| Offline Support | 20 |
| Push Notifications | 15 |
| Location Services | 10 |
| Polish & Testing | 15 |
| Build & Deploy | 10 |
| **Total** | **110 hours** |

## Next Steps

1. Start with TaskListScreen (highest user value)
2. Implement TaskDetailScreen
3. Add camera functionality
4. Implement offline support
5. Add push notifications
6. Polish and test
7. Deploy to stores

## Support

For questions or issues:
- Technical Lead: tech@vendhub.com
- Project Manager: pm@vendhub.com
- Documentation: https://docs.vendhub.com/mobile

---

**Last Updated**: 2025-01-15
**Status**: Foundation Complete, Implementation In Progress
