# Mobile App Documentation

## Overview

VendHub Mobile is a React Native (Expo) application that supports two modes:
- **Staff Mode**: For operators with task management and photo capture
- **Client Mode**: For consumers with QR scanning, ordering, and loyalty

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Expo | 54.x | React Native framework |
| React Native | 0.81.x | Mobile UI |
| React Navigation | 7.x | Navigation |
| TanStack Query | 5.x | Server state |
| Zustand | 5.x | Client state |
| Expo Camera | 17.x | Photo capture |
| Expo Location | 19.x | Geolocation |
| AsyncStorage | 2.x | Local storage |

## Project Structure

```
mobile/
├── src/
│   ├── components/           # Shared components
│   ├── hooks/                # Custom hooks
│   ├── navigation/           # Navigation config
│   │   ├── AppNavigator.tsx  # Root navigator
│   │   ├── MainNavigator.tsx # Staff navigator
│   │   └── ClientNavigator.tsx # Client navigator
│   ├── screens/              # Screen components
│   │   ├── Auth/             # Login screen
│   │   ├── Tasks/            # Staff task screens
│   │   ├── Equipment/        # Equipment map
│   │   ├── Profile/          # User profile
│   │   └── Client/           # Client screens
│   ├── services/             # API services
│   │   ├── api.ts            # Staff API
│   │   └── clientApi.ts      # Client API
│   ├── store/                # Zustand stores
│   │   ├── auth.store.ts     # Staff auth
│   │   └── client.store.ts   # Client state
│   └── types/                # TypeScript types
├── __tests__/                # Jest tests
├── assets/                   # Images, fonts
├── app.json                  # Expo config
└── package.json
```

## Dual Mode Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    VendHub Mobile                             │
├────────────────────────────┬─────────────────────────────────┤
│        Staff Mode          │         Client Mode             │
├────────────────────────────┼─────────────────────────────────┤
│ - JWT auth (email/password)│ - Telegram auth                 │
│ - Task list + details      │ - QR code scanning              │
│ - Photo capture            │ - Machine menu                  │
│ - Equipment map            │ - Order placement               │
│ - Profile management       │ - Order tracking                │
│                            │ - Loyalty points                │
│                            │ - Favorite machines             │
└────────────────────────────┴─────────────────────────────────┘
```

## Navigation

### AppNavigator

```typescript
// navigation/AppNavigator.tsx
export default function AppNavigator() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { appMode, loadAppMode } = useClientStore();

  // Client mode - no staff auth required
  if (appMode === 'client') {
    return (
      <NavigationContainer>
        <ClientNavigator />
      </NavigationContainer>
    );
  }

  // Staff mode - requires authentication
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
            <Stack.Screen name="TaskCamera" component={TaskCameraScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Staff Navigation

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `Login` | Staff login |
| Task List | `Tasks` | Assigned tasks |
| Task Detail | `TaskDetail` | Task details |
| Task Camera | `TaskCamera` | Photo capture |
| Equipment Map | `Map` | Equipment locations |
| Profile | `Profile` | User profile |

### Client Navigation

| Screen | Route | Description |
|--------|-------|-------------|
| QR Scan | `QrScan` | Scan machine QR |
| Menu | `ClientMenu` | Machine menu |
| Orders | `Orders` | Order history |
| Loyalty | `Loyalty` | Points balance |
| Locations | `Locations` | Find machines |
| Profile | `ClientProfile` | Client profile |

## Screens

### Staff Screens

#### TaskListScreen

```typescript
// screens/Tasks/TaskListScreen.tsx
function TaskListScreen() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiClient.getTasks(),
  });

  return (
    <FlatList
      data={tasks}
      renderItem={({ item }) => <TaskCard task={item} />}
      keyExtractor={(item) => item.id}
    />
  );
}
```

#### TaskDetailScreen

Shows task details with:
- Machine info
- Task type and priority
- Due date
- Description
- Photo upload buttons

#### TaskCameraScreen

Camera for capturing task photos:
- Before/after photos
- Geolocation tagging
- Upload to server

### Client Screens

#### QrScanScreen

Scans machine QR code to open menu:

```typescript
function QrScanScreen() {
  const navigation = useNavigation();

  const handleBarCodeScanned = ({ data }) => {
    // Extract machine_number from QR
    navigation.navigate('ClientMenu', { machineNumber: data });
  };

  return (
    <CameraView
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={handleBarCodeScanned}
    />
  );
}
```

#### ClientMenuScreen

Shows machine menu with:
- Product categories
- Product cards with prices
- Add to cart
- Place order

#### OrdersScreen

Order history with status tracking.

#### LoyaltyScreen

Loyalty program:
- Points balance
- Level (bronze/silver/gold/platinum)
- Rewards redemption

## State Management

### Auth Store (Staff)

```typescript
// store/auth.store.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    const response = await apiClient.login(credentials);
    const profile = await apiClient.getProfile();
    set({ user: profile.data, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await apiClient.logout();
    set({ user: null, isAuthenticated: false });
  },
}));
```

### Client Store

```typescript
// store/client.store.ts
interface ClientState {
  appMode: 'staff' | 'client';
  clientUser: ClientUser | null;
  cart: CartItem[];

  setAppMode: (mode: 'staff' | 'client') => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
}
```

## API Services

### Staff API

```typescript
// services/api.ts
const apiClient = {
  login: async (credentials: LoginCredentials) => {
    const response = await axios.post('/auth/login', credentials);
    await AsyncStorage.setItem('accessToken', response.data.accessToken);
    return response.data;
  },

  getTasks: async () => {
    const response = await axios.get('/tasks/my');
    return response.data;
  },

  getTaskById: async (id: string) => {
    const response = await axios.get(`/tasks/${id}`);
    return response.data;
  },

  uploadTaskPhoto: async (taskId: string, type: string, photo: FormData) => {
    const response = await axios.post(
      `/tasks/${taskId}/photos/${type}`,
      photo,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
};
```

### Client API

```typescript
// services/clientApi.ts
const clientApi = {
  getMachineMenu: async (machineNumber: string) => {
    const response = await axios.get(`/client/menu/${machineNumber}`);
    return response.data;
  },

  createOrder: async (order: CreateOrderDto) => {
    const response = await axios.post('/client/orders', order);
    return response.data;
  },

  getOrders: async () => {
    const response = await axios.get('/client/orders');
    return response.data;
  },

  getLoyaltyBalance: async () => {
    const response = await axios.get('/client/loyalty');
    return response.data;
  },
};
```

## Photo Capture

### Task Photo Flow

```
1. Open TaskCameraScreen
2. Capture photo with expo-camera
3. Get geolocation with expo-location
4. Create FormData with photo + metadata
5. Upload to /tasks/{id}/photos/{type}
6. Server validates and stores in MinIO/R2
```

### Camera Component

```typescript
function TaskCameraScreen({ route }) {
  const { taskId } = route.params;
  const cameraRef = useRef<CameraView>(null);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    Location.getCurrentPositionAsync().then(setLocation);
  }, []);

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync();
    const formData = new FormData();
    formData.append('photo', {
      uri: photo.uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    });
    formData.append('latitude', location.coords.latitude);
    formData.append('longitude', location.coords.longitude);

    await apiClient.uploadTaskPhoto(taskId, 'before', formData);
  };
}
```

## Offline Support

### AsyncStorage

```typescript
// Persist auth tokens
await AsyncStorage.setItem('accessToken', token);
await AsyncStorage.setItem('refreshToken', refreshToken);

// Persist user data
await AsyncStorage.setItem('userData', JSON.stringify(user));

// Persist app mode
await AsyncStorage.setItem('appMode', 'client');
```

### Network State

```typescript
import NetInfo from '@react-native-community/netinfo';

const unsubscribe = NetInfo.addEventListener(state => {
  if (state.isConnected) {
    syncPendingData();
  }
});
```

## Development

```bash
# Install dependencies
npm install

# Start Expo
npm run start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run tests
npm run test
npm run test:watch
npm run test:coverage

# Type check
npm run type-check
```

## Environment Variables

Set in `app.json` or `.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_CLIENT_API_URL=http://localhost:3000/api/client
```

## Testing

Using Jest with React Native Testing Library:

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import TaskListScreen from '../TaskListScreen';

test('displays tasks', async () => {
  const { findByText } = render(<TaskListScreen />);
  expect(await findByText('Пополнение')).toBeTruthy();
});
```

## Related Documentation

- [Tasks Module](../tasks/README.md) - Task management
- [Client Module](../client/README.md) - Client platform
- [Files Module](../files/README.md) - Photo uploads
- [Auth Module](../auth/README.md) - Authentication
