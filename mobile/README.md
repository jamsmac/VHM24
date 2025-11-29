# VendHub Mobile App - MVP

React Native mobile application for field operators to manage tasks, equipment, and incidents.

## Features Implemented

### ✅ Core Features
- **Authentication** - Login with email/password, automatic token refresh
- **Task Management** - View, update, and complete tasks
- **Photo Upload** - Camera integration for task documentation
- **GPS Tracking** - Location tracking for field operators
- **Offline Mode** - Queue actions when offline, auto-sync when online
- **Push Notifications** - Real-time task assignments and updates
- **Equipment Map** - View equipment locations on interactive map
- **Profile Management** - View and update user profile

### 📱 Technology Stack

- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **State Management**: Zustand
- **API Client**: Axios with auto token refresh
- **Navigation**: React Navigation v6
- **Data Fetching**: TanStack Query (React Query)
- **Storage**: AsyncStorage + Expo SecureStore
- **Camera**: Expo Camera
- **Location**: Expo Location
- **Notifications**: Expo Notifications
- **Maps**: React Native Maps

## Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── TaskCard.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── LoadingSpinner.tsx
│   ├── screens/             # Screen components
│   │   ├── Auth/
│   │   │   └── LoginScreen.tsx
│   │   ├── Tasks/
│   │   │   ├── TaskListScreen.tsx
│   │   │   ├── TaskDetailScreen.tsx
│   │   │   └── TaskCameraScreen.tsx
│   │   ├── Equipment/
│   │   │   └── EquipmentMapScreen.tsx
│   │   └── Profile/
│   │       └── ProfileScreen.tsx
│   ├── navigation/          # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── services/            # API and external services
│   │   ├── api.ts          # Axios API client
│   │   ├── offline.ts      # Offline queue management
│   │   └── notifications.ts # Push notification setup
│   ├── store/              # State management
│   │   ├── auth.store.ts   # Authentication state
│   │   ├── tasks.store.ts  # Tasks state
│   │   └── offline.store.ts # Offline queue state
│   ├── types/              # TypeScript definitions
│   │   └── index.ts
│   ├── utils/              # Helper functions
│   │   ├── formatters.ts
│   │   └── validators.ts
│   └── hooks/              # Custom React hooks
│       ├── useLocation.ts
│       ├── useCamera.ts
│       └── useOfflineSync.ts
├── assets/                 # Images, fonts
├── app.json               # Expo configuration
├── package.json
└── tsconfig.json
```

## Installation

```bash
cd mobile

# Install dependencies
npm install

# Start development server
npx expo start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on web
npm run web
```

## Environment Configuration

Create `.env` file:

```env
API_URL=http://localhost:3000/api/v1
API_URL_PROD=https://your-domain.com/api/v1
```

## Key Implementation Details

### Authentication Flow

1. User enters credentials on LoginScreen
2. API client sends POST /auth/login
3. Tokens stored in SecureStore
4. User profile loaded and stored in auth store
5. Navigation redirects to MainTabs
6. All API requests include Bearer token
7. Auto token refresh on 401 responses

### Offline Mode

1. Network changes detected via NetInfo
2. Failed API requests queued in offline store
3. Queue persisted to AsyncStorage
4. Auto-sync triggered when connection restored
5. Photos stored locally, uploaded on sync

### Task Workflow

1. **View Tasks**: TaskListScreen shows assigned tasks
2. **Select Task**: Navigate to TaskDetailScreen
3. **Update Status**: Mark as in_progress/completed
4. **Add Photos**: TaskCameraScreen captures images
5. **Upload**: Photos uploaded with captions
6. **Sync**: GPS location attached to updates

### Push Notifications

1. Register device token on login
2. Backend sends to /users/:id/register-device
3. Notifications received via Expo Push service
4. Tap notification navigates to relevant screen
5. Badge counter updates on new tasks

## API Endpoints Used

### Auth
- POST /auth/login
- POST /auth/logout
- POST /auth/refresh
- GET /auth/profile

### Tasks
- GET /tasks (with filters)
- GET /tasks/:id
- PATCH /tasks/:id/status
- POST /tasks/:id/complete
- POST /tasks/:id/photos

### Equipment
- GET /equipment
- GET /equipment/:id

### Incidents
- GET /incidents
- POST /incidents
- PATCH /incidents/:id

### Sync
- POST /sync (offline data batch)

## Screens Overview

### LoginScreen
- Email and password inputs
- Form validation
- Loading states
- Error handling
- Auto-login with saved tokens

### TaskListScreen
- Pull-to-refresh
- Filter by status/priority
- Search functionality
- Infinite scroll/pagination
- Empty state handling
- Network status indicator

### TaskDetailScreen
- Task information display
- Status update buttons
- Photo gallery
- Equipment details link
- Complete task action
- Notes input

### TaskCameraScreen
- Camera preview
- Take photo
- Add caption
- Upload to task
- Local queue if offline

### EquipmentMapScreen
- Interactive map
- Equipment markers
- Cluster support
- Filter by status
- Navigate to equipment
- Show nearby tasks

### ProfileScreen
- User information
- Logout button
- App version
- Sync status
- Offline queue count

## Offline Support

### Queued Actions
- Task status updates
- Task completions
- Photo uploads
- Incident creations

### Local Storage Schema

```typescript
// AsyncStorage keys
offline_queue: OfflineTask[]
offline_photos: OfflinePhoto[]
last_sync: timestamp
```

### Sync Strategy
1. Check network connectivity
2. Fetch offline queue from storage
3. Process actions sequentially
4. Update local state on success
5. Remove from queue
6. Show sync progress to user

## Performance Optimizations

- Image compression before upload
- Lazy loading for lists
- Memoized components
- Debounced search
- Cached API responses
- Optimistic UI updates

## Security

- Tokens stored in SecureStore (encrypted)
- HTTPS only in production
- Auto logout on refresh failure
- Input validation
- XSS prevention

## Testing

```bash
# Run tests
npm test

# E2E tests (Detox)
npm run test:e2e
```

## Building for Production

### Android

```bash
# Build APK
eas build --platform android --profile production

# Or local build
npx expo run:android --variant release
```

### iOS

```bash
# Build IPA
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

## Deployment

### Using EAS (Expo Application Services)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure project
eas build:configure

# Build
eas build --platform all

# Submit
eas submit
```

## Monitoring

- Expo Analytics for crash reporting
- Sentry integration (optional)
- Custom error logging to backend

## Future Enhancements

- [ ] Biometric authentication
- [ ] Voice notes for tasks
- [ ] Barcode scanning for equipment
- [ ] Offline maps
- [ ] Multi-language support
- [ ] Dark mode
- [ ] In-app messaging
- [ ] Calendar view for tasks
- [ ] Export reports

## Known Limitations

- Requires iOS 13+ or Android 6+
- Camera requires physical device (not simulator)
- GPS requires location permissions
- Push notifications require Expo account

## Support

- Documentation: https://docs.vendhub.com/mobile
- Issues: https://github.com/your-org/vendhub/issues
- Email: support@vendhub.com

---

**Version**: 1.0.0
**Last Updated**: 2025-01-15
**Platform**: iOS & Android
**Minimum SDK**: iOS 13, Android 23
